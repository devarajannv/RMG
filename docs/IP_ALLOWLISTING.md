# IP Allowlisting & Geo-Blocking Guide

> **H-10: Network-Level Access Controls**

## Overview

RMGaaS supports IP allowlisting and geo-blocking at the infrastructure level to restrict access to authorized networks and geographies.

## Nginx IP Allowlisting

### Admin API Endpoints

```nginx
# In nginx.prod.conf - restrict admin APIs to office IPs
location /api/v1/admin {
    # Allow office networks
    allow 203.0.113.0/24;    # HQ office
    allow 198.51.100.0/24;   # Branch office
    allow 10.0.0.0/8;        # Internal VPN
    deny all;

    proxy_pass http://api:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

### Tenant-Specific IP Restrictions

```nginx
# Use geo module or map for tenant-specific rules
map $remote_addr $tenant_allowed {
    default 0;
    ~^203\.0\.113\. 1;   # Tenant A office
    ~^198\.51\.100\. 1;  # Tenant B office
}

server {
    location /api {
        if ($tenant_allowed = 0) {
            return 403;
        }
        proxy_pass http://api:4000;
    }
}
```

## Cloud Provider Firewall Rules

### AWS Security Groups

```bash
# Create security group for API
aws ec2 create-security-group \
  --group-name rmgaas-api-sg \
  --description "RMGaaS API access"

# Allow specific IPs
aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 443 \
  --cidr 203.0.113.0/24

# AWS WAF for geo-blocking
aws wafv2 create-ip-set \
  --name "AllowedIPs" \
  --scope REGIONAL \
  --ip-address-version IPV4 \
  --addresses "203.0.113.0/24" "198.51.100.0/24"
```

### Azure Network Security Groups

```bash
az network nsg rule create \
  --resource-group rmgaas-rg \
  --nsg-name rmgaas-nsg \
  --name allow-office \
  --priority 100 \
  --source-address-prefixes 203.0.113.0/24 \
  --destination-port-ranges 443 \
  --access Allow \
  --protocol Tcp
```

## Geo-Blocking with CloudFlare

```json
{
  "rules": [
    {
      "action": "block",
      "expression": "(ip.geoip.country ne \"US\" and ip.geoip.country ne \"IN\" and ip.geoip.country ne \"GB\")",
      "description": "Block non-allowed countries"
    }
  ]
}
```

## Application-Level IP Checking (Express Middleware)

For environments where infrastructure-level controls are not available:

```typescript
// middleware/ipAllowlist.ts
import { Request, Response, NextFunction } from 'express';

const ALLOWED_IPS = (process.env.ALLOWED_IPS || '').split(',').filter(Boolean);
const IP_ALLOWLIST_ENABLED = process.env.IP_ALLOWLIST_ENABLED === 'true';

export function ipAllowlist(req: Request, res: Response, next: NextFunction) {
  if (!IP_ALLOWLIST_ENABLED || ALLOWED_IPS.length === 0) {
    return next();
  }
  
  const clientIp = req.ip || req.socket.remoteAddress || '';
  
  if (ALLOWED_IPS.some(allowed => clientIp.startsWith(allowed))) {
    return next();
  }
  
  res.status(403).json({ error: 'Access denied' });
}
```

## Implementation Checklist

- [ ] Define allowed IP ranges per tenant
- [ ] Configure infrastructure-level firewall rules
- [ ] Add nginx IP restrictions for admin endpoints
- [ ] Set up geo-blocking rules (if required by compliance)
- [ ] Configure VPN requirements for remote access
- [ ] Test failover scenarios (blocked legitimate users)
- [ ] Document IP change request procedure
- [ ] Monitor blocked requests for false positives
- [ ] Review and update IP allowlists quarterly
