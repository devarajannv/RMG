# Blockers & Issues

> **Track issues preventing progress**  
> **Last Updated:** 2025-12-06T00:00:00Z

---

## Active Blockers

*No active blockers*

---

## Resolved Blockers

| ID | Title | Impact | Reported | Resolved | Resolution |
|----|-------|--------|----------|----------|------------|
| - | - | - | - | - | - |

---

## How to Log a Blocker

### Using the Script

```powershell
.\ctx-blocker.ps1 -Title "Description of blocker" `
                  -Impact "High" `
                  -Description "Full details of the issue"
```

### Manually

Add to this file:

```markdown
### BLK-XXX: [Title]
```
Status: 🔴 Active
Impact: [Critical/High/Medium/Low]
Reported: YYYY-MM-DD
Reported By: [Name]
Blocking: [Action IDs affected]
```

**Description:**
[What is the blocker?]

**What We've Tried:**
- [Attempt 1]
- [Attempt 2]

**Potential Solutions:**
- [ ] [Option 1]
- [ ] [Option 2]

**Resolution:**
[How it was resolved - fill when resolved]
```

---

## Blocker Template

```markdown
### BLK-XXX: [Title]
```
Status: 🔴 Active
Impact: Critical/High/Medium/Low
Reported: YYYY-MM-DD
Reported By: [Name]
Blocking: A001, A002
```

**Description:**
[Detailed description of the blocker]

**What We've Tried:**
- [First attempt and result]
- [Second attempt and result]

**Potential Solutions:**
- [ ] [Possible solution 1]
- [ ] [Possible solution 2]

**Resolution:**
[To be filled when resolved]
```

---

## Impact Guidelines

| Impact | Definition | Response Time |
|--------|------------|---------------|
| 🔴 Critical | Blocks all development | Immediate |
| 🟠 High | Blocks critical path | Same day |
| 🟡 Medium | Blocks specific feature | This sprint |
| 🟢 Low | Inconvenience | When possible |

---

## Escalation Path

1. **Try to resolve yourself** (30 min)
2. **Ask team in Slack** (1 hour)
3. **Log blocker here** (immediately after step 2)
4. **Escalate to Tech Lead** (if High/Critical)
5. **Escalate to Manager** (if Critical and unresolved 4+ hours)
