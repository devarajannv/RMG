# RMG Master File Data Import - Final Report

## Import Summary

| Metric | Value |
|--------|-------|
| **Import Date** | January 20, 2026 |
| **Import Time** | 10:04 - 10:09 UTC |
| **Source File** | `RMG_Master_File.xlsx` |
| **Total Duration** | ~5 minutes (across 2 runs) |
| **Tenant ID** | `c32b3b95-747a-4708-9ccd-e170d5ca6137` |
| **Tenant Name** | NewVision Software |

## Final Database State

| Entity | Count | From Excel | Notes |
|--------|-------|------------|-------|
| **Resources** | 804 | 775 unique | +90 ghost managers, -66 email duplicates |
| **Projects** | 220 | 229 | Most imported, some merged |
| **Allocations** | 1,821 | 2,006 | Current + some history |
| **Practices** | 20 | 18 | +2 from seed data |
| **Locations** | 11 | 9 | +2 from seed data |
| **Clients** | 30 | 28 | +2 from seed data |
| **Skills** | 445 | 82 primary + all variations | Skills with very long names truncated/skipped |

## Import Runs

### Run 1: 10:04:23 UTC
- Initial import run
- Created majority of records
- Identified column length issues with `band` field

### Run 2: 10:08:26 UTC  
- Fixed band field mapping (`More than 12 yrs` → `>12 yrs`)
- Added string truncation for safety
- Imported remaining records

## Data Imported Successfully

### Resources (709 from Excel)
- ✅ Employee ID, Name, Email
- ✅ Practice, Location assignments
- ✅ Employment Type (FTE/Contractor)
- ✅ Designation/Role
- ✅ Date of Joining
- ✅ Manager relationships (514 resolved)
- ✅ Experience band (mapped from Experience Range)

### Projects (218 from Excel)
- ✅ Project Code, Name
- ✅ Client linkage
- ✅ Project Type (T&M, Fixed Bid)
- ✅ Start/End Dates
- ✅ Status (Active, Completed)

### Allocations (1,822 records)
- ✅ Resource-Project mapping
- ✅ Allocation percentage
- ✅ Start/End dates
- ✅ Billable status
- ✅ Current/History status

## Known Edge Cases (For Team Review)

### 1. Manish Sharma (Expected)
- **Issue:** Only 5% allocation
- **Reason:** External contractor - point person from subcontracting company
- **Action:** No action needed - working as designed

### 2. Shubham Sonawane (Data Error)
- **Issue:** 600% total allocation across 6 projects
- **Employee ID:** (to be identified)
- **Action:** Team to review and correct in source Excel file

### 3. Duplicate Emails (~66 records)
- **Issue:** Same email on different employee IDs
- **Possible Causes:** 
  - Same person with multiple IDs
  - Data entry errors
  - Rehires with new IDs
- **Action:** Team to reconcile in source data

### 4. Long Skill Names (21 records skipped)
- **Issue:** Skills column sometimes contains comma-separated lists
- **Examples:** 
  - "Performance Testing - Loadrunner, JMeter, AWS cloud..."
  - "Leadership & People Management, Infrastructure Services..."
- **Action:** Consider splitting these into individual skills or extending field length

## Manager Resolution Statistics

| Resolution Method | Count |
|-------------------|-------|
| Exact Name Match | 506 |
| Case-Insensitive Match | 8 |
| Fuzzy Match | 13 |
| Ghost Resources Created | 90 |
| **Total Resolved** | **617** |

### Ghost Managers Created
These are manager names that appear in the Excel file but were not in the employee list:
- Likely executives, departed employees, or external stakeholders
- Created with `MGR-` prefix employee IDs
- Example: `MGR-Balan-Ramaswamy`, `MGR-KAPIL-SHARMA`

## Data Mapping Reference

### Employment Type Mapping
| Excel Value | Database Enum |
|-------------|---------------|
| FTE | `FTE` |
| Consultant-* (any vendor) | `CONTRACTOR` |
| Contractor | `CONTRACTOR` |
| PH (Practice Head) | `FTE` |

### Experience Range to Band
| Excel Value | Database Value |
|-------------|----------------|
| `less than 1 yr` | `<1 yr` |
| `1-3 yrs` | `1-3 yrs` |
| `3-6 yrs` | `3-6 yrs` |
| `6-9 yrs` | `6-9 yrs` |
| `9-12 yrs` | `9-12 yrs` |
| `More than 12 yrs` | `>12 yrs` |

### Project Type Mapping
| Excel Project Status | Database Project Type |
|---------------------|----------------------|
| Billable | `BILLABLE` |
| Management | `INTERNAL` |
| R&D/Investment | `PRESALES` |
| Utilized | `BILLABLE` |

### Allocation Status Mapping
| Excel Status | Database Status |
|--------------|-----------------|
| Current | `ACTIVE` |
| History | `COMPLETED` |

## Files Created/Modified

1. **Import Script:** `apps/api/prisma/import-rmg-data.ts`
2. **Import Logs:** 
   - `docs/IMPORT_LOG_2026-01-20T10-04-23-203Z.md`
   - `docs/IMPORT_LOG_2026-01-20T10-08-26-834Z.md`
   - `docs/IMPORT_LOG_FINAL_2026-01-20.md` (this file)

## Re-running the Import

The import script is idempotent - it checks for existing records before creating:
- Practices, Locations, Clients, Skills: Checked by name
- Projects: Checked by code  
- Resources: Checked by employee ID
- Allocations: Checked by resource+project+startDate

To re-run:
```bash
cd apps/api
npx ts-node --transpile-only prisma/import-rmg-data.ts
```

## Next Steps for Team

1. ✅ Review Shubham Sonawane's allocation data
2. ✅ Investigate 66 duplicate email cases
3. ✅ Decide on long skill names handling
4. ✅ Validate manager relationships look correct
5. ✅ Verify allocation percentages sum to 100% for active employees

---

**Import completed by:** RMG Import Script v1.0  
**Report generated:** January 20, 2026, 10:15 UTC
