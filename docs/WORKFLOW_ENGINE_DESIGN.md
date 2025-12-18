# Workflow Engine Design

> **Status:** In Design Discussion  
> **Last Updated:** December 18, 2025  
> **Stakeholders:** Product Owner, Development Team

---

## 1. Vision Statement

Build a **general-purpose workflow engine** that handles ALL tasks in RMGaaS with:
- **Intelligent** behavior - suggests, predicts, warns
- **Dynamic** adaptation - learns from patterns, evolves with org
- **Total flexibility** - everything configurable, nothing hardcoded

This is the **core differentiator** of the product.

---

## 2. Scope

### What Gets a Workflow
| Category | Examples |
|----------|----------|
| **Requests** | Resource allocation, release, onboarding, offboarding |
| **Documents** | Contract approval, SOW sign-off, policy acknowledgment |
| **Timesheets** | Weekly submission, manager approval, finance review |
| **Any Org-Defined Task** | Custom workflows the organization creates |

### Guiding Principle
> "All tasks that can be done in the product should have a workflow."

---

## 3. Core Concepts

### 3.1 Roles vs People

| Concept | Description |
|---------|-------------|
| **Role is Primary** | "Finance Head" approves, not "John" |
| **Person is Resolution** | John happens to BE Finance Head today |
| **Auto-Escalation** | If John unavailable within SLA → peer in same role |
| **Pinned Exception** | Override: "This MUST go to Sarah specifically" |

### 3.2 Role Scoping

| Scope | Meaning | Example |
|-------|---------|---------|
| **Contextual** | Role within the request's context | "PM of THIS project" |
| **Org-wide** | Any person with this role | "Any Finance Head" |
| **Named** | Specific person override | "Sarah Lee only" |

Configured per workflow step.

---

## 4. Workflow Capabilities

### 4.1 Step Types (Configurable)

| Type | Description |
|------|-------------|
| **Sequential** | Step 1 → Step 2 → Step 3 |
| **Parallel (AND)** | All must approve |
| **Parallel (OR)** | Any one approves |
| **Parallel (N of M)** | e.g., 3 of 5 must approve |

### 4.2 Conditional Branching

Branch based on any field:
- Amount thresholds: `If amount > $50K → add CFO step`
- Request type: `If type = "External Hire" → add Legal step`
- Priority: `If priority = "Critical" → skip to Director`
- Custom fields: Any field the org defines

### 4.3 Rejection Handling (Configurable per workflow)

| Option | Behavior |
|--------|----------|
| Back to Requester | Returns to Step 0, requester can edit and resubmit |
| Back to Step N | Returns to a specific step (e.g., back to PM for revision) |
| Terminate | Request marked as Rejected, workflow ends |
| Custom | Trigger specific actions (notify, escalate, etc.) |

### 4.4 SLA & Escalation

| Feature | Description |
|---------|-------------|
| **Per-Step SLA** | Each step has its own deadline |
| **Warning Threshold** | Alert at X% of SLA consumed |
| **Auto-Escalation** | On breach: → peer in role, or → up hierarchy |
| **Escalation Path** | Configurable per step |

---

## 5. Intelligent Behaviors

### 5.1 Versioning (System-Decided)

Not admin-selected - **system analyzes impact and suggests**:

| Scenario | System Behavior |
|----------|-----------------|
| Minor change (SLA tweak, text) | In-flight requests auto-inherit |
| Step added/removed | In-flight continue old version, new requests use new |
| Critical fix (compliance) | Admin can force-migrate with audit trail |
| Request past changed step | No impact, continue |
| Request approaching changed step | Flag: "3 requests will be affected" - admin confirms |

### 5.2 Dynamic Templates (Not Static)

**Traditional:** "Here's a template, clone and edit"

**Our Approach:** System proposes based on org structure

First-time setup:
> "You have 3 Delivery Heads, 1 Finance Head, 5 PMs. For resource allocations:
> - PM → Delivery Head → Finance *(recommended for your size)*
> - PM → Finance only
> - Custom"

Over time:
> "This workflow has 40% rejection at Step 2. Consider adding a review step before Finance."

### 5.3 Mandatory Live Preview

Not optional - **built into the builder**:

| Feature | Description |
|---------|-------------|
| **Real Names** | As you build, shows: "John Smith (PM) → Sarah Lee (Finance Head)" |
| **Gap Warnings** | "⚠️ No backup for Finance Head - SLA breach has no escalation path" |
| **Path Analysis** | "Based on last 30 days: 80% take Path A, 20% Path B" |
| **Auto-Generated Scenarios** | System creates test cases from real org data |

---

## 6. Data Model

### 6.1 Graph-Based Architecture

```
WORKFLOW (graph)
├── NODES (the boxes)
│   ├── START - Entry point
│   ├── APPROVAL - Someone approves/rejects
│   ├── TASK - Someone performs action
│   ├── CONDITION - Branch based on rules
│   ├── PARALLEL_SPLIT - Fork into parallel paths
│   ├── PARALLEL_JOIN - Wait for paths (AND/OR/N-of-M)
│   ├── NOTIFICATION - Send alert (no action needed)
│   ├── AUTOMATION - System action (update status, call API)
│   └── END - Terminal states (Approved/Rejected/Cancelled)
│
└── EDGES (the connections)
    ├── source → target
    ├── condition (for branching)
    └── label ("Approve", "Reject", "If > $50K")
```

### 6.2 Visual Example: Resource Allocation

```
        ┌───────────┐
        │   START   │
        └─────┬─────┘
              │
              ▼
        ┌───────────┐
        │  Project  │ ← Role: PM of THIS project
        │  Manager  │   SLA: 24h
        └─────┬─────┘
              │
         ┌────┴────┐
         ▼         ▼
    [Amount     [Amount
     ≤ $50K]     > $50K]
         │         │
         │    ┌────┴────┐
         │    ▼         │
         │  ┌─────┐     │
         │  │ CFO │     │
         │  └──┬──┘     │
         │     │        │
         └──┬──┴────────┘
            ▼
     ┌──────────────┐
     │ PARALLEL     │
     │ ┌────┬────┐  │
     │ ▼    ▼    │  │
     │ HR  Finance│  │ ← Both must approve (AND)
     │ └────┴────┘  │
     └──────┬───────┘
            ▼
        ┌───────┐
        │  END  │
        │Approved│
        └───────┘
```

---

## 7. UX Design (DECIDED: Conversational + Visual Hybrid)

### The Innovation: Bi-Directional Agent + Canvas

**Status:** DECIDED - Full implementation, no MVP shortcuts

After evaluating Canvas-only, Lanes-only, and various alternatives, we're building something **genuinely novel**: a bi-directional system where conversation and visual canvas stay in perfect sync.

### 7.1 The Interface

```
┌─────────────────────────────────────────────────────────────────────┐
│  WORKFLOW BUILDER                                          [Save]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    VISUAL CANVAS                            │   │
│  │                                                             │   │
│  │    ┌───────┐     ┌───────┐     ┌───────┐     ┌───────┐    │   │
│  │    │ Start │────▶│  PM   │────▶│Finance│────▶│  End  │    │   │
│  │    └───────┘     │ Sarah │     │ Mike  │     │Approved│    │   │
│  │                  │ 24hrs │     │ 48hrs │     └───────┘    │   │
│  │                  └───────┘     └───────┘                  │   │
│  │                                                             │   │
│  │              ✏️ Drag nodes to reorder • Click to edit       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  💬 WORKFLOW ASSISTANT                                      │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  You: "Add CFO approval if amount exceeds 50K"              │   │
│  │                                                             │   │
│  │  🤖: Done! I've added a conditional branch:                 │   │
│  │      • If Amount > $50K → CFO Review (72 hrs) before Finance│   │
│  │      • Otherwise → straight to Finance                      │   │
│  │      [Undo] [Modify]                                        │   │
│  │  ─────────────────────────────────────────────────────────  │   │
│  │  You: ▌                                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Bi-Directional Magic

| User Action | System Response |
|-------------|-----------------|
| **Types:** "Resource allocation needs PM then Finance approval" | Canvas renders PM → Finance flow |
| **Types:** "Add CFO if over 50K" | Canvas adds conditional branch |
| **Drags:** CFO node before Finance | Agent asks: "CFO before Finance - intentional?" |
| **Drags:** PM and Finance to same vertical | Agent suggests: "Make these parallel?" |
| **Clicks:** Delete on a node | Agent warns: "This will skip Finance approval. Continue?" |
| **Types:** "What happens if John is on leave?" | Agent shows escalation path visually highlighted |

### 7.3 Agent Response to Visual Changes

When user drags Finance before PM:
```
┌─────────────────────────────────────────────────────────────────────┐
│  🤖: I noticed you moved Finance before PM.                         │
│      This means Finance will review BEFORE the Project              │
│      Manager. Is that intentional?                                  │
│                                                                     │
│      • [Yes, Finance first] - Unusual but allowed                   │
│      • [No, revert] - Put PM back first                             │
│      • [Make parallel] - Both review simultaneously                 │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.4 Why This Is Revolutionary

| Aspect | Traditional Builders | Our Approach |
|--------|---------------------|--------------|
| **Interaction** | Either chat OR visual | Both, fully synced |
| **Agent awareness** | Doesn't see visual changes | Interprets every drag/drop |
| **Visual updates** | Manual positioning | Auto-layout + user override |
| **Learning** | Static templates | Learns from org patterns |
| **Real people** | Abstract "Approver 1" | Shows "Sarah Lee (Finance Head)" |

### 7.5 Three Interaction Modes

| Mode | When Used |
|------|-----------|
| **Chat-first** | "Create a workflow for contractor onboarding" → Agent builds, user refines |
| **Visual-first** | User drags from role dock, agent offers suggestions |
| **Hybrid** | User starts visually, switches to chat for complex logic |

### 7.6 Does This Exist Anywhere?

**No.** This is genuinely novel:
- Figma AI can generate designs from text, but not bi-directional
- GitHub Copilot understands code, not visual diagrams
- No workflow builder has true conversation + visual sync with gesture interpretation

---

## 8. Workflow Agent Architecture (DECIDED)

### 8.1 Specialized Agent, Not General-Purpose

**Decision:** Build a dedicated Workflow Agent, not use the general AI assistant.

| General Agent | Specialized Workflow Agent |
|---------------|---------------------------|
| Knows everything, masters nothing | Deep expertise in workflow domain |
| Generic responses | Understands "parallel", "escalation", "SLA" natively |
| Needs heavy prompting | Speaks workflow language naturally |
| Can hallucinate random features | Constrained to valid workflow operations |
| Slower (more context) | Faster (focused context) |

### 8.2 Agent Knowledge

The specialized agent knows:
- **Valid operations:** add step, branch, parallel, connect, delete, configure
- **Org structure:** roles, people, hierarchy from the system
- **Existing patterns:** what workflows exist, what works
- **Current state:** the workflow being built (JSON representation)
- **Business rules:** compliance requirements, mandatory approvers

### 8.3 Agent System Prompt (Conceptual)

```typescript
const WORKFLOW_AGENT_CONTEXT = `
You are a workflow design assistant. You can:
- CREATE steps (approval, task, notification, automation)
- ADD conditions (if/then branches based on any field)
- CONFIGURE parallel flows (AND/OR/N-of-M)
- SET SLAs and escalation paths
- ASSIGN roles or specific people to steps
- INTERPRET visual changes the user makes on the canvas

You understand this organization:
- Roles: ${orgRoles}
- People by role: ${peopleByRole}
- Hierarchy: ${hierarchyStructure}

You have context on:
- Existing workflows: ${existingPatterns}
- Current workflow being edited: ${currentWorkflowJSON}

Behavior rules:
1. When user types a request, update the workflow AND explain what changed
2. When user drags/drops on canvas, interpret intent and confirm if ambiguous
3. Always offer [Undo] after making changes
4. Warn about gaps (missing escalation paths, no backups, compliance issues)
5. Suggest improvements based on patterns ("This workflow has high rejection rate at step 2")
`;
```

### 8.4 Gesture Interpretation

**Approach:** Event-based (not state diff)

```typescript
// Every visual action fires an event the agent interprets
onNodeMove(node, fromPosition, toPosition) {
  const interpretation = agent.interpret({
    action: 'MOVE',
    node: node,
    from: fromPosition,
    to: toPosition,
    context: currentWorkflow
  });
  
  // Returns: { intent: 'CHANGE_ORDER', confidence: 0.9 }
  // Or: { intent: 'MAKE_PARALLEL', confidence: 0.7 }
  // Or: { intent: 'UNCLEAR', suggestions: [...] }
  
  if (interpretation.confidence < 0.85) {
    showClarificationDialog(interpretation.options);
  } else {
    applyChange(interpretation);
    agent.explain(interpretation);
  }
}

onNodeConnect(sourceNode, targetNode) → agent.interpret({ action: 'CONNECT', ... })
onNodeDelete(node) → agent.interpret({ action: 'DELETE', ... })
onNodeAdd(nodeType, position) → agent.interpret({ action: 'ADD', ... })
```

### 8.5 Natural Corrections

```
User: "Actually, make it 75K not 50K"
Agent: ✓ Updated threshold from $50K to $75K
       [Canvas condition updates in real-time]

User: "Remove the CFO step entirely"  
Agent: ✓ Removed CFO Review step
       ⚠️ Note: Requests over $75K will now go directly 
          to Finance without executive review. Confirm?
       [Yes, remove] [No, keep CFO]
```

### 8.6 Learning Capabilities

```
Agent: "I notice your last 3 workflows all have 
        Finance as final approver. Want me to 
        add that automatically for new workflows?"
        [Yes, always] [Yes, for this type] [No]
```

```
Agent: "Based on the last 30 days:
        • 80% of requests take Path A (under $50K)
        • 20% take Path B (over $50K, needs CFO)
        • Average completion: 3.2 days
        • Bottleneck: Finance step (1.8 days avg)"
```

---

## 9. Technical Architecture

### 9.1 Tech Stack

| Component | Library/Approach |
|-----------|------------------|
| **Visual Canvas** | React Flow (XYFlow) - battle-tested, customizable |
| **Auto-Layout** | Dagre or ELK layout algorithms |
| **Drag-Drop** | React DnD or built-into React Flow |
| **Agent** | Dedicated workflow agent with specialized prompt |
| **State Sync** | Zustand for bi-directional canvas ↔ agent sync |
| **Gesture Interpretation** | Custom event handlers → agent interpretation |

### 9.2 Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   USER INPUT    │     │  WORKFLOW STATE │     │    VISUAL       │
│  (chat/visual)  │────▶│    (Zustand)    │────▶│    CANVAS       │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ WORKFLOW AGENT  │
                        │  (interprets,   │
                        │   suggests,     │
                        │   validates)    │
                        └─────────────────┘
```

### 9.3 Build Timeline

| Week | Deliverables |
|------|--------------|
| **Week 1** | Workflow data model (Prisma) + CRUD API + Visual canvas setup |
| **Week 2** | Workflow Agent + Chat→Visual sync + Visual→Chat sync |
| **Week 3** | Live preview + Role dock + SLA config + Integration |

---

## 10. Access Control

### Who Can Manage Workflows

| Permission | Who Gets It |
|------------|-------------|
| `workflows:manage` | Admins, RM Heads, Department Heads |
| `workflows:view` | Anyone who participates in workflows |
| `workflows:create` | Configurable per org |

### Per-Workflow Permissions
- Creator can always edit
- Org can restrict who can modify specific workflows
- Audit trail on all changes

---

## 11. Integration with Request Flow System

The existing Request Flow backend (completed) becomes **one consumer** of the workflow engine:

```
┌─────────────────────────────────────────────────┐
│           WORKFLOW ENGINE (New)                 │
│  - Workflow definitions                         │
│  - Visual builder + Conversational Agent        │
│  - Execution engine                             │
│  - SLA management                               │
└─────────────────────────────────────────────────┘
           │           │           │
           ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │ Requests │ │Documents │ │Timesheets│
    │ (exists) │ │          │ │          │
    └──────────┘ └──────────┘ └──────────┘
```

### Migration Path
1. Current approval chains → migrate to workflow nodes
2. Current SLA service → integrate with workflow engine
3. Current request types → become workflow triggers

---

## 12. Competitive Analysis

| Tool | Approach | Gap We Fill |
|------|----------|-------------|
| Retool Workflows | Node-based | Dev-focused, not for business users |
| Zapier/Make | Linear steps | Too simple for approvals |
| Power Automate | Flowchart | Complex, cluttered UI |
| Camunda | BPMN standard | Enterprise-heavy, steep learning |
| Monday.com | Status automations | Not true workflows |

**Our Differentiator:**
> Conversational + Visual hybrid with bi-directional sync. Talk to build, drag to refine, agent understands both. **No one else has this.**

---

## 13. Open Questions (Remaining)

| # | Question | Status |
|---|----------|--------|
| 1 | UX Pattern | ✅ DECIDED: Conversational + Visual Hybrid |
| 2 | Agent Type | ✅ DECIDED: Specialized Workflow Agent |
| 3 | Implementation Scope | ✅ DECIDED: Full feature, no MVP shortcuts |
| 4 | Mobile/Tablet | TBD - How should building work on smaller screens? |
| 5 | Audit Detail | TBD - How detailed should version history be? |
| 6 | Import/Export | TBD - Allow workflow sharing between orgs? |
| 7 | Offline Support | TBD - Can users build workflows offline? |

---

## 14. Related Documents

- [AI_PRINCIPLES_AND_SECURITY.md](./AI_PRINCIPLES_AND_SECURITY.md) - AI guiding principles and security framework
- [REQUEST_FLOW_SYSTEM.md](./REQUEST_FLOW_SYSTEM.md) - Current request flow implementation
- [PLANNING_INTELLIGENT_UI.md](./PLANNING_INTELLIGENT_UI.md) - Permission-aware UI plan
- [NEXT_ACTIONS.md](./NEXT_ACTIONS.md) - Overall roadmap

---

## Appendix: Design Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| Dec 18, 2025 | All tasks get workflows | Core product principle: intelligent, dynamic, flexible |
| Dec 18, 2025 | Role-primary, person-secondary | Enables auto-escalation, handles availability |
| Dec 18, 2025 | Everything configurable | Parallel (AND/OR/N-of-M), conditions, rejection handling |
| Dec 18, 2025 | System-decided versioning | Intelligent analysis of impact, not manual selection |
| Dec 18, 2025 | Dynamic templates | System proposes based on org structure, learns over time |
| Dec 18, 2025 | Conversational + Visual Hybrid | Bi-directional sync between chat and canvas |
| Dec 18, 2025 | Specialized Workflow Agent | Deep domain expertise, constrained to valid operations |
| Dec 18, 2025 | Event-based gesture interpretation | Agent interprets each drag/drop action precisely |
| Dec 18, 2025 | Full implementation | No MVP shortcuts, build it right first time |

---

*Design document - Core decisions made*
*Last updated: December 18, 2025*
