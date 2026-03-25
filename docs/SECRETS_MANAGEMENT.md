# Secrets Management Guide

> **H-08: External Secrets Management**

## Overview

RMGaaS uses environment variables for all secrets. In production deployments, these MUST be managed through an external secrets management service — never hardcoded in files.

## Supported Secrets Managers

### 1. HashiCorp Vault (Recommended)

```bash
# Install Vault agent
apt-get install vault

# Configure template for .env generation
vault agent -config=vault-agent.hcl
```

**vault-agent.hcl example:**
```hcl
auto_auth {
  method "approle" {
    config = {
      role_id_file_path   = "/etc/vault/role-id"
      secret_id_file_path = "/etc/vault/secret-id"
    }
  }
}

template {
  source      = "/etc/vault/templates/env.tpl"
  destination = "/app/.env"
}
```

### 2. AWS Secrets Manager

```bash
# Retrieve secrets at startup
aws secretsmanager get-secret-value \
  --secret-id rmgaas/production \
  --query SecretString \
  --output text > .env
```

**With ECS Task Definition:**
```json
{
  "secrets": [
    { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:region:account:secret:rmgaas/db-url" },
    { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:region:account:secret:rmgaas/jwt-secret" },
    { "name": "JWT_REFRESH_SECRET", "valueFrom": "arn:aws:secretsmanager:region:account:secret:rmgaas/jwt-refresh" },
    { "name": "COOKIE_SECRET", "valueFrom": "arn:aws:secretsmanager:region:account:secret:rmgaas/cookie-secret" },
    { "name": "PII_ENCRYPTION_KEY", "valueFrom": "arn:aws:secretsmanager:region:account:secret:rmgaas/pii-key" }
  ]
}
```

### 3. Azure Key Vault

```bash
# Using Azure CLI
az keyvault secret show --name "rmgaas-db-url" --vault-name "rmgaas-prod" --query value -o tsv
```

### 4. Kubernetes Secrets (with encryption at rest)

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: rmgaas-secrets
  namespace: production
type: Opaque
data:
  DATABASE_URL: <base64-encoded>
  JWT_SECRET: <base64-encoded>
  JWT_REFRESH_SECRET: <base64-encoded>
  COOKIE_SECRET: <base64-encoded>
  PII_ENCRYPTION_KEY: <base64-encoded>
  REDIS_PASSWORD: <base64-encoded>
```

**Enable encryption at rest:**
```yaml
# /etc/kubernetes/encryption-config.yaml
apiVersion: apiserver.config.k8s.io/v1
kind: EncryptionConfiguration
resources:
  - resources: [secrets]
    providers:
      - aescbc:
          keys:
            - name: key1
              secret: <base64-encoded-key>
      - identity: {}
```

## Required Secrets

| Secret | Purpose | Rotation Frequency |
|--------|---------|-------------------|
| `DATABASE_URL` | PostgreSQL connection | On compromise |
| `JWT_SECRET` | Access token signing | 90 days |
| `JWT_REFRESH_SECRET` | Refresh token signing | 90 days |
| `COOKIE_SECRET` | Signed cookie secret | 90 days |
| `REDIS_PASSWORD` | Redis authentication | 90 days |
| `PII_ENCRYPTION_KEY` | PII field encryption | Annually |
| `MICROSOFT_CLIENT_SECRET` | Microsoft SSO | Per provider policy |

## Secret Rotation Procedure

1. Generate new secret value
2. Update in secrets manager
3. Deploy application with new secret
4. Verify application health
5. Invalidate old secret (if applicable)
6. For JWT secrets: existing tokens remain valid until expiry

## Security Checklist

- [ ] No secrets in source code or Git history
- [ ] No secrets in Docker images
- [ ] Secrets encrypted at rest in secrets manager
- [ ] Access to secrets manager is RBAC-controlled
- [ ] Secret access is audited
- [ ] Rotation policy is automated where possible
- [ ] `.env` files are in `.gitignore`
- [ ] CI/CD pipeline uses secrets manager, not env files
