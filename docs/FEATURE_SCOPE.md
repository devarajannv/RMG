# RMGaaS Feature Scope

> Complete feature specification and scope definition

---

## 1. Core Resource Management

### 1.1 Resource Profile
| Feature | Status | Description |
|---------|--------|-------------|
| Basic Info | ✅ | Name, email, employee ID, designation |
| Employment Details | ✅ | Type, status, join date, reporting |
| Skills & Certifications | ✅ | Multi-skill with proficiency levels |
| Allocation History | ✅ | Past and current project allocations |
| Availability | ⏳ | Planned with leave integration |

### 1.2 Resource Operations
| Feature | Status | Description |
|---------|--------|-------------|
| CRUD Operations | ✅ | Full lifecycle management |
| Bulk Import | ✅ | CSV import with validation |
| Search & Filter | ✅ | Multi-criteria search |
| Smart Match | ✅ | AI-powered skill matching |

---

## 2. Project Management

### 2.1 Project Lifecycle
| Feature | Status | Description |
|---------|--------|-------------|
| Project CRUD | ✅ | Create, update, archive |
| Status Workflow | ✅ | Pipeline → Active → Completed |
| Health Tracking | ✅ | Green/Amber/Red indicators |
| Budget Tracking | ✅ | Budget vs. actual |

### 2.2 Team Management
| Feature | Status | Description |
|---------|--------|-------------|
| Allocations | ✅ | Resource assignment with % |
| Role Mapping | ✅ | Project roles per resource |
| Rolloff Tracking | ✅ | Upcoming end dates |
| Quick Allocation | ✅ | One-click bench allocation |

---

## 3. Client & Contract Management

### 3.1 Client Management
| Feature | Status | Description |
|---------|--------|-------------|
| Client Profile | ✅ | Name, industry, tier |
| Contact Management | ✅ | Multiple contacts per client |
| Client Status | ✅ | Active/Inactive/Prospect |

### 3.2 Contract Management
| Feature | Status | Description |
|---------|--------|-------------|
| Contract Types | ✅ | MSA, SOW, CR |
| Contract Lifecycle | ✅ | Draft → Active → Expired |
| Rate Cards | ⏳ | Planned |
| Auto-Renewal | ⏳ | Planned |

### 3.3 Document Access Control (Planned)
| Document Type | Classification | Access |
|---------------|---------------|--------|
| MSA | Confidential | CEO, Legal, Finance Head, Delivery Head, Practice Head, Operations Head + Team |
| SOW | Restricted | Above + PM + Account Manager |
| CR | Restricted | Above + Project team leads |
| Invoices | Confidential | Finance, CEO, CFO, Operations |
| Timesheets | Internal | Resource, Manager, Finance, PM |
| Project Docs | Internal | Project team + stakeholders |

---

## 4. Timesheet Management

### 4.1 Time Entry
| Feature | Status | Description |
|---------|--------|-------------|
| Weekly Grid | ✅ | 7-day entry view |
| Project Hours | ✅ | Per-project time logging |
| Notes | ✅ | Activity descriptions |
| Draft Save | ✅ | Save before submit |

### 4.2 Approval Workflow
| Feature | Status | Description |
|---------|--------|-------------|
| Submit | ✅ | Week-end submission |
| Manager Approval | ✅ | Approve/Reject flow |
| Rejection Notes | ✅ | Reason for rejection |
| Re-submission | ✅ | Edit and resubmit |

---

## 5. Bench Management

### 5.1 Bench Analysis
| Feature | Status | Description |
|---------|--------|-------------|
| Overview | ✅ | Bench count, cost, trends |
| Resource List | ✅ | Current bench resources |
| Rolloff Forecast | ✅ | Upcoming additions |
| Alerts | ✅ | Long-bench notifications |
| Cost Forecast | ✅ | Projected bench cost |

### 5.2 Bench Actions
| Feature | Status | Description |
|---------|--------|-------------|
| Quick Allocate | ✅ | One-click allocation |
| Skill Match | ✅ | Match to opportunities |
| Training Assign | ⏳ | Skill development |

---

## 6. Intelligence Layer

### 6.1 Smart Matching
| Feature | Status | Description |
|---------|--------|-------------|
| Skill Match | ✅ | Score-based matching |
| Availability Check | ✅ | Allocation overlap check |
| Location Preference | ✅ | Location-based ranking |
| Experience Match | ✅ | Years of experience fit |

### 6.2 Analytics
| Feature | Status | Description |
|---------|--------|-------------|
| Skill Gap Analysis | ✅ | Per-project gaps |
| Utilization Insights | ✅ | Under/over utilized |
| Recommendations | ✅ | Action suggestions |

---

## 7. Dashboards & Analytics

### 7.1 Executive Dashboard
| Metric | Status | Description |
|--------|--------|-------------|
| Total Resources | ✅ | Organization headcount |
| Utilization Rate | ✅ | Billable vs. total |
| Bench Count | ✅ | Current bench |
| Revenue/Resource | ⏳ | With invoicing module |

### 7.2 Practice Dashboard
| Metric | Status | Description |
|--------|--------|-------------|
| Practice Utilization | ✅ | By practice breakdown |
| Skill Coverage | ✅ | Skills per practice |
| Bench by Practice | ✅ | Practice-wise bench |

### 7.3 Financial Dashboard
| Metric | Status | Description |
|--------|--------|-------------|
| Bench Cost | ✅ | Monthly burn rate |
| Cost Trends | ✅ | Historical analysis |
| Projections | ✅ | 90-day forecast |
| Revenue | ⏳ | With invoicing module |

### 7.4 Project Health Dashboard
| Metric | Status | Description |
|--------|--------|-------------|
| Staffing Status | ✅ | Under/over staffed |
| Skill Gaps | ✅ | Missing skills |
| Timeline Risk | ⏳ | Planned |

---

## 8. Reports & Export

### 8.1 Standard Reports
| Report | Status | Format |
|--------|--------|--------|
| Resource List | ✅ | CSV, JSON |
| Allocation Report | ✅ | CSV, JSON |
| Utilization Report | ✅ | CSV, JSON |
| Bench Report | ✅ | CSV, JSON |
| Project Status | ✅ | CSV, JSON |
| Timesheet Summary | ✅ | CSV, JSON |
| Skills Matrix | ✅ | CSV, JSON |

### 8.2 Data Management
| Feature | Status | Description |
|---------|--------|-------------|
| Bulk Export | ✅ | All entity types |
| Bulk Import | ✅ | CSV with validation |
| Import Templates | ✅ | Downloadable templates |
| Webhooks | ✅ | 15 event types |

---

## 9. Authentication & Authorization

### 9.1 Authentication
| Feature | Status | Description |
|---------|--------|-------------|
| Email/Password | ✅ | Standard login |
| Microsoft 365 SSO | ✅ | Azure AD integration |
| JWT Tokens | ✅ | Short-lived access tokens |
| Refresh Tokens | ✅ | HttpOnly cookie |
| Session Management | ✅ | Logout, token invalidation |

### 9.2 Authorization (Current)
| Feature | Status | Description |
|---------|--------|-------------|
| Role-Based Access | ✅ | Admin, Manager, User |
| Tenant Isolation | ✅ | Multi-tenant data separation |
| Permission System | ✅ | Basic permissions |

### 9.3 Enhanced Authorization
| Feature | Status | Description |
|---------|--------|-------------|
| Role Hierarchy | ✅ | Org → Delivery → Practice → Team → Individual (5 levels) |
| Granular Permissions | ✅ | 30+ permissions (module/action/scope) |
| Permission API | ✅ | Check, assign, revoke permissions |
| CTC Access Control | ⏳ | Schema ready, workflow pending |
| Delegation | 🔜 | Proxy permissions |
| Audit Trail | ✅ | RoleAssignmentAudit table |

---

## 10. Integrations (Planned)

### 10.1 HubSpot CRM
| Feature | Status | Description |
|---------|--------|-------------|
| OAuth Connect | 🔜 | Secure authentication |
| Deal Sync | 🔜 | Deal closure webhook |
| Contract Trigger | 🔜 | Auto-create contract task |
| Client Sync | 🔜 | Client data sync |

### 10.2 PeopleStrong HRMS
| Feature | Status | Description |
|---------|--------|-------------|
| API Connect | 🔜 | REST API integration |
| Employee Sync | 🔜 | Master data sync |
| Skills Master | 🔜 | RMGaaS as skills source |
| Lifecycle Events | 🔜 | Hire/resign/transfer sync |
| Leave Data | 🔜 | Availability calculation |

### 10.3 Accounting Systems
| Feature | Status | Description |
|---------|--------|-------------|
| Tally Export | 🔜 | Invoice export |
| QuickBooks | 🔜 | API integration |
| Zoho Books | 🔜 | API integration |

---

## 11. Invoicing Module (Planned)

### 11.1 Invoice Types
| Type | Description |
|------|-------------|
| Time & Material | Hours × Rate from contract |
| Fixed Price | Milestone-based |
| Retainer | Monthly recurring |
| Hybrid | Fixed + T&M overflow |

### 11.2 Invoice Features
| Feature | Status | Description |
|---------|--------|-------------|
| Auto-Generation | 🔜 | From approved timesheets |
| Rate Application | 🔜 | Role/resource-based rates |
| Tax Handling | 🔜 | GST/VAT configurable |
| Multi-Currency | 🔜 | Conversion at invoice date |
| Approval Workflow | 🔜 | Draft → Review → Sent |
| Payment Tracking | 🔜 | Partial payments |
| Aging Reports | 🔜 | 30/60/90/120 days |
| E-Invoice | 🔜 | GST India compliance |

---

## 12. Document Management

### 12.1 Storage
| Feature | Status | Description |
|---------|--------|-------------|
| Local Storage | ✅ | Abstracted for cloud migration |
| Cloud Storage | 🔜 | S3/Azure Blob integration |
| File Upload | ✅ | API with size/type validation |
| Versioning | ✅ | Every edit = new version |
| Audit Trail | ✅ | DocumentAccessLog table |

### 12.2 E-Signatures
| Feature | Status | Description |
|---------|--------|-------------|
| DocuSign | 🔜 | Integration |
| Adobe Sign | 🔜 | Integration |
| Signature Status | ⏳ | Schema ready (signatureStatus field) |

### 12.3 Access Control
| Feature | Status | Description |
|---------|--------|-------------|
| Classification | ✅ | Public/Internal/Restricted/Confidential |
| Role-Based | ✅ | DocumentAccess by role/user/practice |
| Time-Bound | ✅ | expiresAt field with auto-revocation |
| Access Logging | ✅ | View/Download/Edit/Delete tracked |

---

## 13. Multi-Currency

### 13.1 Currency Configuration
| Feature | Status | Description |
|---------|--------|-------------|
| Currency Table | ✅ | 6 defaults (USD, INR, EUR, GBP, AUD, SGD) |
| Base Currency | ✅ | USD default, configurable |
| Exchange Rates | ✅ | Manual rate management API |
| Rate History | ✅ | Historical rates with effectiveFrom/To |
| Conversion API | ✅ | Current and historical conversion |
| Billing Currency | 🔜 | Per-client field |
| Employee Currency | 🔜 | Per-resource field |

### 13.2 Financial Views
| Feature | Status | Description |
|---------|--------|-------------|
| Currency Settings UI | ✅ | Settings → Currency tab |
| Currency Switch | 🔜 | Toggle on reports |
| Rate at Transaction | 🔜 | Store on financial records |

---

## 14. AI Capabilities

### 14.1 AI Agent (Phase 1 - Query Only)
| Feature | Status | Description |
|---------|--------|-------------|
| Natural Language Query | ✅ | Text-based queries |
| Query Classification | ✅ | T1/T2/T3 tier routing |
| Intent Recognition | ✅ | Search/count/metric/identify |
| Conversation Tracking | ✅ | AgentConversation table |
| Message History | ✅ | AgentMessage with metadata |
| Floating Widget UI | ✅ | Chat bubble on all pages |
| Command Palette | ✅ | Cmd+K shortcut |
| Suggestions | ✅ | Context-aware prompts |
| Rich Responses | ✅ | Text/Table/Cards/Gauge |
| Feedback System | ✅ | Thumbs up/down |

### 14.2 AI Agent (Phase 2 - Pending)
| Feature | Status | Description |
|---------|--------|-------------|
| LLM Integration | 🔜 | Gemini/OpenAI API calls |
| Write Operations | 🔜 | Create/update with approval |
| Extended Memory | 🔜 | Full session context |

### 14.3 AI Migration
| Feature | Status | Description |
|---------|--------|-------------|
| Multi-Format | 🔜 | CSV, Excel, JSON, PDF, Images |
| Data Scrubbing | 🔜 | AI-powered cleanup |
| Field Mapping | 🔜 | Automatic detection |
| Validation | 🔜 | Confidence-based review |
| Conflict Resolution | 🔜 | UI for duplicates |

---

## Legend

| Status | Meaning |
|--------|---------|
| ✅ | Implemented |
| ⏳ | Partially implemented |
| 🔜 | Planned |

---

*Feature scope maintained by AI development assistant*

