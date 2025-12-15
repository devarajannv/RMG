# RMGaaS Decisions Log

> **Document Status:** Living Document  
> **Last Updated:** 2025-12-15  
> **Session:** Strategic Planning Session

---

## Overview

This document records all key decisions made during the strategic planning and deliberation phase for RMGaaS. Each decision includes context, options considered, and rationale.

---

## Decision Categories

- [Strategic Decisions](#strategic-decisions)
- [Market Decisions](#market-decisions)
- [Product Decisions](#product-decisions)
- [Technical Decisions](#technical-decisions)
- [UX/Design Decisions](#uxdesign-decisions)
- [Security Decisions](#security-decisions)
- [Process Decisions](#process-decisions)

---

## Strategic Decisions

### SD-01: First Customer Strategy

| Attribute | Value |
|-----------|-------|
| **Decision** | NewVision Software as first customer (dogfooding) |
| **Rationale** | Real data, fast feedback loop, prove value internally first |
| **Status** | ✅ APPROVED |

### SD-02: Go-to-Market Philosophy

| Attribute | Value |
|-----------|-------|
| **Decision** | Product-Led Growth (PLG) |
| **Question Asked** | "Who is the purchase champion?" |
| **Answer** | "The product should sell itself with its value and performance" |
| **Rationale** | Value demonstration over sales-led approach |
| **Status** | ✅ APPROVED |

### SD-03: Business Model Timing

| Attribute | Value |
|-----------|-------|
| **Decision** | Pricing model deferred to post-validation |
| **Question Asked** | "What's the business model?" |
| **Answer** | "That's a call I can take later" |
| **Rationale** | Focus on product-market fit first |
| **Status** | ✅ APPROVED |

---

## Market Decisions

### MD-01: Target Company Size

| Attribute | Value |
|-----------|-------|
| **Decision** | 1,000 - 5,000+ employees (D & E segments) |
| **Options Considered** | A(1-50), B(50-200), C(200-500), D(500-2000), E(2000+) |
| **Rationale** | Enterprise features, higher value per customer |
| **Status** | ✅ APPROVED |

### MD-02: Geographic Scope

| Attribute | Value |
|-----------|-------|
| **Decision** | Global from day 1 |
| **Options Considered** | India-first, US-focused, Global |
| **Rationale** | Broader market opportunity |
| **Status** | ✅ APPROVED |

### MD-03: Industry Focus

| Attribute | Value |
|-----------|-------|
| **Primary Decision** | IT Services + Engineering Services (Option C) |
| **Expansion Path** | Strong fundamentals to expand to: |
| | - Professional Services (B) |
| | - Agencies & Studios (D) |
| **Status** | ✅ APPROVED |

### MD-04: Primary Buyer Persona

| Attribute | Value |
|-----------|-------|
| **Decision** | Multiple buyers - "all personas use the tool" |
| **Check Signer** | C-level (COO/CFO) - Option G |
| **Champion** | Product itself (PLG) |
| **Status** | ✅ APPROVED |

---

## Product Decisions

### PD-01: Core Product Positioning

| Attribute | Value |
|-----------|-------|
| **Decision** | Bench Intelligence + AI-Native Matching as differentiator |
| **Rationale** | Best-in-class bench management sets us apart |
| **Status** | ✅ APPROVED |

### PD-02: Utilization Target

| Attribute | Value |
|-----------|-------|
| **Question** | "Is 85% utilization universal?" |
| **Decision** | Dynamic, configurable target |
| **Enhancement** | AI/ML-based suggestion for optimal % |
| **Rationale** | Win-win for resource availability and margin improvement |
| **Status** | ✅ APPROVED |

### PD-03: SLA Targets (Staffing)

| Attribute | Value |
|-----------|-------|
| **Question** | "Is 48-hour staffing SLA based on research?" |
| **Decision** | No hardcoded numbers - configurable |
| **Rationale** | Different orgs have different needs |
| **Status** | ✅ APPROVED |

### PD-04: Real-time vs Batch Updates

| Attribute | Value |
|-----------|-------|
| **Question** | "Do users need real-time dashboards or is weekly enough?" |
| **Decision** | Real-time is essential |
| **Quote** | "What's the point of having a SaaS system if users don't have access to real-time data" |
| **Status** | ✅ APPROVED |

### PD-05: Intelligence Approach

| Attribute | Value |
|-----------|-------|
| **Decision** | Hybrid: Rules-based + ML |
| **Rules-based** | Works immediately, day 1 value |
| **ML-based** | Learns from data, improves over time |
| **Rationale** | Immediate value + continuous improvement |
| **Status** | ✅ APPROVED |

### PD-06: On-Prem vs SaaS

| Attribute | Value |
|-----------|-------|
| **Question** | "Some enterprises want on-prem" |
| **Decision** | Defer to later |
| **Initial Focus** | Self-hosted on Ubuntu, then cloud |
| **Status** | ✅ DEFERRED |

### PD-07: Excel Replacement Validation

| Attribute | Value |
|-----------|-------|
| **Question** | "Is 'Resource Managers want to replace Excel' validated?" |
| **Decision** | ABSOLUTELY VALIDATED |
| **Evidence** | Real data file shared showing pain of current Excel approach |
| **Status** | ✅ VALIDATED |

### PD-08: Current Pain Points (from Excel Analysis)

| Attribute | Value |
|-----------|-------|
| **Identified Pains** | |
| C | No meaningful reports/dashboards |
| D | Can't assess technical strength of org |
| E | Don't know who becomes available when with what skills |
| F | Bench visibility issues |
| G | Manual allocation tracking |
| H | No proactive alerts |
| I | Fragmented data across sheets |
| **Status** | ✅ VALIDATED |

### PD-09: Product Vision Scope

| Attribute | Value |
|-----------|-------|
| **Decision** | Do not restrict vision to Excel file limitations |
| **Quote** | "DO NOT RESTRICT YOUR VISION TO THIS EXCEL FILE. WE ARE BUILDING A PRODUCT" |
| **Rationale** | The Excel shows pain, not the limit of what's possible |
| **Status** | ✅ APPROVED |

---

## Technical Decisions

### TD-01: Development Timeline

| Attribute | Value |
|-----------|-------|
| **Decision** | 14-day comprehensive scope |
| **Question** | "MVP scope is too light for AI-coded speed" |
| **Original** | Multi-week/month timeline |
| **Revised** | 14 days to full product |
| **Rationale** | AI-augmented development enables aggressive timeline |
| **Status** | ✅ APPROVED |

### TD-02: Database Choice

| Attribute | Value |
|-----------|-------|
| **Decision** | PostgreSQL 16 |
| **Rationale** | RLS for multi-tenancy, JSONB, enterprise-grade |
| **Status** | ✅ APPROVED (from ADR-001) |

### TD-03: API Architecture

| Attribute | Value |
|-----------|-------|
| **Decision** | REST + GraphQL Hybrid |
| **Pattern** | GraphQL for queries, REST for mutations |
| **Status** | ✅ APPROVED (from ADR-002) |

### TD-04: Frontend Framework

| Attribute | Value |
|-----------|-------|
| **Decision** | React 18 + Vite + TailwindCSS + shadcn/ui |
| **Status** | ✅ APPROVED (from ADR-003) |

### TD-05: Multi-Tenant Architecture

| Attribute | Value |
|-----------|-------|
| **Decision** | Hybrid approach based on tier |
| **Implementation** | RLS (standard), schema per tenant (premium), DB per tenant (enterprise) |
| **Status** | ✅ APPROVED (from ADR-004) |

### TD-06: Authentication

| Attribute | Value |
|-----------|-------|
| **Decision** | JWT + Refresh Tokens in HttpOnly cookies |
| **Password Hashing** | Argon2 |
| **Status** | ✅ APPROVED (from ADR-005) |

### TD-07: Initial Deployment

| Attribute | Value |
|-----------|-------|
| **Decision** | Ubuntu server (office network) initially |
| **Technology** | Docker + Docker Compose |
| **Migration Path** | Cloud-ready architecture |
| **Status** | ✅ APPROVED |

---

## UX/Design Decisions

### UX-01: Logo

| Attribute | Value |
|-----------|-------|
| **Decision** | NewVision Software logo |
| **File** | `New-Vision-2023.png` |
| **Tagline** | "THINK FORWARD" |
| **Status** | ✅ APPROVED |

### UX-02: Theme

| Attribute | Value |
|-----------|-------|
| **Decision** | Light theme only |
| **Rationale** | Professional, enterprise SaaS |
| **Status** | ✅ APPROVED |

### UX-03: Color Palette

| Attribute | Value |
|-----------|-------|
| **Decision** | No gaudy colors |
| **Palette** | Derived from logo - grays, muted blues, teals, orange accents |
| **Style** | Clean, professional, information-dense |
| **Status** | ✅ APPROVED |

### UX-04: Performance Priority

| Attribute | Value |
|-----------|-------|
| **Decision** | Performance is top-notch, non-negotiable |
| **Quote** | "On UX, performance should be top notch" |
| **Targets** | FCP < 1.5s, LCP < 2.5s, TTI < 3s |
| **Status** | ✅ APPROVED |

---

## Security Decisions

### SEC-01: Security Posture

| Attribute | Value |
|-----------|-------|
| **Decision** | All security requirements are MUST-HAVE |
| **Quote** | "All are must haves" |
| **Scope** | OWASP Top 10, input validation, encryption, audit |
| **Status** | ✅ APPROVED |

### SEC-02: Code Quality

| Attribute | Value |
|-----------|-------|
| **Decision** | Code quality is critical |
| **Quote** | "Code quality and code level vulnerability being zero" |
| **Status** | ✅ APPROVED |

### SEC-03: Vulnerability Tolerance

| Attribute | Value |
|-----------|-------|
| **Decision** | Zero tolerance for vulnerabilities |
| **Quote** | "Security is of utmost importance" |
| **Implementation** | Automated scanning, security review |
| **Status** | ✅ APPROVED |

---

## Process Decisions

### PR-01: Development Methodology

| Attribute | Value |
|-----------|-------|
| **Decision** | AI-led development (Cursor) |
| **Human Role** | Strategic decisions, validation, oversight |
| **AI Role** | Coding, implementation, documentation |
| **Status** | ✅ APPROVED |

### PR-02: Documentation First

| Attribute | Value |
|-----------|-------|
| **Decision** | Document all decisions before coding |
| **Quote** | "Document all of our conversation and decisions. No coding yet" |
| **Status** | ✅ CURRENT |

---

## Scope Change Decisions (Session 002 - Update)

### PD-10: Contract Management

| Attribute | Value |
|-----------|-------|
| **Decision** | Contract management is IN SCOPE |
| **Rationale** | Client→Contract→Project hierarchy is fundamental to PSA |
| **Features** | MSA/SOW CRUD, renewals, value tracking, document links |
| **Status** | ✅ APPROVED |

### PD-11: Timesheet Management

| Attribute | Value |
|-----------|-------|
| **Decision** | Timesheet management is IN SCOPE |
| **Rationale** | Not fully using PeopleStrong due to cost; need native capability |
| **Features** | Time entry, approval workflow, billable tracking, reporting |
| **Status** | ✅ APPROVED |

### PD-12: Integration API Provider

| Attribute | Value |
|-----------|-------|
| **Decision** | RMGaaS will be an API provider, not just consumer |
| **Rationale** | Other systems need resource/allocation data |
| **Capabilities** | REST API, GraphQL, Webhooks, API keys |
| **Status** | ✅ APPROVED |

### PD-13: PeopleStrong Integration

| Attribute | Value |
|-----------|-------|
| **Decision** | Integration with PeopleStrong HRMS |
| **Current State** | Active but partially subscribed (cost reasons) |
| **Direction** | Bidirectional - employee data IN, allocation data OUT |
| **Status** | ✅ APPROVED (P1) |

### PD-14: HubSpot Integration

| Attribute | Value |
|-----------|-------|
| **Decision** | Integration with HubSpot CRM |
| **Current State** | Active for deal management |
| **Direction** | Bidirectional - deals IN, availability OUT |
| **Status** | ✅ APPROVED (P1) |

---

## Decisions Pending/Deferred

| ID | Topic | Status | Notes |
|----|-------|--------|-------|
| DEF-01 | Pricing model | Deferred | Post-validation |
| DEF-02 | On-prem option | Deferred | Cloud first |
| DEF-03 | Brand colors (hex) | Pending | Derive from logo |
| DEF-04 | Multi-language | Deferred | English only v1 |
| DEF-05 | Multi-currency | Deferred | Single currency v1 |
| DEF-06 | Mobile apps | Deferred | Responsive web v1 |

---

## Decision Authority

| Decision Type | Authority |
|---------------|-----------|
| Strategic | Devarajan (Product Owner) |
| Product Features | Devarajan (Product Owner) |
| Technical Implementation | AI + Human Review |
| Security | Must-have (no compromise) |
| UX | Devarajan (Product Owner) |

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-15 | 1.0 | Initial document from strategic session |

---

*Document created from strategic deliberation session on 2025-12-15*

