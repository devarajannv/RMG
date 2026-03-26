# RMGaaS Integration Strategy

> **Document Status:** APPROVED  
> **Last Updated:** 2025-12-15  
> **Version:** 1.0

---

## Overview

RMGaaS operates in an ecosystem of enterprise systems. This document defines:
1. Systems we integrate WITH (consume data from)
2. Systems we provide data TO (API provider)
3. Integration architecture and patterns

---

## Integration Philosophy

> **RMGaaS is both a consumer AND provider of data**

- **Consumer:** Pull employee data, deals, opportunities
- **Provider:** Expose resource, allocation, utilization data to other systems
- **Hub:** Central source of truth for resource management

---

## Current System Landscape (NewVision)

| System | Purpose | Status | Integration Priority |
|--------|---------|--------|---------------------|
| **PeopleStrong** | HRMS | Active (partial subscription) | P0 - Critical |
| **HubSpot** | Deal/Pipeline Management | Active | P1 - High |
| **ERP** | Finance/Billing | TBD | P2 - Medium |
| **Slack/Teams** | Communication | Active | P1 - High |

---

## Integration Directions

### 1. Inbound Integrations (Data INTO RMGaaS)

| Source | Data | Direction | Frequency |
|--------|------|-----------|-----------|
| **PeopleStrong HRMS** | Employee master, joins, exits, org structure | Pull | Real-time/Daily |
| **HubSpot CRM** | Deals, opportunities, pipeline | Pull | Real-time |
| **Calendar (O365/Google)** | Leave, availability | Pull | Real-time |
| **PM Tools (Jira/ADO)** | Project status | Pull | Periodic |

### 2. Outbound Integrations (Data FROM RMGaaS)

| Target | Data | Direction | Purpose |
|--------|------|-----------|---------|
| **PeopleStrong** | Allocation data, utilization | Push | Workforce analytics |
| **HubSpot** | Resource availability, skill inventory | Push | Deal qualification |
| **ERP/Finance** | Billable hours, revenue data | Push | Invoicing |
| **BI Tools** | All metrics | Pull | Analytics |
| **Custom Apps** | Any data via API | Pull | Custom integrations |

### 3. Bidirectional

| System | Data Flow |
|--------|-----------|
| **HubSpot** | Deals IN → Resource needs; Availability OUT → Deal feasibility |
| **PM Tools** | Projects IN/OUT; Allocation sync |

---

## PeopleStrong HRMS Integration

### Current State
- Active but **partially subscribed** (cost reasons)
- Core employee data available
- Some modules not subscribed
- Current implementation scope: unidirectional only for Phase 1, from PeopleStrong into RMGaaS

### Data We Need FROM PeopleStrong

| Data | Purpose | Sync |
|------|---------|------|
| Employee Master | Resource creation | Real-time |
| Joining/Exits | Auto-onboard/offboard | Real-time |
| Org Structure | Practice, manager hierarchy | Daily |
| Leave/Attendance | Availability | Real-time |
| Designation/Band | Resource attributes | On change |
| Cost Center | Financial mapping | On change |

### Data We Provide TO PeopleStrong

Status: deferred. Not part of the current implementation scope.

| Data | Purpose |
|------|---------|
| Allocation Status | Workforce dashboard |
| Utilization Metrics | HR analytics |
| Bench Status | Workforce planning |
| Project Assignments | Employee records |

### Integration Method

```
PeopleStrong → RMGaaS
         │
         ├── REST API (if available)
         ├── Webhook (for real-time events)
         ├── SFTP (for batch files)
         └── Manual Import (fallback)
```

Phase 1 scope:

- PeopleStrong sends employee master and lifecycle changes into RMGaaS
- RMGaaS does not push data back to PeopleStrong yet

---

## HubSpot CRM Integration

### Current State
- Active for deal management
- Pipeline and opportunity tracking

### Data We Need FROM HubSpot

| Data | Purpose |
|------|---------|
| Deals/Opportunities | Demand forecasting |
| Deal Stage | Probability weighting |
| Expected Close Date | Timeline planning |
| Deal Value | Revenue forecasting |
| Required Skills | Resource matching |
| Client Info | Client master sync |

### Data We Provide TO HubSpot

| Data | Purpose |
|------|---------|
| Resource Availability | Deal qualification |
| Skill Inventory | Capability matching |
| Current Capacity | Can we take this deal? |
| Similar Past Projects | Reference data |

### Integration Method

```
HubSpot ←→ RMGaaS
      │
      ├── HubSpot API v3
      ├── Webhooks (deal stage changes)
      └── Custom Properties (RMG fields)
```

---

## API Provider Capability

### RMGaaS as Data Provider

RMGaaS exposes APIs for other systems to consume:

```
┌─────────────────────────────────────────────────────────┐
│                    RMGaaS API Gateway                    │
├─────────────────────────────────────────────────────────┤
│  REST API        │  GraphQL API    │  Webhooks          │
│  (CRUD ops)      │  (Flexible      │  (Event push)      │
│                  │   queries)      │                    │
└─────────────────────────────────────────────────────────┘
         │                 │                  │
         ▼                 ▼                  ▼
    ┌─────────┐      ┌─────────┐       ┌─────────┐
    │BI Tools │      │ Custom  │       │External │
    │Tableau  │      │  Apps   │       │ Systems │
    │PowerBI  │      │         │       │         │
    └─────────┘      └─────────┘       └─────────┘
```

### API Capabilities

| Capability | Description |
|------------|-------------|
| **REST API** | Full CRUD, standard endpoints |
| **GraphQL** | Flexible queries, reduce over-fetching |
| **Webhooks** | Push events to external systems |
| **Bulk Export** | Large data exports |
| **Real-time Subscriptions** | WebSocket for live data |

### API Security for External Consumers

| Control | Implementation |
|---------|----------------|
| API Keys | For system-to-system auth |
| OAuth 2.0 | For user-context access |
| Rate Limiting | Per-consumer limits |
| IP Whitelisting | Optional for sensitive data |
| Scopes | Granular permission control |

---

## Integration Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         RMGaaS Platform                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │  Core App    │  │  Integration │  │   API        │              │
│  │  (Resources, │  │  Service     │  │   Gateway    │              │
│  │  Projects,   │◄─┤  (Sync,      │◄─┤  (External   │◄── External  │
│  │  Contracts,  │  │  Transform,  │  │   Access)    │    Systems   │
│  │  Timesheets) │  │  Queue)      │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│         │                 │                                         │
│         ▼                 ▼                                         │
│  ┌──────────────────────────────────────────────────────────┐      │
│  │                    PostgreSQL                             │      │
│  │  (Resources, Contracts, Timesheets, Integration Logs)    │      │
│  └──────────────────────────────────────────────────────────┘      │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
         │                                        ▲
         ▼                                        │
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  PeopleStrong   │  │    HubSpot      │  │   BI Tools      │
│  (HRMS)         │  │    (CRM)        │  │   (Consumers)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## Integration Patterns

### Pattern 1: Event-Driven Sync

```
Source System → Webhook → RMGaaS Queue → Process → Update
```

### Pattern 2: Scheduled Sync

```
Scheduler → Fetch from Source → Transform → Upsert → Log
```

### Pattern 3: On-Demand Sync

```
User Action → Trigger Sync → Fetch Latest → Update → Confirm
```

### Pattern 4: Outbound Push

```
RMGaaS Event → Webhook Queue → POST to Target → Log Result
```

---

## Data Mapping Standards

### Employee Sync (PeopleStrong → RMGaaS)

| PeopleStrong Field | RMGaaS Field | Transform |
|--------------------|--------------|-----------|
| emp_id | employeeId | Direct |
| email | email | Lowercase |
| first_name | firstName | Trim |
| last_name | lastName | Trim |
| department | practice | Lookup |
| designation | band | Lookup |
| manager_id | managerId | Resolve |
| doj | dateOfJoining | Date parse |
| status | status | Map values |

### Deal Sync (HubSpot → RMGaaS)

| HubSpot Field | RMGaaS Field | Transform |
|---------------|--------------|-----------|
| dealname | opportunityName | Direct |
| dealstage | stage | Map to enum |
| closedate | expectedCloseDate | Date parse |
| amount | dealValue | Number |
| associated_company | clientId | Lookup/Create |
| deal_properties.skills | requiredSkills | Parse array |

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Source unavailable | Retry with backoff, alert after 3 fails |
| Invalid data | Log error, skip record, continue |
| Duplicate | Upsert based on external ID |
| Rate limited | Respect limits, queue remaining |
| Auth failure | Alert admin, pause sync |

---

## Integration Logging

All integrations logged for:
- Audit trail
- Troubleshooting
- Reconciliation
- SLA monitoring

```typescript
interface IntegrationLog {
  id: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  system: string;
  operation: string;
  status: 'success' | 'failure' | 'partial';
  recordCount: number;
  duration: number;
  errorDetails?: string;
}
```

---

## Roadmap

| Phase | Integrations | Priority |
|-------|--------------|----------|
| **MVP** | Manual import/export, API provider capability | P0 |
| **Phase 1** | PeopleStrong (basic), HubSpot (basic) | P1 |
| **Phase 2** | Full PeopleStrong, Full HubSpot, Slack/Teams | P1 |
| **Phase 3** | ERP, PM Tools, Calendar | P2 |
| **Future** | Open integration marketplace | P3 |

---

## Security Considerations

| Concern | Control |
|---------|---------|
| Credential storage | Encrypted, never logged |
| Data in transit | TLS 1.3 |
| API access | Scoped tokens, audit logged |
| PII handling | Masked in logs |
| Webhook validation | Signature verification |

---

*Document created from strategic session on 2025-12-15*

