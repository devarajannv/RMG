# Microsoft 365 SSO Setup Guide

This guide explains how to configure Microsoft 365 Single Sign-On (SSO) for RMGaaS.

---

## Overview

RMGaaS supports Microsoft 365 SSO, allowing users to sign in with their organizational Microsoft accounts. This provides:

- **Seamless authentication** - Users sign in with existing credentials
- **Automatic user provisioning** - New users are created automatically
- **Enterprise security** - Leverages Azure AD security features
- **MFA support** - Inherits organizational MFA policies

---

## Prerequisites

1. **Azure AD tenant** (Microsoft 365 Business/Enterprise subscription)
2. **Admin access** to Azure Portal
3. **RMGaaS deployment** with accessible callback URL

---

## Step 1: Register Application in Azure Portal

### 1.1 Access Azure Portal

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **New registration**

### 1.2 Configure Application

| Field | Value |
|-------|-------|
| **Name** | RMGaaS (or your preferred name) |
| **Supported account types** | Choose based on your needs: |
| | - *Single tenant*: Only your organization |
| | - *Multitenant*: Any Azure AD organization |
| | - *Multitenant + personal*: Any org + personal accounts |
| **Redirect URI** | Web: `https://your-domain.com/api/v1/auth/microsoft/callback` |

> **For local development**, use: `http://localhost:4000/api/v1/auth/microsoft/callback`

### 1.3 Note Application Details

After registration, note these values from the **Overview** page:

| Value | Where to Find | Environment Variable |
|-------|---------------|---------------------|
| **Application (client) ID** | Overview page | `MICROSOFT_CLIENT_ID` |
| **Directory (tenant) ID** | Overview page | `MICROSOFT_TENANT_ID` |

---

## Step 2: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `RMGaaS Production` (or similar)
4. Choose expiration (recommended: 24 months)
5. Click **Add**
6. **⚠️ COPY THE SECRET VALUE IMMEDIATELY** - it won't be shown again!

| Value | Environment Variable |
|-------|---------------------|
| Secret value | `MICROSOFT_CLIENT_SECRET` |

---

## Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `openid`
   - `profile`
   - `email`
   - `User.Read`

6. Click **Grant admin consent for [Your Organization]**

---

## Step 4: Configure Environment Variables

### Backend (apps/api/.env)

```env
# Microsoft 365 SSO Configuration
MICROSOFT_CLIENT_ID=your-application-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret-value
MICROSOFT_TENANT_ID=your-tenant-id  # or 'common' for multi-tenant

# Optional: Override redirect URI (defaults to API_URL + callback path)
MICROSOFT_REDIRECT_URI=https://your-domain.com/api/v1/auth/microsoft/callback

# Default tenant for new SSO users (get from database)
DEFAULT_TENANT_ID=your-rmgaas-tenant-uuid
```

### Frontend (apps/frontend/.env)

```env
# API URL for SSO redirect
VITE_API_URL=http://localhost:4000

# Optional: For SPA flow (not currently used)
VITE_MICROSOFT_CLIENT_ID=your-application-client-id
VITE_MICROSOFT_TENANT_ID=your-tenant-id
```

---

## Step 5: Get Default Tenant ID

RMGaaS needs to know which tenant to associate SSO users with. Get the tenant ID:

```bash
# Connect to your database and run:
SELECT id, name FROM "Tenant";
```

Copy the tenant UUID and set it as `DEFAULT_TENANT_ID`.

---

## Step 6: Test SSO Flow

### 6.1 Restart Services

```bash
# Restart API
cd apps/api && npm run dev

# Restart Frontend
cd apps/frontend && npm run dev
```

### 6.2 Test Login

1. Open `http://localhost:3000/login`
2. Click **Microsoft 365** button
3. Sign in with your Microsoft account
4. Grant permissions if prompted
5. You should be redirected back and logged in

---

## SSO Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Browser   │     │  RMGaaS API │     │  Azure AD    │     │ MS Graph    │
└──────┬──────┘     └──────┬──────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                   │                    │
       │ Click MS Login    │                   │                    │
       │──────────────────>│                   │                    │
       │                   │                   │                    │
       │   Redirect to     │                   │                    │
       │<──────────────────│                   │                    │
       │                   │                   │                    │
       │ Auth Request      │                   │                    │
       │───────────────────────────────────────>                    │
       │                   │                   │                    │
       │ Login Page        │                   │                    │
       │<───────────────────────────────────────                    │
       │                   │                   │                    │
       │ User Credentials  │                   │                    │
       │───────────────────────────────────────>                    │
       │                   │                   │                    │
       │ Auth Code + Redirect to callback      │                    │
       │<───────────────────────────────────────                    │
       │                   │                   │                    │
       │ Auth Code         │                   │                    │
       │──────────────────>│                   │                    │
       │                   │                   │                    │
       │                   │ Exchange Code     │                    │
       │                   │──────────────────>│                    │
       │                   │                   │                    │
       │                   │ Access Token      │                    │
       │                   │<──────────────────│                    │
       │                   │                   │                    │
       │                   │ Get User Info     │                    │
       │                   │─────────────────────────────────────────>
       │                   │                   │                    │
       │                   │ User Profile      │                    │
       │                   │<─────────────────────────────────────────
       │                   │                   │                    │
       │                   │ Create/Find User  │                    │
       │                   │ Generate JWT      │                    │
       │                   │                   │                    │
       │ Set Cookies + Redirect to App         │                    │
       │<──────────────────│                   │                    │
       │                   │                   │                    │
```

---

## User Provisioning

When a user signs in via Microsoft SSO:

### Existing User (by email)
- User is found by email address
- `microsoftId` is linked to their account
- Login is recorded in audit log

### Existing User (by Microsoft ID)
- User is found by Microsoft ID
- Email is updated if changed
- Login is recorded

### New User
- User account is created automatically
- Email is set from Microsoft profile
- Random secure password is generated (for fallback)
- Default "Viewer" role is assigned
- `emailVerified` is set to `true`

---

## Troubleshooting

### Error: "Microsoft SSO not configured"
- Ensure `MICROSOFT_CLIENT_ID` and `MICROSOFT_CLIENT_SECRET` are set
- Restart the API server after adding environment variables

### Error: "AADSTS50011: Reply URL does not match"
- Check redirect URI in Azure Portal matches exactly
- Include the full path: `/api/v1/auth/microsoft/callback`
- Protocol must match (http vs https)

### Error: "AADSTS700016: Application not found"
- Verify `MICROSOFT_CLIENT_ID` is correct
- Ensure application is created in the correct tenant

### Error: "AADSTS65001: User or admin has not consented"
- Go to Azure Portal → App registrations → API permissions
- Click "Grant admin consent"

### User not created / wrong tenant
- Verify `DEFAULT_TENANT_ID` is set correctly
- Check the tenant UUID exists in the database

---

## Security Considerations

1. **Keep secrets secure** - Never commit secrets to git
2. **Use HTTPS in production** - Required for secure cookie handling
3. **Rotate secrets** - Set calendar reminder before expiration
4. **Monitor sign-ins** - Check Azure AD sign-in logs
5. **Limit permissions** - Only request needed scopes

---

## Multi-Tenant Configuration

For SaaS deployments serving multiple organizations:

1. Set `MICROSOFT_TENANT_ID=common` (or `organizations`)
2. Implement tenant resolution in callback:
   - By email domain
   - By explicit tenant selection
   - By invitation link

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/microsoft/status` | GET | Check if SSO is configured |
| `/api/v1/auth/microsoft` | GET | Initiate SSO flow |
| `/api/v1/auth/microsoft/callback` | GET | OAuth callback handler |
| `/api/v1/auth/microsoft/token` | POST | Token exchange (SPA flow) |

---

## Example: Checking SSO Status

```bash
curl http://localhost:4000/api/v1/auth/microsoft/status
```

Response when configured:
```json
{
  "enabled": true,
  "provider": "Microsoft 365"
}
```

Response when not configured:
```json
{
  "enabled": false,
  "provider": "Microsoft 365"
}
```

---

*Last updated: December 16, 2025*

