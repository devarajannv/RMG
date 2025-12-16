import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RMGaaS API',
      version: '1.0.0',
      description: `
# Resource Management & Governance as a Service API

Enterprise-grade platform for managing professional services workforce allocation, utilization, and governance.

## Authentication

All endpoints (except /auth/login) require a Bearer token:

\`\`\`
Authorization: Bearer <access_token>
\`\`\`

## Rate Limiting

- 100 requests per minute per user
- Rate limit headers included in responses

## Pagination

List endpoints support pagination with:
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 20, max: 100)

## Error Responses

All errors follow this format:
\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
\`\`\`
      `,
      contact: {
        name: 'NewVision Software',
        url: 'https://newvision.in',
        email: 'support@newvision.in',
      },
      license: {
        name: 'Proprietary',
        url: 'https://newvision.in/license',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.rmgaas.newvision.in/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            code: { type: 'string' },
            details: { type: 'object' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        Resource: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            employeeId: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string', format: 'email' },
            designation: { type: 'string' },
            band: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'ONLEAVE', 'TERMINATED'] },
            employmentType: { type: 'string', enum: ['FTE', 'CONTRACTOR', 'INTERN'] },
            capacity: { type: 'integer', default: 100 },
            practiceId: { type: 'string', format: 'uuid' },
            locationId: { type: 'string', format: 'uuid' },
          },
        },
        Project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['BILLABLE', 'NON_BILLABLE', 'INTERNAL', 'INVESTMENT'] },
            status: { type: 'string', enum: ['PIPELINE', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED'] },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            budgetHours: { type: 'integer' },
            clientId: { type: 'string', format: 'uuid' },
          },
        },
        Allocation: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            resourceId: { type: 'string', format: 'uuid' },
            projectId: { type: 'string', format: 'uuid' },
            role: { type: 'string' },
            percentage: { type: 'integer', minimum: 1, maximum: 100 },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['PROPOSED', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED'] },
            isBillable: { type: 'boolean' },
          },
        },
        Client: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            name: { type: 'string' },
            industry: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'PROSPECT'] },
            contactName: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            contactPhone: { type: 'string' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string' },
                firstName: { type: 'string' },
                lastName: { type: 'string' },
                tenantId: { type: 'string', format: 'uuid' },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                expiresIn: { type: 'integer' },
              },
            },
          },
        },
        MatchResult: {
          type: 'object',
          properties: {
            resourceId: { type: 'string', format: 'uuid' },
            resourceName: { type: 'string' },
            overallScore: { type: 'number' },
            skillScore: { type: 'number' },
            availabilityScore: { type: 'number' },
            matchedSkills: { type: 'array', items: { type: 'string' } },
            missingSkills: { type: 'array', items: { type: 'string' } },
            currentUtilization: { type: 'number' },
            availableCapacity: { type: 'number' },
            recommendation: { type: 'string' },
          },
        },
        ExportResult: {
          type: 'object',
          properties: {
            data: { type: 'string' },
            filename: { type: 'string' },
            mimeType: { type: 'string' },
            recordCount: { type: 'integer' },
          },
        },
        ImportResult: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            totalRows: { type: 'integer' },
            importedRows: { type: 'integer' },
            skippedRows: { type: 'integer' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  row: { type: 'integer' },
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        Webhook: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            url: { type: 'string', format: 'uri' },
            events: { type: 'array', items: { type: 'string' } },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Authentication', description: 'Auth operations' },
      { name: 'Resources', description: 'Resource management' },
      { name: 'Projects', description: 'Project management' },
      { name: 'Allocations', description: 'Allocation management' },
      { name: 'Clients', description: 'Client management' },
      { name: 'Contracts', description: 'Contract management' },
      { name: 'Dashboard', description: 'Dashboard metrics' },
      { name: 'Bench', description: 'Bench management' },
      { name: 'Intelligence', description: 'Smart matching & insights' },
      { name: 'Analytics', description: 'Advanced analytics' },
      { name: 'Export', description: 'Data export' },
      { name: 'Import', description: 'Data import' },
      { name: 'Webhooks', description: 'Webhook management' },
      { name: 'Timesheets', description: 'Timesheet management' },
    ],
  },
  apis: ['./src/modules/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

