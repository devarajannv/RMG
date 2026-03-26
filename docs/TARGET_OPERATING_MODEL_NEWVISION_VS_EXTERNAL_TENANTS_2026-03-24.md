# Target Operating Model: NewVision vs External Tenants

Date: 2026-03-24
Status: Proposal
Scope: Tenant bootstrap, onboarding, ongoing organization administration, NewVision internal operating model

## 1. Decision Summary

The product should support two distinct tenant-operating modes:

1. NewVision internal tenant mode
2. External customer tenant mode

The onboarding capability remains valuable, but it should not be the default operating path for NewVision.

Instead:

- Onboarding remains the first-run guided experience for external tenants
- NewVision uses direct administration and import/bootstrap workflows
- The onboarding modules become reusable admin surfaces, not one-time-only wizard logic

## 2. Why This Direction

This preserves prior implementation work while making the product behave the way it was originally intended.

### It avoids waste

Existing onboarding work already provides:

- organization profile setup
- structure management
- business roles and grade bands
- people/resource management
- governance setup

That work should be reused as admin modules.

### It aligns with architecture

The architecture already separates:

- Platform Portal = NewVision internal / cross-tenant operations
- Tenant App = tenant-specific operations

The missing step is to distinguish between:

- guided first-run setup for new customer tenants
- ongoing operating mode for a mature tenant like NewVision

## 3. Core Product Rule

Onboarding is a mode, not the permanent home of organization administration.

That means:

- wizard = orchestration layer
- admin modules = durable management surfaces

The same underlying functionality should power both.

## 4. Tenant Modes

## 4.1 NewVision Internal Tenant Mode

### Intent

NewVision is not a brand-new customer starting from zero.
Its tenant will often be bootstrapped from imported structure, seeded data, or direct admin configuration.

### Entry behavior

- No forced redirect to onboarding
- Default entry goes to normal tenant app
- Organization Admin is the primary configuration surface
- Import/bootstrap flows are available as tools
- Onboarding wizard may still exist as an optional assistant, not a gate

### Expected setup pattern

- import organization data
- seed resources / projects / allocations
- refine structure directly in admin
- create users and roles directly in admin
- manage workflows and governance directly in admin

### UX implication

For NewVision, the tenant app should feel like an operational admin console, not a first-time setup wizard.

## 4.2 External Customer Tenant Mode

### Intent

A new customer tenant starts empty and needs guided setup.

### Entry behavior

- if tenant lacks required baseline data, route tenant admin to onboarding
- allow resume if setup is incomplete
- once minimum configuration is complete, treat the tenant like a normal operating tenant

### Expected setup pattern

- guided structure creation
- guided role setup
- guided people setup
- optional AI-assisted onboarding later

### UX implication

Onboarding is a bootstrap accelerator, not a permanent operating surface.

## 5. Recommended State Model

Each tenant should have an explicit operating state.

Suggested states:

1. `BOOTSTRAP_REQUIRED`
2. `BOOTSTRAP_IN_PROGRESS`
3. `OPERATIONAL`
4. `NEWVISION_INTERNAL`

### Behavioral meaning

- `BOOTSTRAP_REQUIRED`: external tenant must start onboarding
- `BOOTSTRAP_IN_PROGRESS`: external tenant resumes onboarding but can still access allowed areas
- `OPERATIONAL`: tenant uses standard admin surfaces
- `NEWVISION_INTERNAL`: onboarding is optional, direct admin mode is primary

## 6. Reuse Strategy for Existing Onboarding Work

The existing onboarding implementation should be split conceptually into:

1. shared domain modules
2. wizard orchestration

### Shared domain modules

These become durable admin surfaces:

- Organization Profile
- Structure
- Business Roles
- Grade Bands
- People / Resources
- Governance

### Wizard orchestration

This remains for external tenants:

- stepper
- progress tracking
- guardrails
- dependency warnings
- completion logic

This means the onboarding codebase is not discarded. It is repurposed.

## 7. Target Information Architecture

## 7.1 For NewVision Internal Tenant

Under Organization Admin, NewVision should have durable sections such as:

- Organization Profile
- Structure
- People
- Business Roles
- Grade Bands
- System Roles & Access
- Workflows
- Request Types
- Integrations
- Data Management
- Audit

Onboarding should be optional and secondary.

## 7.2 For External Customer Tenants

Under Organization Admin:

- show onboarding status banner when incomplete
- guide first-run admin into onboarding
- once complete, expose the same durable sections as above

This creates one long-term model instead of one setup-only model and one operations-only model.

## 8. What Should Change in Product Behavior

## 8.1 NewVision

### Should do

- bypass forced onboarding
- use seeded/imported data as valid baseline
- operate through direct admin pages
- access onboarding only as an optional setup assistant

### Should not do

- require wizard completion before normal use
- hide structure/people/governance management behind the onboarding flow only

## 8.2 External Tenants

### Should do

- start with onboarding if baseline data is missing
- use wizard to get to first usable state quickly
- transition naturally into ongoing admin surfaces after setup

### Should not do

- remain permanently dependent on the onboarding wizard for edits

## 9. Screen-Level Outcome

## 9.1 Organization Admin should become the durable home for fundamentals

This should include:

- organization structure maintenance
- people/resource placement
- business roles and grade bands
- system access and RBAC
- governance/workflow setup

## 9.2 Onboarding should become a guided wrapper over those same capabilities

It should:

- sequence the work
- warn on missing dependencies
- accelerate setup
- not own the only editable version of that data

## 10. Migration of Existing Work

The current onboarding implementation should be reclassified as follows:

### Keep

- backend onboarding APIs
- frontend phase components
- progress tracking
- import validation logic

### Reuse in persistent admin sections

- StructurePhase -> Structure admin surface
- PeoplePhase -> People admin surface
- RolesPhase -> Business roles / grade bands admin surface
- GovernancePhase -> Governance admin surface
- IdentityPhase -> Organization profile admin surface

### Leave only in wizard

- stepper navigation
- phase completion state
- resume flow
- setup messaging

## 11. Operational Recommendation

Adopt the following product rule immediately:

- NewVision tenant is treated as `NEWVISION_INTERNAL`
- external customer tenants are treated as `BOOTSTRAP_REQUIRED` until operational baseline exists

This is the cleanest way to preserve current implementation investment and align with the intended product architecture.

## 12. Success Criteria

This operating model is successful when:

1. NewVision can manage its tenant without being forced through onboarding
2. External tenants still get a guided first-run experience
3. The same underlying admin capabilities are reusable in both modes
4. Organization Admin becomes the permanent home of tenant fundamentals
5. Onboarding becomes optional after bootstrap instead of a hidden dependency

## 13. Recommended Next Product Move

The next design/implementation step should be:

1. define the post-onboarding durable admin surfaces
2. decide which onboarding phase components graduate into permanent admin pages
3. introduce tenant operating mode logic so NewVision is not treated like a brand-new external tenant

## 14. Proposed Final Position

The onboarding work should not be discarded.

It should be repositioned as:

- external tenant bootstrap flow
- optional assistant for NewVision
- orchestration over reusable organization admin modules

That preserves the investment and restores the product direction you originally intended.
