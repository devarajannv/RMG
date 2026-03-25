# Enterprise Request Flow System

## Overview

The Request Flow System is a comprehensive workflow management solution for RMGaaS that handles all actionable tasks in the product. It provides multi-level approval workflows, SLA tracking, rollback support, and full audit trails.

## Architecture

### Database Schema

The system introduces 19 new Prisma models and 16 enums:

#### Core Models

| Model | Purpose |
|-------|---------|
| `Request` | Main request entity with workflow state |
| `RequestType` | Template defining request behavior |
| `TenantRequestTypeConfig` | Per-tenant overrides for request types |
| `RequestSequence` | Auto-incrementing request numbers |
| `RequestTemplate` | Saved request drafts |

#### Approval Models

| Model | Purpose |
|-------|---------|
| `ApprovalChain` | Named workflow with ordered steps |
| `ApprovalStep` | Individual approval level |
| `ApprovalRule` | Dynamic approver resolution rules |
| `RequestApproval` | Actual approval records per request |
| `Delegation` | Approval delegation configuration |

#### Supporting Models

| Model | Purpose |
|-------|---------|
| `RequestComment` | Threaded comments on requests |
| `RequestHistory` | Full audit trail |
| `RequestAttachment` | File attachments with virus scanning |
| `RequestWatcher` | Subscription to request updates |
| `RequestAffectedResource` | Resources impacted by request |
| `RequestLock` | Optimistic concurrency control |

#### SLA & Notification Models

| Model | Purpose |
|-------|---------|
| `BusinessHoursConfig` | Working hours per tenant |
| `Holiday` | Holiday calendar |
| `SlaBreachEvent` | SLA violation records |
| `SlaPriorityMatrix` | Priority-based SLA multipliers |
| `Notification` | In-app notifications |
| `NotificationPreference` | User notification settings |
| `Webhook` | External system integration |
| `WebhookLog` | Webhook delivery logs |

#### Rollback Models

| Model | Purpose |
|-------|---------|
| `RollbackStep` | Granular rollback operations |

### Key Enums

```typescript
// Request lifecycle
enum RequestStatus {
  DRAFT, SUBMITTED, PENDING_APPROVAL, PENDING_INFO,
  APPROVED, REJECTED, CANCELLED, IN_PROGRESS,
  COMPLETED, FAILED, ROLLED_BACK
}

// Request categories
enum RequestCategory {
  RESOURCE, PROJECT, CONTRACT, HR, FINANCE, ADMIN, OTHER
}

// Priority levels
enum Priority {
  LOW, MEDIUM, HIGH, CRITICAL
}

// Approval modes
enum ApprovalMode {
  ANY, ALL, MAJORITY, FIRST_RESPONSE
}
```

## Request Types (15 Seeded)

### Resource Category
| Code | Name | SLA (Response/Resolution) |
|------|------|---------------------------|
| `RESOURCE_ALLOCATION` | Resource Allocation | 24h / 72h |
| `RESOURCE_RELEASE` | Resource Release | 24h / 48h |
| `RESOURCE_EXTENSION` | Allocation Extension | 24h / 48h |
| `RESOURCE_TRANSFER` | Resource Transfer | 48h / 120h |

### HR Category
| Code | Name | SLA (Response/Resolution) |
|------|------|---------------------------|
| `RESOURCE_ONBOARDING` | Resource Onboarding | 24h / 168h |
| `RESOURCE_OFFBOARDING` | Resource Offboarding | 24h / 72h |
| `LEAVE_REQUEST` | Leave Request | 48h / 72h |
| `SKILL_UPDATE` | Skill Update | 72h / 120h |

### Project Category
| Code | Name | SLA (Response/Resolution) |
|------|------|---------------------------|
| `PROJECT_CREATION` | Project Creation | 48h / 120h |
| `PROJECT_CLOSURE` | Project Closure | 48h / 168h |

### Contract Category
| Code | Name | SLA (Response/Resolution) |
|------|------|---------------------------|
| `CONTRACT_CREATION` | Contract Creation | 24h / 168h |
| `CONTRACT_AMENDMENT` | Contract Amendment | 24h / 120h |

### Finance Category
| Code | Name | SLA (Response/Resolution) |
|------|------|---------------------------|
| `RATE_CHANGE` | Rate Change | 48h / 120h |
| `TIMESHEET_APPROVAL` | Timesheet Approval | 48h / 72h |

### Admin Category
| Code | Name | SLA (Response/Resolution) |
|------|------|---------------------------|
| `ACCESS_REQUEST` | Access Request | 24h / 48h |

## API Endpoints

### Request CRUD
```
POST   /api/v1/requests              - Create request (draft by default, optional immediate submit)
GET    /api/v1/requests              - List requests with filters
GET    /api/v1/requests/:id          - Get single request
PUT    /api/v1/requests/:id          - Update request
DELETE /api/v1/requests/:id          - Soft delete request
```

### Workflow Actions
```
POST   /api/v1/requests/:id/submit   - Submit for approval
POST   /api/v1/requests/:id/approve  - Approve request
POST   /api/v1/requests/:id/reject   - Reject request
POST   /api/v1/requests/:id/return   - Return for revision
POST   /api/v1/requests/:id/cancel   - Cancel request
```

### Comments & Attachments
```
POST   /api/v1/requests/:id/comments - Add comment
GET    /api/v1/requests/:id/comments - Get comments
GET    /api/v1/requests/:id/history  - Get audit history
```

### Dashboard & Stats
```
GET    /api/v1/requests/dashboard        - Dashboard statistics
GET    /api/v1/requests/pending-approvals - My pending approvals
GET    /api/v1/requests/my-requests      - My submitted requests
```

### Request Types
```
GET    /api/v1/request-types        - List available types
GET    /api/v1/request-types/:code  - Get type details
```

### Approval Chains
```
GET    /api/v1/approval-chains          - List approval chains
POST   /api/v1/approval-chains          - Create chain with steps
GET    /api/v1/approval-chains/:id      - Get chain details
PUT    /api/v1/approval-chains/:id      - Update chain
DELETE /api/v1/approval-chains/:id      - Delete chain (soft)

POST   /api/v1/approval-chains/:id/steps           - Add step
PUT    /api/v1/approval-chains/:id/steps/reorder   - Reorder steps
PUT    /api/v1/approval-chains/:chainId/steps/:stepId - Update step
DELETE /api/v1/approval-chains/:chainId/steps/:stepId - Delete step

PUT    /api/v1/approval-chains/:id/request-types   - Link request types
```

### Delegations
```
GET    /api/v1/delegations       - List my delegations
POST   /api/v1/delegations       - Create delegation
DELETE /api/v1/delegations/:id   - Cancel delegation
```

### SLA Management
```
GET    /api/v1/sla/business-hours            - Get business hours config
PUT    /api/v1/sla/business-hours            - Update business hours
GET    /api/v1/sla/holidays                  - List holidays
POST   /api/v1/sla/holidays                  - Add holiday
DELETE /api/v1/sla/holidays/:id              - Remove holiday
GET    /api/v1/sla/requests/:id/calculate    - Calculate SLA for request
POST   /api/v1/sla/requests/:id/pause        - Pause SLA
POST   /api/v1/sla/requests/:id/resume       - Resume SLA
GET    /api/v1/sla/reports/compliance        - SLA compliance report
GET    /api/v1/sla/reports/breaches          - SLA breach summary
POST   /api/v1/sla/check-breaches            - Trigger breach check
```

### Notifications
```
GET    /api/v1/notifications                 - Get user notifications
GET    /api/v1/notifications/unread-count    - Get unread count
GET    /api/v1/notifications/stats           - Get notification stats
GET    /api/v1/notifications/:id             - Get notification by ID
PUT    /api/v1/notifications/:id/read        - Mark as read
PUT    /api/v1/notifications/mark-read       - Mark multiple as read
PUT    /api/v1/notifications/mark-all-read   - Mark all as read
DELETE /api/v1/notifications/:id             - Delete notification
GET    /api/v1/notifications/preferences     - Get preferences
PUT    /api/v1/notifications/preferences     - Update preference
PUT    /api/v1/notifications/preferences/bulk - Bulk update preferences
POST   /api/v1/notifications/preferences/reset - Reset to defaults
POST   /api/v1/notifications/cleanup         - Cleanup old notifications
POST   /api/v1/notifications/test            - Create test notification
```

### Create Request Modes

- Default create saves a request in `DRAFT`
- `submitForApproval: true` on create tells the backend to:
  1. create the draft
  2. run the normal submit flow
- If draft creation succeeds but submission fails, the draft is retained and returned so the user can fix and resubmit

## Request Lifecycle

```
┌─────────┐     ┌───────────┐     ┌──────────────────┐
│  DRAFT  │────▶│ SUBMITTED │────▶│ PENDING_APPROVAL │
└─────────┘     └───────────┘     └──────────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
             ┌──────────┐          ┌────────────┐          ┌──────────┐
             │ APPROVED │          │ PENDING_INFO│          │ REJECTED │
             └──────────┘          └────────────┘          └──────────┘
                    │                      │
                    ▼                      │
             ┌─────────────┐               │
             │ IN_PROGRESS │◀──────────────┘
             └─────────────┘
                    │
         ┌─────────┼─────────┐
         ▼         ▼         ▼
    ┌──────────┐ ┌──────┐ ┌────────────┐
    │COMPLETED │ │FAILED│ │ROLLED_BACK │
    └──────────┘ └──────┘ └────────────┘
```

## SLA Management

### Business Hours
- Configurable working hours per tenant
- Holiday calendar support
- SLA pausing during non-business hours

### Priority Matrix
| Priority | Response Multiplier | Resolution Multiplier |
|----------|--------------------|-----------------------|
| LOW      | 1.5x               | 1.5x                  |
| MEDIUM   | 1.0x               | 1.0x                  |
| HIGH     | 0.5x               | 0.5x                  |
| CRITICAL | 0.25x              | 0.25x                 |

### Escalation
- Automatic escalation on SLA breach
- Configurable escalation levels
- Notification to escalation contacts

## Rollback Support

### Rollback Window
- Default: 90 days from completion
- Configurable per request type

### Rollback Process
1. User initiates rollback on completed request
2. System validates rollback eligibility
3. Creates reversal request linked to original
4. Executes rollback steps in reverse order
5. Records rollback status and audit trail

### Rollback Data Captured
```json
{
  "allocation": {
    "previousState": {...},
    "newState": {...}
  },
  "resource": {
    "previousAllocation": {...}
  }
}
```

## Approval Chain Configuration

### Chain Structure
```yaml
chain:
  name: "Resource Allocation Approval"
  scope: GLOBAL  # or PRACTICE, PROJECT, CLIENT
  steps:
    - order: 1
      name: "Project Manager"
      approverType: PROJECT_MANAGER
      approvalMode: ANY
      slaHours: 24
    - order: 2
      name: "Practice Lead"
      approverType: PRACTICE_HEAD
      approvalMode: ANY
      slaHours: 24
    - order: 3
      name: "Finance"
      approverType: ROLE
      roleId: "finance-approver-role-id"
      approvalMode: ANY
      slaHours: 48
```

### Approver Resolution
| Type | Resolution |
|------|------------|
| `MANAGER` | Resource's direct manager |
| `PROJECT_MANAGER` | Project's manager |
| `PRACTICE_HEAD` | Practice lead |
| `ROLE` | Users with specific role |
| `USER` | Specific user IDs |
| `DYNAMIC` | Custom rule-based resolution |

## File Structure

```
apps/api/
├── prisma/
│   ├── schema.prisma              # Updated with 19 new models
│   ├── seed-request-types.ts      # Request types seeder
│   └── migrations/
│       └── 20251218080232_add_request_flow_system/
│
└── src/modules/requests/
    ├── index.ts                   # Module exports
    ├── request.service.ts         # Request business logic (~1,370 lines)
    ├── request.controller.ts      # Request HTTP handlers (~480 lines)
    ├── request.routes.ts          # Request routes
    ├── request-types.routes.ts    # Request type routes
    ├── approval-chain.service.ts  # Approval chain logic (~1,085 lines)
    ├── approval-chain.controller.ts # Approval chain handlers (~375 lines)
    ├── approval-chain.routes.ts   # Approval chain routes
    ├── delegation.routes.ts       # Delegation routes
    ├── sla.service.ts             # SLA calculation (~870 lines)
    ├── sla.controller.ts          # SLA HTTP handlers (~260 lines)
    ├── sla.routes.ts              # SLA routes
    ├── notification.service.ts    # Notification service (~650 lines)
    ├── notification.controller.ts # Notification handlers (~250 lines)
    └── notification.routes.ts     # Notification routes
```

## Usage Examples

### Creating a Request
```bash
curl -X POST /api/v1/requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "typeCode": "RESOURCE_ALLOCATION",
    "title": "Allocate John to Project X",
    "requestData": {
      "resourceId": "uuid",
      "projectId": "uuid",
      "role": "Senior Developer",
      "percentage": 100,
      "startDate": "2025-01-01",
      "endDate": "2025-06-30",
      "isBillable": true
    },
    "priority": "HIGH"
  }'
```

### Submitting for Approval
```bash
curl -X POST /api/v1/requests/{id}/submit \
  -H "Authorization: Bearer $TOKEN"
```

### Approving a Request
```bash
curl -X POST /api/v1/requests/{id}/approve \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "comments": "Approved - resource availability confirmed"
  }'
```

### Adding a Holiday
```bash
curl -X POST /api/v1/sla/holidays \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-01-26",
    "name": "Republic Day",
    "type": "NATIONAL",
    "isRecurring": true
  }'
```

### Getting SLA Compliance Report
```bash
curl -X GET "/api/v1/sla/reports/compliance?startDate=2025-01-01&endDate=2025-12-31" \
  -H "Authorization: Bearer $TOKEN"
```

### Getting Notifications
```bash
curl -X GET /api/v1/notifications?isRead=false \
  -H "Authorization: Bearer $TOKEN"
```

### Updating Notification Preferences
```bash
curl -X PUT /api/v1/notifications/preferences \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "SLA_BREACHED",
    "channel": "EMAIL",
    "enabled": true
  }'
```

## Security

### Access Control
- All endpoints require authentication
- Requests filtered by tenant
- Only requester/approvers can view request details
- Internal comments visible only to approvers

### Audit Trail
Every action is recorded in `RequestHistory`:
- Action type (CREATE, UPDATE, SUBMIT, APPROVE, etc.)
- User who performed action
- Timestamp
- IP address and user agent
- Before/after state

## Integration Points

### Webhooks
- `REQUEST_CREATED`
- `REQUEST_SUBMITTED`
- `REQUEST_APPROVED`
- `REQUEST_REJECTED`
- `REQUEST_COMPLETED`
- `SLA_BREACHED`

### Notifications
- In-app notifications
- Email notifications (configurable)
- **Real-time WebSocket delivery** (NEW)
- Per-user preferences
- Notification types:
  - `REQUEST_ASSIGNED` - Request assigned to user
  - `REQUEST_APPROVED` - Request approved
  - `REQUEST_REJECTED` - Request rejected
  - `REQUEST_RETURNED` - Request returned for revision
  - `REQUEST_COMMENTED` - New comment on request
  - `REQUEST_ESCALATED` - Request escalated
  - `REQUEST_COMPLETED` - Request completed
  - `SLA_WARNING` - SLA deadline approaching
  - `SLA_BREACHED` - SLA breached
  - `DELEGATION_CREATED` - Delegation assigned
  - `DELEGATION_EXPIRING` - Delegation expiring soon
  - `DELEGATION_REVOKED` - Delegation revoked
  - `REMINDER` - Custom reminders
  - `SYSTEM` - System notifications

## Future Enhancements

### Phase 2 (Completed ✅)
- [x] Approval Chain Service - Full CRUD, dynamic approver resolution
- [x] Approval Step Management - Add, update, reorder, delete steps
- [x] Delegation Support - Create, cancel, list delegations
- [x] TypeScript fixes - Schema alignment, proper types
- [x] SLA Service - Business hours calculation, holiday calendar, breach detection
- [x] Notification Service - In-app notifications, preferences, email support
- [x] Frontend Components - RequestsPage, RequestDetailPage, MyApprovals
- [x] WebSocket Real-time - Live notifications via WebSocket

### Phase 3 (Planned)
- [ ] Visual Workflow Builder - Drag-and-drop canvas
- [ ] Parallel approval steps
- [ ] Conditional routing
- [ ] External approver support (email-based)
- [ ] Mobile notifications
- [ ] Analytics dashboard

## Migration Notes

### From Previous System
If migrating from an existing approval system:
1. Export existing approval chains
2. Map to new ApprovalChain/ApprovalStep models
3. Migrate historical requests to new schema
4. Update integrations to use new API

### Database Migration
```bash
cd apps/api
npx prisma migrate deploy
npx tsx prisma/seed-request-types.ts
```

## Troubleshooting

### Common Issues

**Request stuck in PENDING_APPROVAL**
- Check if approval chain is configured
- Verify approvers are resolved correctly
- Check for delegation rules

**SLA not calculating correctly**
- Verify BusinessHoursConfig exists for tenant
- Check holiday calendar
- Verify timezone settings

**Rollback not available**
- Check rollback deadline hasn't passed
- Verify request type allows rollback
- Check rollback_status is not already set

---

*Last Updated: December 18, 2025*
*Version: 2.0.0*
