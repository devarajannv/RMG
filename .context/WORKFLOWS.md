# Business Workflows & Data Flows

> **Version:** 1.0  
> **Last Updated:** 2025-12-06T00:00:00Z  
> **Status:** APPROVED

---

## Overview

This document defines all business processes, workflows, state machines, and data flows in RMGaaS. **AI assistants MUST reference this when implementing any feature involving business logic.**

---

## Table of Contents

1. [Core Workflows](#1-core-workflows)
2. [Data Flows](#2-data-flows)
3. [State Machines](#3-state-machines)
4. [Integration Flows](#4-integration-flows)
5. [Notification Triggers](#5-notification-triggers)

---

## 1. Core Workflows

### 1.1 Resource Onboarding

**Trigger:** New employee joins organization  
**Actors:** HR Admin, Resource Manager, Employee  
**SLA:** Complete within 24 hours of joining

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RESOURCE ONBOARDING WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

   HR SYSTEM                    RMGaaS                      MANAGERS
      │                           │                            │
      │  1. Employee data sync    │                            │
      │  (or manual entry)        │                            │
      ├──────────────────────────▶│                            │
      │                           │                            │
      │                     ┌─────┴─────┐                      │
      │                     │  CREATE   │                      │
      │                     │ RESOURCE  │                      │
      │                     │ (status:  │                      │
      │                     │  active)  │                      │
      │                     └─────┬─────┘                      │
      │                           │                            │
      │                           │  2. Assign to Practice     │
      │                           ├───────────────────────────▶│
      │                           │                            │
      │                           │  3. Practice Head assigns  │
      │                           │     Reporting Manager      │
      │                           │◀───────────────────────────┤
      │                           │                            │
      │                     ┌─────┴─────┐                      │
      │                     │   AUTO    │                      │
      │                     │ BENCH     │                      │
      │                     │ (benchSince│                     │
      │                     │  = today) │                      │
      │                     └─────┬─────┘                      │
      │                           │                            │
      │                           │  4. Notify RM of new       │
      │                           │     bench resource         │
      │                           ├───────────────────────────▶│
      │                           │                            │
      │                           │  5. Skills assessment      │
      │                           │◀───────────────────────────┤
      │                           │                            │
      │                     ┌─────┴─────┐                      │
      │                     │  UPDATE   │                      │
      │                     │  SKILLS   │                      │
      │                     └─────┬─────┘                      │
      │                           │                            │
      │                           │  6. Resource ready for     │
      │                           │     allocation             │
      │                           │                            │
      ▼                           ▼                            ▼
```

**Process Steps:**
| Step | Action | System Behavior | Validation |
|------|--------|-----------------|------------|
| 1 | Create Resource | Insert into RESOURCE table | Required fields check |
| 2 | Assign Practice | Set practiceId | Practice must exist |
| 3 | Assign Manager | Set managerId | Manager must be in same tenant |
| 4 | Auto-Bench | Set benchSince = today | Only if no initial allocation |
| 5 | Add Skills | Insert RESOURCE_SKILL records | Skills must exist |
| 6 | Ready | Status = 'active', on bench | - |

---

### 1.2 Resource Allocation Request

**Trigger:** Project needs resources  
**Actors:** Project Manager, Resource Manager, Practice Head  
**SLA:** Response within 48 hours

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     ALLOCATION REQUEST WORKFLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

PROJECT MANAGER         RESOURCE MANAGER         PRACTICE HEAD         RESOURCE
      │                        │                       │                   │
      │  1. Submit Request     │                       │                   │
      │  (project, skills,     │                       │                   │
      │   dates, %)            │                       │                   │
      ├───────────────────────▶│                       │                   │
      │                        │                       │                   │
      │                  ┌─────┴─────┐                 │                   │
      │                  │  CREATE   │                 │                   │
      │                  │ALLOCATION │                 │                   │
      │                  │ (proposed)│                 │                   │
      │                  └─────┬─────┘                 │                   │
      │                        │                       │                   │
      │                        │  2. Search & Match    │                   │
      │                        │  Available Resources  │                   │
      │                        │                       │                   │
      │                  ┌─────┴─────┐                 │                   │
      │                  │  MATCHING │                 │                   │
      │                  │ ALGORITHM │                 │                   │
      │                  └─────┬─────┘                 │                   │
      │                        │                       │                   │
      │                        │  3. Select Resource   │                   │
      │                        │  (may need approval)  │                   │
      │                        │                       │                   │
      │               ┌────────┴────────┐              │                   │
      │               │                 │              │                   │
      │               ▼                 ▼              │                   │
      │     ┌─────────────┐    ┌─────────────┐        │                   │
      │     │  Bench      │    │ Allocated   │        │                   │
      │     │  Resource   │    │ Resource    │        │                   │
      │     │  (auto OK)  │    │ (need swap) │        │                   │
      │     └──────┬──────┘    └──────┬──────┘        │                   │
      │            │                  │               │                   │
      │            │                  │  4. Request   │                   │
      │            │                  │  Approval     │                   │
      │            │                  ├──────────────▶│                   │
      │            │                  │               │                   │
      │            │                  │  5. Approve/  │                   │
      │            │                  │  Reject       │                   │
      │            │                  │◀──────────────┤                   │
      │            │                  │               │                   │
      │            └───────┬──────────┘               │                   │
      │                    │                          │                   │
      │              ┌─────┴─────┐                    │                   │
      │              │  UPDATE   │                    │                   │
      │              │ALLOCATION │                    │                   │
      │              │(confirmed)│                    │                   │
      │              └─────┬─────┘                    │                   │
      │                    │                          │                   │
      │                    │  6. Notify Resource      │                   │
      │                    ├──────────────────────────┼──────────────────▶│
      │                    │                          │                   │
      │  7. Confirm to PM  │                          │                   │
      │◀───────────────────┤                          │                   │
      │                    │                          │                   │
      ▼                    ▼                          ▼                   ▼
```

**Approval Rules:**
| Scenario | Auto-Approve | Requires Approval | Approver |
|----------|--------------|-------------------|----------|
| Bench resource | ✅ | - | - |
| Same practice | ✅ | - | - |
| Cross-practice | - | ✅ | Losing Practice Head |
| Resource has < 20% free | - | ✅ | Resource's Manager |
| Strategic client | - | ✅ | Practice Head |

---

### 1.3 Allocation Lifecycle

**Trigger:** Allocation start date reached  
**Automatic process**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      ALLOCATION LIFECYCLE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

                    CONFIRMED                      ACTIVE
                        │                            │
    On Start Date       │                            │     On End Date
    (daily job)         │                            │     (daily job)
          ┌─────────────┴─────────────┐    ┌────────┴────────┐
          ▼                           │    │                 ▼
    ┌───────────┐                     │    │          ┌───────────┐
    │  ACTIVATE │                     │    │          │ COMPLETE  │
    │ALLOCATION │                     │    │          │ALLOCATION │
    └─────┬─────┘                     │    │          └─────┬─────┘
          │                           │    │                │
          │  • status → 'active'      │    │  • status → 'completed'
          │  • startedAt = NOW()      │    │  • completedAt = NOW()
          │  • Clear benchSince       │    │  • Check if back to bench
          │  • Log audit entry        │    │  • Log audit entry
          │                           │    │                │
          ▼                           ▼    ▼                ▼
    ┌───────────┐               ┌───────────┐        ┌───────────┐
    │  NOTIFY   │               │  NOTIFY   │        │  NOTIFY   │
    │ Resource  │               │  14-day   │        │  Rolloff  │
    │ Started   │               │  rolloff  │        │ Complete  │
    └───────────┘               │  warning  │        └───────────┘
                                └───────────┘
                                      │
                                      │  If no future allocation:
                                      │  • Set benchSince = endDate + 1
                                      │  • Notify Resource Manager
                                      ▼
```

---

### 1.4 Bench Management

**Trigger:** Resource has no active allocation  
**Ongoing monitoring process**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        BENCH MONITORING WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

    DAILY JOB                                ALERTS
        │
        │  For each resource WHERE benchSince IS NOT NULL
        │
        ▼
  ┌───────────────┐
  │ Calculate     │
  │ benchDays     │
  │ = today -     │
  │ benchSince    │
  └───────┬───────┘
          │
          ├────────────────────┬────────────────────┬────────────────────┐
          │                    │                    │                    │
          ▼                    ▼                    ▼                    ▼
    benchDays = 7        benchDays = 14       benchDays = 30       benchDays = 60
          │                    │                    │                    │
          ▼                    ▼                    ▼                    ▼
    ┌───────────┐        ┌───────────┐        ┌───────────┐        ┌───────────┐
    │  NOTIFY   │        │  NOTIFY   │        │  NOTIFY   │        │  ESCALATE │
    │  Resource │        │  Resource │        │  Practice │        │  to COO   │
    │  Manager  │        │  Manager  │        │  Head     │        │           │
    │  (Info)   │        │  (Warning)│        │  (Action) │        │  (Critical│
    └───────────┘        └───────────┘        └───────────┘        └───────────┘


    BENCH AGING REPORT (Generated weekly)
    ┌──────────────────────────────────────────────────────────────┐
    │ Tier      │ Days    │ Count │ Monthly Cost │ Action Required │
    │───────────┼─────────┼───────┼──────────────┼─────────────────│
    │ Fresh     │ 0-7     │   5   │   ₹2.5L      │ Normal          │
    │ Warning   │ 8-14    │   3   │   ₹1.8L      │ Active search   │
    │ Critical  │ 15-30   │   2   │   ₹1.5L      │ Upskilling      │
    │ Urgent    │ 31-60   │   1   │   ₹1.0L      │ Discuss options │
    │ Severe    │ 60+     │   1   │   ₹1.2L      │ Executive review│
    └──────────────────────────────────────────────────────────────┘
```

---

### 1.5 Resource Offboarding

**Trigger:** Employee resignation/termination  
**Actors:** HR Admin, Resource Manager, Project Manager  
**SLA:** Complete before last working day

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      RESOURCE OFFBOARDING WORKFLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

HR ADMIN                 SYSTEM                    STAKEHOLDERS
    │                       │                           │
    │  1. Set exit date     │                           │
    │  (dateOfExit,         │                           │
    │   exitReason)         │                           │
    ├──────────────────────▶│                           │
    │                       │                           │
    │                 ┌─────┴─────┐                     │
    │                 │  UPDATE   │                     │
    │                 │ RESOURCE  │                     │
    │                 │ (notice)  │                     │
    │                 └─────┬─────┘                     │
    │                       │                           │
    │                       │  2. Find active           │
    │                       │  allocations              │
    │                       │                           │
    │                 ┌─────┴─────┐                     │
    │                 │  QUERY    │                     │
    │                 │ALLOCATIONS│                     │
    │                 │endDate >  │                     │
    │                 │ exitDate  │                     │
    │                 └─────┬─────┘                     │
    │                       │                           │
    │                       │  3. Notify affected       │
    │                       │  Project Managers         │
    │                       ├──────────────────────────▶│
    │                       │                           │
    │                       │  4. Auto-truncate         │
    │                       │  allocations OR           │
    │                       │  await manual action      │
    │                       │                           │
    │                 ┌─────┴─────┐                     │
    │                 │  UPDATE   │                     │
    │                 │ALLOCATIONS│                     │
    │                 │ (set      │                     │
    │                 │ endDate = │                     │
    │                 │ exitDate) │                     │
    │                 └─────┬─────┘                     │
    │                       │                           │
    │                       │  5. On exit date:         │
    │                       │  status → inactive        │
    │                       │                           │
    │                 ┌─────┴─────┐                     │
    │                 │  ARCHIVE  │                     │
    │                 │ (soft     │                     │
    │                 │  delete)  │                     │
    │                 └───────────┘                     │
    │                                                   │
    ▼                                                   ▼
```

---

## 2. Data Flows

### 2.1 Dashboard Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        DASHBOARD DATA FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────┘

USER REQUEST                                                    RESPONSE
     │                                                              ▲
     │  GET /graphql                                               │
     │  query: dashboardData(practice, dateRange)                  │
     ▼                                                              │
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   AUTH   │───▶│  PARSE   │───▶│  CACHE   │───▶│  QUERY   │───▶│  FORMAT  │
│MIDDLEWARE│    │  QUERY   │    │  CHECK   │    │RESOLVERS │    │ RESPONSE │
└──────────┘    └──────────┘    └────┬─────┘    └──────────┘    └──────────┘
                                     │                ▲
                                     │  Cache Miss    │
                                     ▼                │
                               ┌──────────┐          │
                               │  REDIS   │          │
                               │  CACHE   │          │
                               └──────────┘          │
                                                     │
                                     ┌───────────────┴───────────────┐
                                     │                               │
                               ┌─────┴─────┐                   ┌─────┴─────┐
                               │ POSTGRES  │                   │CLICKHOUSE │
                               │  (Live)   │                   │(Analytics)│
                               └───────────┘                   └───────────┘


DASHBOARD QUERIES:

1. Utilization by Practice
   ├── SUM(allocation.percentage) / COUNT(DISTINCT resource) 
   ├── Grouped by practice
   └── Filtered by date range

2. Bench Count & Cost
   ├── COUNT WHERE benchSince IS NOT NULL
   ├── SUM(resource.costPerHour * 8 * 22) for monthly cost
   └── Grouped by practice, band

3. Rolloff Calendar
   ├── SELECT allocations WHERE endDate BETWEEN today AND today+90
   ├── Grouped by week
   └── Include resource details

4. Resource Availability
   ├── 100 - SUM(active_allocations.percentage)
   ├── For each resource
   └── For date range
```

### 2.2 Allocation Conflict Check Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ALLOCATION CONFLICT CHECK                                │
└─────────────────────────────────────────────────────────────────────────────┘

NEW ALLOCATION REQUEST
{resourceId, startDate, endDate, percentage}
          │
          ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STEP 1: Get existing allocations for resource in date range         │
│                                                                       │
│  SELECT * FROM allocations                                           │
│  WHERE resourceId = :resourceId                                      │
│    AND status IN ('confirmed', 'active')                             │
│    AND startDate <= :endDate                                         │
│    AND endDate >= :startDate                                         │
└───────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STEP 2: For each day in range, calculate total allocation           │
│                                                                       │
│  FOR day IN (startDate..endDate):                                    │
│    existingTotal = SUM(overlapping allocations for day)              │
│    proposedTotal = existingTotal + newPercentage                     │
│    IF proposedTotal > resource.capacity:                             │
│      conflicts.push({day, existingTotal, overflow})                  │
└───────────────────────────────────────────────────────────────────────┘
          │
          ▼
     conflicts.length > 0?
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
  YES          NO
    │           │
    ▼           ▼
┌─────────┐ ┌─────────┐
│ RETURN  │ │ ALLOW   │
│CONFLICTS│ │CREATION │
│ DETAILS │ │         │
└─────────┘ └─────────┘

CONFLICT RESPONSE:
{
  "canAllocate": false,
  "conflicts": [
    {
      "date": "2025-01-15",
      "existingAllocation": 80,
      "requestedAllocation": 50,
      "totalWouldBe": 130,
      "overBy": 30,
      "existingProjects": ["PROJ-A", "PROJ-B"]
    }
  ],
  "suggestion": "Reduce allocation to 20% or adjust dates"
}
```

### 2.3 Search & Match Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    RESOURCE SEARCH & MATCH                                  │
└─────────────────────────────────────────────────────────────────────────────┘

SEARCH REQUEST
{skills[], availability%, startDate, endDate, practice?, location?}
          │
          ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STEP 1: Base filter (must match)                                    │
│                                                                       │
│  SELECT resources WHERE                                              │
│    status = 'active'                                                 │
│    AND (practice = :practice OR :practice IS NULL)                   │
│    AND (location = :location OR :location IS NULL)                   │
└───────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STEP 2: Skills match (score-based)                                  │
│                                                                       │
│  FOR each resource:                                                  │
│    skillScore = 0                                                    │
│    FOR each required skill:                                          │
│      IF resource has skill:                                          │
│        skillScore += proficiencyWeight[proficiency]                  │
│        (beginner=1, intermediate=2, advanced=3, expert=4)            │
│    skillMatchPercent = skillScore / maxPossibleScore                 │
└───────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STEP 3: Availability calculation                                    │
│                                                                       │
│  FOR each resource:                                                  │
│    avgAvailability = AVG(dailyAvailability) for date range          │
│    WHERE dailyAvailability = capacity - SUM(activeAllocations)       │
│    availabilityMatch = avgAvailability >= requiredAvailability       │
└───────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STEP 4: Composite scoring                                           │
│                                                                       │
│  finalScore =                                                        │
│    (skillMatchPercent * 0.4) +                                       │
│    (availabilityScore * 0.3) +                                       │
│    (benchBonus * 0.2) +          // +20 if on bench                  │
│    (samePracticeBonus * 0.1)     // +10 if same practice             │
└───────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌───────────────────────────────────────────────────────────────────────┐
│  STEP 5: Sort and return                                             │
│                                                                       │
│  ORDER BY finalScore DESC                                            │
│  LIMIT 20                                                            │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 3. State Machines

### 3.1 Allocation State Machine (Complete)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ALLOCATION STATE MACHINE                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                                 ┌─────────────────┐
                                 │    PROPOSED     │
                                 │                 │
                                 │ Entry:          │
                                 │ - Create record │
                                 │ - Notify RM     │
                                 └────────┬────────┘
                                          │
           ┌──────────────────────────────┼──────────────────────────────┐
           │                              │                              │
           │ [reject]                     │ [approve]                    │
           │                              │                              │
           ▼                              ▼                              │
┌─────────────────┐            ┌─────────────────┐                       │
│   CANCELLED     │            │   CONFIRMED     │                       │
│                 │            │                 │                       │
│ Entry:          │            │ Entry:          │                       │
│ - Set reason    │            │ - confirmedAt   │                       │
│ - Notify PM     │            │ - approvedBy    │                       │
│ - Release lock  │            │ - Notify PM     │                       │
└─────────────────┘            │ - Notify Res    │                       │
        ▲                      └────────┬────────┘                       │
        │                               │                                │
        │                               │ [startDate reached]            │
        │                               │ (automated daily job)          │
        │                               ▼                                │
        │                    ┌─────────────────┐                         │
        │                    │     ACTIVE      │                         │
        │                    │                 │                         │
        │                    │ Entry:          │                         │
        │  [cancel]          │ - startedAt     │                         │
        ├────────────────────│ - Clear bench   │                         │
        │                    │ - Update util   │                         │
        │                    └────────┬────────┘                         │
        │                             │                                  │
        │                             │ [endDate reached]                │
        │                             │ (automated daily job)            │
        │                             ▼                                  │
        │                  ┌─────────────────┐                           │
        │                  │   COMPLETED     │                           │
        │                  │                 │                           │
        │                  │ Entry:          │                           │
        │                  │ - completedAt   │                           │
        │                  │ - Check bench   │                           │
        │                  │ - Update util   │                           │
        │                  │ - Notify rolloff│                           │
        │                  └─────────────────┘                           │
        │                                                                │
        └────────────────────────────────────────────────────────────────┘


VALID TRANSITIONS:
┌──────────────┬────────────────┬──────────────────────────────────────────┐
│ From         │ To             │ Trigger / Condition                      │
├──────────────┼────────────────┼──────────────────────────────────────────┤
│ proposed     │ confirmed      │ RM approves                              │
│ proposed     │ cancelled      │ RM rejects OR PM withdraws               │
│ confirmed    │ active         │ startDate = today (auto)                 │
│ confirmed    │ cancelled      │ PM/RM cancels before start               │
│ active       │ completed      │ endDate = today (auto)                   │
│ active       │ cancelled      │ PM/RM cancels (rare, needs reason)       │
└──────────────┴────────────────┴──────────────────────────────────────────┘

INVALID TRANSITIONS:
- completed → any (terminal state)
- cancelled → any (terminal state)
- any → proposed (can't go back)
```

### 3.2 Project State Machine

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PROJECT STATE MACHINE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

         ┌─────────────────┐
         │    PIPELINE     │ ◄─── Initial state
         │                 │
         │ (Opportunity,   │
         │  not yet won)   │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │ [lost]      │ [won]       │
    ▼             ▼             │
┌────────┐  ┌─────────────────┐ │
│CANCELLED│  │     ACTIVE      │ │
└────────┘  │                 │ │
    ▲       │ (In execution)  │ │
    │       └────────┬────────┘ │
    │                │          │
    │   ┌────────────┼──────────┤
    │   │ [pause]    │          │
    │   ▼            │          │
    │ ┌─────────┐    │          │
    │ │ ON_HOLD │────┘          │
    │ │         │  [resume]     │
    │ └────┬────┘               │
    │      │ [cancel]           │
    │      └────────────────────┤
    │                           │
    └───────────────────────────┤
                                │
                                │ [complete]
                                ▼
                       ┌─────────────────┐
                       │   COMPLETED     │
                       │                 │
                       │ (Terminal)      │
                       └─────────────────┘
```

---

## 4. Integration Flows

### 4.1 HRMS Sync (Future)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HRMS SYNC FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────┘

HRMS (Keka/Darwinbox)              RMGaaS                    
        │                            │
        │  Webhook: employee.created │
        ├───────────────────────────▶│
        │                            │  1. Validate payload
        │                            │  2. Check if exists
        │                            │  3. Create/Update resource
        │                            │  4. Log sync event
        │                            │
        │  Webhook: employee.updated │
        ├───────────────────────────▶│
        │                            │  1. Map fields
        │                            │  2. Update resource
        │                            │  3. Log changes
        │                            │
        │  Webhook: employee.exited  │
        ├───────────────────────────▶│
        │                            │  1. Trigger offboarding
        │                            │  2. Update status
        │                            │
        │                            │

FIELD MAPPING:
┌──────────────────┬──────────────────┬────────────────────┐
│ HRMS Field       │ RMGaaS Field     │ Transform          │
├──────────────────┼──────────────────┼────────────────────┤
│ employee_id      │ employeeId       │ Direct             │
│ first_name       │ firstName        │ Direct             │
│ last_name        │ lastName         │ Direct             │
│ work_email       │ email            │ Direct             │
│ designation      │ designation      │ Direct             │
│ department       │ department       │ Direct             │
│ grade            │ band             │ Mapping table      │
│ date_of_joining  │ dateOfJoining    │ Date parse         │
│ reporting_to     │ managerId        │ Lookup by emp ID   │
│ location         │ locationId       │ Lookup by name     │
│ employment_type  │ employmentType   │ Mapping            │
└──────────────────┴──────────────────┴────────────────────┘
```

---

## 5. Notification Triggers

### 5.1 Notification Matrix

| Event | Recipients | Channel | Priority | Template |
|-------|------------|---------|----------|----------|
| New allocation proposed | Resource Manager | In-app, Email | High | `allocation.proposed` |
| Allocation confirmed | Resource, PM | In-app, Email | Medium | `allocation.confirmed` |
| Allocation starting (tomorrow) | Resource | In-app, Email | Medium | `allocation.starting` |
| Allocation ending (14 days) | RM, PM | In-app, Email | Medium | `allocation.rolloff.14d` |
| Allocation ending (7 days) | RM, PM, Resource | In-app, Email | High | `allocation.rolloff.7d` |
| Resource on bench (7 days) | Resource Manager | In-app | Low | `bench.7d` |
| Resource on bench (14 days) | RM, Practice Head | In-app, Email | Medium | `bench.14d` |
| Resource on bench (30 days) | Practice Head | In-app, Email | High | `bench.30d` |
| Resource exiting | RM, PM (of active allocs) | In-app, Email | High | `resource.exiting` |
| New resource joined | Practice Head, RM | In-app | Low | `resource.joined` |
| Project starting (7 days) | PM, Allocated resources | In-app | Medium | `project.starting` |
| Allocation conflict | RM who created | In-app | High | `allocation.conflict` |

### 5.2 Notification Flow

```
EVENT OCCURS
     │
     ▼
┌──────────────────┐
│ NOTIFICATION     │
│ SERVICE          │
└────────┬─────────┘
         │
         │  1. Determine recipients
         │  2. Check preferences
         │  3. Render template
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│IN-APP │ │ EMAIL │
│QUEUE  │ │ QUEUE │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│WEBSOCKET│SENDGRID│
│PUSH   │ │ API   │
└───────┘ └───────┘
```

---

## 6. Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `allocation.activate` | Daily 00:05 | Move confirmed → active |
| `allocation.complete` | Daily 00:10 | Move active → completed |
| `bench.calculate` | Daily 00:15 | Update benchSince for all |
| `bench.alerts` | Daily 08:00 | Send bench aging alerts |
| `rolloff.alerts` | Daily 08:00 | Send rolloff warnings |
| `utilization.snapshot` | Daily 23:55 | Capture daily utilization |
| `analytics.aggregate` | Weekly Sun 02:00 | Aggregate to ClickHouse |
| `audit.archive` | Monthly 1st 03:00 | Archive old audit logs |

---

*Last Updated: 2025-12-06T00:00:00Z*
*Version: 1.0*
