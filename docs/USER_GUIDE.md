# RMGaaS User Guide

> **Resource Management & Governance as a Service**  
> A comprehensive guide for end users

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Resource Management](#resource-management)
4. [Project Management](#project-management)
5. [Allocation Management](#allocation-management)
6. [Bench Management](#bench-management)
7. [Smart Search](#smart-search)
8. [Timesheets](#timesheets)
9. [Analytics & Reports](#analytics--reports)
10. [Data Export/Import](#data-exportimport)
11. [FAQ](#faq)

---

## Getting Started

### Login

1. Navigate to the application URL (e.g., http://localhost:3000)
2. Enter your email and password
3. Click **Sign In**

**Default Credentials:**
- Email: `admin@newvision.in`
- Password: `Password123!@#`

### Navigation

The sidebar on the left provides access to all main features:

| Icon | Menu Item | Description |
|------|-----------|-------------|
| 📊 | Dashboard | Overview metrics and charts |
| 👥 | Resources | Resource management |
| 📁 | Projects | Project management |
| 📋 | Allocations | Resource-to-project assignments |
| 🏢 | Clients | Client management |
| 📄 | Contracts | Contract management |
| 💺 | Bench Analysis | Bench resources and costs |
| 🔍 | Smart Search | AI-powered resource matching |
| ⏱️ | Timesheets | Time entry and tracking |
| 📈 | Analytics | Advanced dashboards |
| 📥 | Data Management | Export/Import/Webhooks |

---

## Dashboard Overview

The dashboard provides a high-level view of your organization's resource management metrics.

### Key Metrics Cards

| Card | Description |
|------|-------------|
| **Total Resources** | Active employees and contractors |
| **Utilization Rate** | Percentage of capacity utilized |
| **Bench Count** | Resources without active allocations |
| **Active Projects** | Currently running projects |

### Charts

- **Practice Distribution**: Pie chart showing resource distribution by practice
- **Utilization Trend**: Line chart showing utilization over time
- **Recent Allocations**: Table of recent allocation changes

### Quick Actions

- View bench resources
- Check upcoming rolloffs
- See pending approvals

---

## Resource Management

### Viewing Resources

1. Click **Resources** in the sidebar
2. Use filters to narrow down the list:
   - Status (Active, Inactive, On Leave)
   - Practice
   - Location
   - Band
3. Search by name or employee ID

### Resource Profile

Click on any resource to view their profile:

- **Basic Info**: Name, email, designation, band
- **Skills**: Technical skills with proficiency levels
- **Current Allocations**: Active project assignments
- **Allocation History**: Past project assignments
- **Availability**: Current capacity percentage

### Adding a Resource

1. Click **+ Add Resource**
2. Fill in required fields:
   - Employee ID
   - First Name, Last Name
   - Email
   - Designation
   - Practice
   - Location
3. Add skills (optional)
4. Click **Save**

### Editing a Resource

1. Open the resource profile
2. Click **Edit**
3. Update fields as needed
4. Click **Save Changes**

---

## Project Management

### Viewing Projects

1. Click **Projects** in the sidebar
2. Filter by:
   - Status (Pipeline, Active, On Hold, Completed)
   - Client
   - Type (Billable, Internal)

### Project Details

Click on any project to view:

- **Overview**: Name, client, dates, budget
- **Team**: Allocated resources with roles
- **Health Status**: Green/Yellow/Red indicator
- **Staffing Status**: Fully staffed vs. needs resources

### Creating a Project

1. Click **+ New Project**
2. Enter project details:
   - Code (unique identifier)
   - Name
   - Client
   - Type
   - Start/End dates
   - Budget hours
3. Click **Create**

---

## Allocation Management

### Viewing Allocations

1. Click **Allocations** in the sidebar
2. Filter by:
   - Resource
   - Project
   - Status
   - Date range

### Creating an Allocation

1. Click **+ New Allocation**
2. Select:
   - Resource
   - Project
   - Role
   - Allocation percentage (1-100%)
   - Start and end dates
   - Billable/Non-billable
3. Click **Create**

### Managing Rolloffs

The system highlights:
- **Upcoming rolloffs**: Allocations ending in the next 30 days
- **Resources without next project**: At-risk for going to bench

---

## Bench Management

### Overview Tab

View summary metrics:
- Total resources on bench
- Monthly bench cost
- Average bench days
- Critical bench count (>60 days)

### Resources Tab

List of all bench resources with:
- Name and designation
- Days on bench (with aging indicator)
- Skills
- Quick allocate button

### Rolloffs Tab

Calendar view of upcoming rolloffs:
- Resources rolling off projects
- Next project status
- Days until bench

### Alerts Tab

Proactive warnings:
- Resources going to bench without next project
- Critical bench resources
- Cost impact alerts

### Forecast Tab

Bench projections:
- 30/60/90 day forecasts
- Expected bench count
- Projected bench cost

### Quick Allocation

1. Find a bench resource
2. Click **Quick Allocate**
3. View matching projects (sorted by skill match)
4. Select a project
5. Set allocation details
6. Click **Allocate**

---

## Smart Search

### Search Tab

Find resources by skills:

1. Select required skills
2. Set minimum proficiency level
3. Choose allocation percentage needed
4. Optionally filter by practice/location
5. Click **Search**

Results show:
- Match score (0-100)
- Matched skills
- Available capacity
- Current utilization

### Utilization Insights Tab

AI-powered recommendations:
- Current vs. target utilization
- Practice-level breakdown
- Actionable recommendations

### Skill Inventory Tab

Organization skill analysis:
- Total skills tracked
- Supply/demand balance
- Skills in shortage
- Skills with surplus

---

## Timesheets

### Weekly View

1. Select resource (defaults to yourself)
2. Navigate to the desired week
3. View/enter hours for each day

### Entering Time

For each project allocation:
1. Click on the day cell
2. Enter hours worked
3. Click **Save Draft**

### Submitting Timesheet

1. Ensure all entries are complete
2. Review daily totals
3. Click **Submit for Approval**

### Status Indicators

| Status | Meaning |
|--------|---------|
| 🔵 Draft | Not yet submitted |
| 🟡 Pending | Submitted, awaiting approval |
| 🟢 Approved | Manager approved |
| 🔴 Rejected | Needs revision |

---

## Analytics & Reports

### Executive Dashboard

High-level metrics:
- Total resources and utilization
- Bench count and cost
- Active projects and clients
- Trend charts

### Practice Dashboard

Practice-level analysis:
- Utilization by practice
- Target vs. actual comparison
- Resource distribution

### Financial Dashboard

Cost analysis:
- Bench cost breakdown
- Cost by band/practice
- Monthly projections

### Project Health

Project status overview:
- Health indicators
- Staffing status
- At-risk projects

---

## Data Export/Import

### Export Tab

Download data in CSV or JSON format:

| Export Type | Contents |
|-------------|----------|
| Resources | All resources with skills |
| Projects | All projects with team info |
| Allocations | All allocations |
| Bench Report | Bench resources with costs |
| Utilization | Utilization by resource |
| Clients | Client list |
| Skills Inventory | Skills with resource counts |

1. Select export type
2. Choose format (CSV/JSON)
3. Click **Download**

### Import Tab

Bulk import data:

1. Download template for the data type
2. Fill in the template
3. Upload the file
4. Review validation results
5. Confirm import

### Webhooks Tab

Configure event notifications:

1. Click **Add Webhook**
2. Enter webhook URL
3. Select events to subscribe to
4. Save

Available events:
- Resource created/updated/deleted
- Allocation created/updated/deleted
- Project status changes
- Timesheet submissions

---

## FAQ

### How do I reset my password?

Contact your system administrator.

### Why can't I see certain resources?

Access is based on your role and tenant. Check with your administrator.

### How is utilization calculated?

Utilization = (Total Allocated Hours / Total Capacity) × 100

### What does "On Bench" mean?

A resource is "on bench" when they have no active allocations and are available for new projects.

### How do skill proficiency levels work?

| Level | Description |
|-------|-------------|
| Beginner | Basic understanding |
| Intermediate | Working knowledge |
| Advanced | Deep expertise |
| Expert | Master-level skill |

### Can I export reports to Excel?

Yes, use the Export feature to download CSV files that can be opened in Excel.

### How do I contact support?

Email: support@newvision.in

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus search |
| `g d` | Go to Dashboard |
| `g r` | Go to Resources |
| `g p` | Go to Projects |
| `Esc` | Close modal |

---

*Last updated: December 16, 2025*

