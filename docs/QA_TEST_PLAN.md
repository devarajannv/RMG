# RMGaaS Quality Assurance Test Plan

> Comprehensive testing strategy for production readiness
> 
> **Last Updated:** December 17, 2025

---

## Current Test Implementation Status

| Category | Implemented | Status |
|----------|-------------|--------|
| Backend API Tests | 889 | ✅ Complete |
| Frontend UI Tests | 204 | ✅ Complete |
| **Total** | **1,093** | **100% Passing** |

---

## Test Categories

1. **Unit Tests** - Individual function/service testing
2. **Integration Tests** - API endpoint testing
3. **End-to-End Tests** - Full user flow testing
4. **Security Tests** - OWASP Top 10 verification
5. **Edge Case Tests** - Boundary and error conditions
6. **Performance Tests** - Load and stress testing
7. **Data Flow Audit** - Data integrity verification

---

## 1. Unit Tests (Service Layer)

### Auth Service Tests
| Test Case | Description | Edge Cases |
|-----------|-------------|------------|
| `login_valid_credentials` | Login with correct email/password | ✅ Implemented |
| `login_invalid_email` | Login with non-existent email | ✅ Implemented |
| `login_invalid_password` | Login with wrong password | ✅ Implemented |
| `login_inactive_user` | Login with deactivated account | ✅ Implemented |
| `login_inactive_tenant` | Login when tenant is suspended | ✅ Implemented |
| `refresh_valid_token` | Refresh with valid refresh token | ✅ Implemented |
| `refresh_expired_token` | Refresh with expired token | 🔴 Needed |
| `refresh_revoked_token` | Refresh with revoked token | 🔴 Needed |
| `password_complexity` | Validate password requirements | ✅ Implemented |
| `email_format_validation` | Validate email format | ✅ Implemented |
| `sql_injection_email` | SQL injection in email field | 🔴 Needed |
| `rate_limit_login` | Rate limiting on login attempts | 🔴 Needed |

### Resource Service Tests
| Test Case | Description | Edge Cases |
|-----------|-------------|------------|
| `create_resource_valid` | Create resource with valid data | 🔴 Needed |
| `create_resource_duplicate_email` | Duplicate email rejection | 🔴 Needed |
| `create_resource_duplicate_empid` | Duplicate employee ID | 🔴 Needed |
| `create_resource_missing_required` | Missing required fields | 🔴 Needed |
| `update_resource_not_found` | Update non-existent resource | 🔴 Needed |
| `delete_resource_with_allocations` | Delete resource with active allocations | 🔴 Needed |
| `get_resource_wrong_tenant` | Cross-tenant access attempt | 🔴 Needed |
| `list_resources_pagination` | Pagination boundary tests | 🔴 Needed |
| `list_resources_invalid_page` | Page number < 0 or > max | 🔴 Needed |
| `search_sql_injection` | SQL injection in search | 🔴 Needed |

### Allocation Service Tests
| Test Case | Description | Edge Cases |
|-----------|-------------|------------|
| `create_allocation_valid` | Valid allocation creation | 🔴 Needed |
| `create_allocation_over_100` | Allocation > 100% | 🔴 Needed |
| `create_allocation_overlap` | Overlapping date ranges | 🔴 Needed |
| `create_allocation_past_date` | Start date in past | 🔴 Needed |
| `create_allocation_end_before_start` | End date before start | 🔴 Needed |
| `create_allocation_inactive_resource` | Allocate inactive resource | 🔴 Needed |
| `create_allocation_completed_project` | Allocate to completed project | 🔴 Needed |
| `update_allocation_percentage` | Change allocation % | 🔴 Needed |
| `delete_allocation_active` | Delete active allocation | 🔴 Needed |

### Project Service Tests
| Test Case | Description | Edge Cases |
|-----------|-------------|------------|
| `create_project_valid` | Valid project creation | 🔴 Needed |
| `create_project_duplicate_code` | Duplicate project code | 🔴 Needed |
| `create_project_invalid_dates` | End before start date | 🔴 Needed |
| `update_project_status_flow` | Valid status transitions | 🔴 Needed |
| `update_project_invalid_status` | Invalid status transition | 🔴 Needed |
| `delete_project_with_allocations` | Delete with active allocations | 🔴 Needed |

### Intelligence Service Tests
| Test Case | Description | Edge Cases |
|-----------|-------------|------------|
| `match_no_skills` | Search with no skills specified | ✅ Implemented |
| `match_nonexistent_skill` | Search for skill not in DB | 🔴 Needed |
| `match_no_available_resources` | No resources match criteria | ✅ Implemented |
| `match_all_resources_busy` | All resources at 100% | 🔴 Needed |
| `skill_gap_no_allocations` | Project with no team | 🔴 Needed |
| `utilization_no_resources` | Empty resource pool | 🔴 Needed |

### Export Service Tests
| Test Case | Description | Edge Cases |
|-----------|-------------|------------|
| `export_resources_csv` | CSV export format | ✅ Implemented |
| `export_resources_json` | JSON export format | ✅ Implemented |
| `export_empty_dataset` | Export with no data | 🔴 Needed |
| `export_large_dataset` | Export 10,000+ records | 🔴 Needed |
| `export_special_characters` | Data with commas, quotes | 🔴 Needed |
| `export_unicode` | Unicode characters in data | 🔴 Needed |

### Import Service Tests
| Test Case | Description | Edge Cases |
|-----------|-------------|------------|
| `import_valid_csv` | Valid CSV import | ✅ Implemented |
| `import_missing_columns` | CSV missing required columns | ✅ Implemented |
| `import_invalid_data` | Invalid data types | ✅ Implemented |
| `import_empty_file` | Empty CSV file | 🔴 Needed |
| `import_malformed_csv` | Malformed CSV syntax | 🔴 Needed |
| `import_duplicate_handling` | Duplicate records | ✅ Implemented |
| `import_large_file` | 10,000+ row import | 🔴 Needed |
| `import_special_chars` | Special characters in data | 🔴 Needed |

---

## 2. Integration Tests (API Endpoints)

### Authentication Endpoints
| Endpoint | Test Cases |
|----------|------------|
| `POST /auth/login` | Valid login, invalid credentials, rate limiting, SQL injection |
| `POST /auth/logout` | Valid logout, invalid token, already logged out |
| `POST /auth/refresh` | Valid refresh, expired token, invalid token |
| `GET /auth/me` | Valid token, expired token, no token |

### Resource Endpoints
| Endpoint | Test Cases |
|----------|------------|
| `GET /resources` | Pagination, filtering, sorting, tenant isolation |
| `GET /resources/:id` | Valid ID, invalid ID, wrong tenant |
| `POST /resources` | Valid data, validation errors, duplicates |
| `PATCH /resources/:id` | Partial update, not found, invalid data |
| `DELETE /resources/:id` | Soft delete, cascade handling |

### Allocation Endpoints
| Endpoint | Test Cases |
|----------|------------|
| `GET /allocations` | Filters, date ranges, resource filter |
| `POST /allocations` | Valid allocation, conflicts, over-allocation |
| `PATCH /allocations/:id` | Update percentage, dates, status |
| `DELETE /allocations/:id` | Delete active, completed |

### Export/Import Endpoints
| Endpoint | Test Cases |
|----------|------------|
| `GET /export/resources` | CSV, JSON, empty result |
| `POST /import/resources` | Valid, invalid, duplicate handling |
| `POST /import/validate` | Validation only mode |
| `GET /import/template/:type` | Template download |

---

## 3. End-to-End Test Scenarios

### Scenario 1: Resource Lifecycle
```
1. Create resource with skills
2. View resource in list
3. Add allocation to project
4. Update resource designation
5. Check utilization in dashboard
6. Remove from project (rolloff)
7. Verify appears on bench
8. Deactivate resource
```

### Scenario 2: Project Staffing
```
1. Create client
2. Create contract under client
3. Create project under contract
4. Use Smart Search to find resources
5. Create allocations
6. Update project status to Active
7. Verify team composition
8. Export project report
```

### Scenario 3: Timesheet Flow
```
1. Login as resource
2. View weekly timesheet
3. Enter hours for projects
4. Save as draft
5. Submit for approval
6. Login as manager
7. Approve timesheet
8. Verify in reports
```

### Scenario 4: Bench Management
```
1. Resource completes project
2. Verify appears on bench
3. Check bench days calculation
4. View in bench alerts
5. Use quick allocate
6. Verify removed from bench
```

### Scenario 5: Import/Export Cycle
```
1. Export resources to CSV
2. Modify CSV externally
3. Import modified CSV
4. Verify changes applied
5. Export again
6. Compare with original
```

---

## 4. Security Tests (OWASP Top 10)

### A01: Broken Access Control
| Test | Description |
|------|-------------|
| Tenant Isolation | User A cannot access Tenant B data |
| Role Enforcement | User role restrictions enforced |
| Direct Object Reference | Cannot access resources by guessing IDs |
| API Authorization | All endpoints require valid token |
| Privilege Escalation | Cannot modify own role |

### A02: Cryptographic Failures
| Test | Description |
|------|-------------|
| Password Storage | Passwords hashed with Argon2 |
| Token Security | JWTs properly signed |
| HTTPS Enforcement | HTTP redirects to HTTPS |
| Sensitive Data Exposure | No passwords in logs |

### A03: Injection
| Test | Description |
|------|-------------|
| SQL Injection | Parameterized queries |
| NoSQL Injection | N/A (using SQL) |
| XSS Prevention | Input sanitization |
| Command Injection | No shell commands from input |

### A04: Insecure Design
| Test | Description |
|------|-------------|
| Rate Limiting | Login attempts limited |
| Input Validation | All inputs validated |
| Error Messages | No stack traces to client |

### A05: Security Misconfiguration
| Test | Description |
|------|-------------|
| Security Headers | HSTS, X-Frame-Options, etc. |
| Default Credentials | No default passwords |
| Debug Mode | Disabled in production |
| Directory Listing | Disabled |

### A07: Authentication Failures
| Test | Description |
|------|-------------|
| Brute Force | Rate limiting on login |
| Weak Passwords | Complexity requirements |
| Session Fixation | New session on login |
| Token Expiry | Tokens expire appropriately |

---

## 5. Edge Case Matrix

### Numeric Boundaries
| Field | Test Values |
|-------|-------------|
| `allocation.percentage` | 0, 1, 50, 100, 101, -1, 999 |
| `resource.capacity` | 0, 1, 100, 150, -1 |
| `pagination.page` | 0, 1, 999999, -1, "abc" |
| `pagination.limit` | 0, 1, 100, 1000, -1 |

### String Boundaries
| Field | Test Values |
|-------|-------------|
| `resource.firstName` | "", "a", 100 chars, 1000 chars |
| `resource.email` | valid, invalid, SQL injection |
| `project.code` | "", duplicates, special chars |

### Date Boundaries
| Field | Test Values |
|-------|-------------|
| `allocation.startDate` | past, today, future, null |
| `allocation.endDate` | before start, same as start, null |
| `project.startDate` | far past (1900), far future (2100) |

### Null/Empty Handling
| Scenario | Expected Behavior |
|----------|-------------------|
| Required field null | Validation error |
| Optional field null | Default value applied |
| Empty string vs null | Treated consistently |
| Empty array | Handled gracefully |

### Concurrent Operations
| Scenario | Expected Behavior |
|----------|-------------------|
| Simultaneous resource updates | Last write wins or conflict error |
| Parallel allocation creation | Over-allocation detection |
| Concurrent imports | Transaction isolation |

---

## 6. Data Flow Audit Points

### Input Validation
```
User Input → API Controller → Zod Validation → Service → Prisma → Database
```

Audit:
- [ ] All inputs pass through Zod schemas
- [ ] No raw user input reaches database
- [ ] Type coercion handled correctly

### Authentication Flow
```
Login Request → Validate Credentials → Generate JWT → Set Cookie → Return Token
```

Audit:
- [ ] Password never logged
- [ ] Token contains minimal claims
- [ ] Refresh token stored securely

### Data Retrieval Flow
```
API Request → Authenticate → Authorize → Service → Prisma (with tenantId) → Response
```

Audit:
- [ ] TenantId filter on all queries
- [ ] Sensitive fields excluded from response
- [ ] Pagination prevents full table dumps

### Export Flow
```
Export Request → Auth Check → Query Data → Format (CSV/JSON) → Stream Response
```

Audit:
- [ ] Large exports handled via streaming
- [ ] No memory issues with big datasets
- [ ] Sensitive data marked appropriately

---

## 7. Test Execution Checklist

### Pre-Test Setup
- [ ] Fresh database with seed data
- [ ] All services running
- [ ] Test user accounts ready
- [ ] Network access verified

### Functional Tests
- [ ] All CRUD operations work
- [ ] All navigation works
- [ ] All forms validate correctly
- [ ] All exports download properly
- [ ] All imports process correctly

### Security Tests
- [ ] Cross-tenant access blocked
- [ ] Invalid tokens rejected
- [ ] Rate limiting working
- [ ] SQL injection blocked
- [ ] XSS prevented

### Performance Tests
- [ ] Page loads < 3 seconds
- [ ] API responses < 500ms
- [ ] Large exports complete
- [ ] Concurrent users handled

---

## 8. Test Results Template

```markdown
## Test Run: [DATE]

### Summary
- Total Tests: XX
- Passed: XX
- Failed: XX
- Skipped: XX

### Failed Tests
| Test | Expected | Actual | Severity |
|------|----------|--------|----------|

### Issues Found
| Issue | Description | Severity | Status |
|-------|-------------|----------|--------|

### Recommendations
1. ...
2. ...
```

---

*Test plan created: December 16, 2025*

