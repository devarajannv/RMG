/**
 * Email Service Tests
 * 
 * Testing template rendering and email queueing logic.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  emailService,
  renderTemplate,
  sendRequestSubmittedNotification,
  sendRequestApprovedNotification,
  sendRequestRejectedNotification,
  sendSLAEscalationNotification,
} from './email.service';

// Mock Prisma
vi.mock('../../lib/prisma', () => ({
  default: {
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  },
}));

describe('Email Service', () => {
  describe('renderTemplate', () => {
    it('should substitute simple variables', () => {
      const template = 'Hello {{name}}, your order {{orderId}} is ready.';
      const data = { name: 'John', orderId: '12345' };
      
      const result = renderTemplate(template, data);
      
      expect(result).toBe('Hello John, your order 12345 is ready.');
    });

    it('should handle missing variables gracefully', () => {
      const template = 'Hello {{name}}, your email is {{email}}.';
      const data = { name: 'John' };
      
      const result = renderTemplate(template, data);
      
      expect(result).toBe('Hello John, your email is .');
    });

    it('should render conditional blocks when condition is true', () => {
      const template = '{{#if premium}}Welcome Premium Member!{{/if}} Hello {{name}}.';
      const data = { name: 'John', premium: true };
      
      const result = renderTemplate(template, data);
      
      expect(result).toBe('Welcome Premium Member! Hello John.');
    });

    it('should skip conditional blocks when condition is false', () => {
      const template = '{{#if premium}}Welcome Premium Member!{{/if}} Hello {{name}}.';
      const data = { name: 'John', premium: false };
      
      const result = renderTemplate(template, data);
      
      expect(result).toBe(' Hello John.');
    });

    it('should render conditional blocks for non-empty arrays', () => {
      const template = '{{#if items}}You have items!{{/if}}';
      const data = { items: ['a', 'b'] };
      
      const result = renderTemplate(template, data);
      
      expect(result).toBe('You have items!');
    });

    it('should skip conditional blocks for empty arrays', () => {
      const template = '{{#if items}}You have items!{{/if}}';
      const data = { items: [] };
      
      const result = renderTemplate(template, data);
      
      expect(result).toBe('');
    });

    it('should render each loops with objects', () => {
      const template = '{{#each items}}- {{name}}: {{price}}\n{{/each}}';
      const data = {
        items: [
          { name: 'Apple', price: 1.50 },
          { name: 'Banana', price: 0.75 },
        ],
      };
      
      const result = renderTemplate(template, data);
      
      expect(result).toBe('- Apple: 1.5\n- Banana: 0.75\n');
    });

    it('should handle nested templates', () => {
      const template = `
Hello {{userName}},

{{#if hasOrders}}
Your orders:
{{#each orders}}
- Order {{orderId}}: {{status}}
{{/each}}
{{/if}}

Thanks!
      `.trim();
      
      const data = {
        userName: 'John',
        hasOrders: true,
        orders: [
          { orderId: '001', status: 'Shipped' },
          { orderId: '002', status: 'Processing' },
        ],
      };
      
      const result = renderTemplate(template, data);
      
      expect(result).toContain('Hello John');
      expect(result).toContain('Your orders:');
      expect(result).toContain('Order 001: Shipped');
      expect(result).toContain('Order 002: Processing');
    });

    it('should handle complex HTML templates', () => {
      const template = [
        '<h1>Welcome {{name}}!</h1>',
        '{{#if isVip}}<span class="badge">VIP</span>{{/if}}',
        '<ul>',
        '{{#each items}}',
        '<li>{{title}} - ${{price}}</li>',
        '{{/each}}',
        '</ul>',
      ].join('\n');
      
      const data = {
        name: 'Jane',
        isVip: true,
        items: [
          { title: 'Widget', price: 29.99 },
          { title: 'Gadget', price: 49.99 },
        ],
      };
      
      const result = renderTemplate(template, data);
      
      expect(result).toContain('<h1>Welcome Jane!</h1>');
      expect(result).toContain('<span class="badge">VIP</span>');
      expect(result).toContain('<li>Widget - $29.99</li>');
      expect(result).toContain('<li>Gadget - $49.99</li>');
    });

    it('should handle @index in loops', () => {
      const template = '{{#each items}}{{@index}}: {{value}}\n{{/each}}';
      const data = {
        items: [
          { value: 'first' },
          { value: 'second' },
          { value: 'third' },
        ],
      };
      
      const result = renderTemplate(template, data);
      
      expect(result).toBe('0: first\n1: second\n2: third\n');
    });
  });

  describe('emailService.send', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should send email successfully with MOCK provider', async () => {
      const result = await emailService.send({
        tenantId: 'tenant-123',
        to: { email: 'test@example.com', name: 'Test User' },
        subject: 'Test Email',
        html: '<p>Hello!</p>',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('MOCK');
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^mock-/);
    });

    it('should process template when specified', async () => {
      const result = await emailService.sendTemplate(
        'tenant-123',
        'request-approved',
        { email: 'test@example.com' },
        {
          requesterName: 'John Doe',
          requestNumber: 'REQ-001',
          requestType: 'Resource Allocation',
          approverName: 'Jane Manager',
          approvedDate: '2025-01-15',
          requestUrl: 'http://example.com/requests/123',
          tenantName: 'Acme Corp',
        }
      );

      expect(result.success).toBe(true);
    });

    it('should handle array of recipients', async () => {
      const result = await emailService.send({
        tenantId: 'tenant-123',
        to: [
          { email: 'test1@example.com', name: 'User 1' },
          { email: 'test2@example.com', name: 'User 2' },
        ],
        subject: 'Test Email',
        text: 'Hello everyone!',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('emailService.queue', () => {
    it('should queue email and return queue ID', async () => {
      const queueId = await emailService.queue({
        tenantId: 'tenant-123',
        to: { email: 'test@example.com' },
        subject: 'Queued Email',
        text: 'This is queued',
      });

      expect(queueId).toBeDefined();
      expect(typeof queueId).toBe('string');
    });

    it('should respect delay option', async () => {
      const queueId = await emailService.queue(
        {
          tenantId: 'tenant-123',
          to: { email: 'test@example.com' },
          subject: 'Delayed Email',
          text: 'This is delayed',
        },
        { delay: 60000 } // 1 minute delay
      );

      expect(queueId).toBeDefined();
    });
  });

  describe('emailService.getQueueStats', () => {
    it('should return queue statistics', () => {
      const stats = emailService.getQueueStats();

      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('pending');
      expect(stats).toHaveProperty('processing');
      expect(stats).toHaveProperty('sent');
      expect(stats).toHaveProperty('failed');
      expect(stats).toHaveProperty('retry');
    });
  });

  describe('Convenience Functions', () => {
    describe('sendRequestSubmittedNotification', () => {
      it('should send request submitted email', async () => {
        const result = await sendRequestSubmittedNotification('tenant-123', {
          approverEmail: 'approver@example.com',
          approverName: 'Jane Approver',
          requestNumber: 'REQ-001',
          requestType: 'Resource Allocation',
          requesterName: 'John Requester',
          description: 'Need a developer for Project X',
          priority: 'HIGH',
          dueDate: '2025-01-20',
          actionUrl: 'http://example.com/approve/123',
          tenantName: 'Acme Corp',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('sendRequestApprovedNotification', () => {
      it('should send request approved email', async () => {
        const result = await sendRequestApprovedNotification('tenant-123', {
          requesterEmail: 'requester@example.com',
          requesterName: 'John Requester',
          requestNumber: 'REQ-001',
          requestType: 'Resource Allocation',
          approverName: 'Jane Approver',
          approvedDate: '2025-01-15',
          comments: 'Looks good, approved!',
          requestUrl: 'http://example.com/requests/123',
          tenantName: 'Acme Corp',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('sendRequestRejectedNotification', () => {
      it('should send request rejected email', async () => {
        const result = await sendRequestRejectedNotification('tenant-123', {
          requesterEmail: 'requester@example.com',
          requesterName: 'John Requester',
          requestNumber: 'REQ-001',
          requestType: 'Resource Allocation',
          rejectorName: 'Jane Approver',
          rejectedDate: '2025-01-15',
          rejectionReason: 'Budget constraints',
          canResubmit: true,
          requestUrl: 'http://example.com/requests/123',
          tenantName: 'Acme Corp',
        });

        expect(result.success).toBe(true);
      });
    });

    describe('sendSLAEscalationNotification', () => {
      it('should send SLA escalation email', async () => {
        const result = await sendSLAEscalationNotification('tenant-123', {
          escalateToEmail: 'manager@example.com',
          escalateToName: 'Senior Manager',
          requestNumber: 'REQ-001',
          requestType: 'Resource Allocation',
          requesterName: 'John Requester',
          submittedDate: '2025-01-10',
          currentStep: 'Manager Approval',
          assignedTo: 'Jane Approver',
          slaDue: '2025-01-12 17:00',
          overdueBy: '3 hours',
          escalationLevel: 'Level 1',
          actionUrl: 'http://example.com/requests/123',
          tenantName: 'Acme Corp',
        });

        expect(result.success).toBe(true);
      });
    });
  });
});

describe('Email Template Validation', () => {
  describe('Default Templates', () => {
    it('request-submitted template should have all required variables', () => {
      const template = emailService.getTemplate('request-submitted');
      
      expect(template).toBeDefined();
      expect(template?.variables).toContain('approverName');
      expect(template?.variables).toContain('requestNumber');
      expect(template?.variables).toContain('requesterName');
      expect(template?.variables).toContain('requestType');
    });

    it('request-approved template should have all required variables', () => {
      const template = emailService.getTemplate('request-approved');
      
      expect(template).toBeDefined();
      expect(template?.variables).toContain('requesterName');
      expect(template?.variables).toContain('requestNumber');
      expect(template?.variables).toContain('approverName');
    });

    it('request-rejected template should have all required variables', () => {
      const template = emailService.getTemplate('request-rejected');
      
      expect(template).toBeDefined();
      expect(template?.variables).toContain('requesterName');
      expect(template?.variables).toContain('rejectionReason');
    });

    it('sla-escalation template should have all required variables', () => {
      const template = emailService.getTemplate('sla-escalation');
      
      expect(template).toBeDefined();
      expect(template?.variables).toContain('escalateToName');
      expect(template?.variables).toContain('overdueBy');
      expect(template?.variables).toContain('escalationLevel');
    });

    it('resource-exit-notification template should have all required variables', () => {
      const template = emailService.getTemplate('resource-exit-notification');
      
      expect(template).toBeDefined();
      expect(template?.variables).toContain('resourceName');
      expect(template?.variables).toContain('exitDate');
      expect(template?.variables).toContain('allocations');
    });
  });

  describe('Template Registration', () => {
    it('should allow registering custom templates', () => {
      const customTemplate = {
        id: 'custom-welcome',
        name: 'Custom Welcome',
        subject: 'Welcome to {{company}}!',
        textBody: 'Hello {{name}}, welcome!',
        htmlBody: '<p>Hello {{name}}, welcome!</p>',
        variables: ['name', 'company'],
        category: 'onboarding',
        isActive: true,
      };

      emailService.registerTemplate(customTemplate);
      
      const retrieved = emailService.getTemplate('custom-welcome');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Custom Welcome');
    });
  });
});
