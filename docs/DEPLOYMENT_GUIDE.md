# RMGaaS Deployment Guide

> Production deployment instructions for RMGaaS

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Configuration](#configuration)
4. [Deployment](#deployment)
5. [SSL/TLS Setup](#ssltls-setup)
6. [Monitoring](#monitoring)
7. [Backup & Recovery](#backup--recovery)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Server Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Storage | 50 GB SSD | 100+ GB SSD |
| OS | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### Software Requirements

- Docker 24.0+
- Docker Compose 2.20+
- Git
- OpenSSL (for certificates)

### Network Requirements

- Ports 80 and 443 accessible
- Domain name configured (e.g., rmgaas.newvision.in)
- DNS A record pointing to server IP

---

## Server Setup

### 1. Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

### 2. Clone Repository

```bash
# Create application directory
sudo mkdir -p /opt/rmgaas
sudo chown $USER:$USER /opt/rmgaas

# Clone repository
cd /opt/rmgaas
git clone https://github.com/newvision/rmgaas.git .
```

### 3. Create Required Directories

```bash
mkdir -p backups logs docker/ssl docker/nginx-logs
chmod 700 docker/ssl
```

---

## Configuration

### 1. Create Environment File

```bash
# Copy the example environment file
cp docker/env.production.example .env.production

# Edit with your values
nano .env.production
```

### 2. Required Configuration

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | Strong random string |
| `REDIS_PASSWORD` | Redis password | Strong random string |
| `JWT_SECRET` | JWT signing key | 64+ character random string |
| `JWT_REFRESH_SECRET` | Refresh token key | 64+ character random string |
| `COOKIE_SECRET` | Cookie signing key | 32+ character random string |
| `DOMAIN` | Your domain name | rmgaas.newvision.in |
| `API_URL` | Full API URL | https://api.rmgaas.newvision.in |
| `CORS_ORIGINS` | Allowed origins | https://rmgaas.newvision.in |

### 3. Generate Secure Secrets

```bash
# Generate random secrets
openssl rand -base64 48  # For JWT_SECRET
openssl rand -base64 48  # For JWT_REFRESH_SECRET
openssl rand -base64 32  # For COOKIE_SECRET
openssl rand -base64 24  # For DB_PASSWORD
openssl rand -base64 24  # For REDIS_PASSWORD
```

---

## Deployment

### Quick Deploy

```bash
# Make deploy script executable
chmod +x scripts/deploy.sh

# Initial setup
./scripts/deploy.sh setup

# Deploy application
./scripts/deploy.sh deploy
```

### Manual Deploy Steps

```bash
# 1. Build images
docker compose -f docker-compose.prod.yml --env-file .env.production build

# 2. Start services
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 3. Run migrations
docker compose -f docker-compose.prod.yml --env-file .env.production exec api \
    npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma

# 4. Verify deployment
./scripts/deploy.sh health
```

### Verify Deployment

```bash
# Check container status
docker compose -f docker-compose.prod.yml ps

# Check logs
docker compose -f docker-compose.prod.yml logs -f

# Test health endpoint
curl https://api.rmgaas.newvision.in/health
```

---

## SSL/TLS Setup

### Option 1: Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot -y

# Stop nginx temporarily
docker compose -f docker-compose.prod.yml stop nginx

# Get certificate
sudo certbot certonly --standalone \
    -d rmgaas.newvision.in \
    -d api.rmgaas.newvision.in \
    --email admin@newvision.in \
    --agree-tos

# Copy certificates
sudo cp /etc/letsencrypt/live/rmgaas.newvision.in/fullchain.pem docker/ssl/
sudo cp /etc/letsencrypt/live/rmgaas.newvision.in/privkey.pem docker/ssl/
sudo chown $USER:$USER docker/ssl/*.pem

# Restart nginx
docker compose -f docker-compose.prod.yml start nginx
```

### Auto-Renewal

```bash
# Add to crontab
echo "0 3 * * * certbot renew --quiet && docker compose -f /opt/rmgaas/docker-compose.prod.yml restart nginx" | sudo tee -a /etc/crontab
```

### Option 2: Self-Signed (Development Only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout docker/ssl/privkey.pem \
    -out docker/ssl/fullchain.pem \
    -subj "/C=IN/ST=TN/L=Chennai/O=NewVision/CN=rmgaas.newvision.in"
```

---

## Monitoring

### Health Checks

```bash
# Check all services
./scripts/deploy.sh health

# Individual service health
curl https://api.rmgaas.newvision.in/health
```

### View Logs

```bash
# All logs
./scripts/deploy.sh logs

# Specific service
./scripts/deploy.sh logs api
./scripts/deploy.sh logs postgres
./scripts/deploy.sh logs nginx
```

### Resource Usage

```bash
./scripts/deploy.sh status
```

### Log Rotation

Logs are automatically rotated by Docker (configured in docker-compose.prod.yml):
- API: max 3 files × 10MB
- Frontend: max 3 files × 5MB
- Nginx: max 5 files × 10MB

---

## Backup & Recovery

### Automated Backup

```bash
# Create backup
./scripts/deploy.sh backup

# Backups are stored in ./backups/
ls -la backups/
```

### Scheduled Backups

```bash
# Add to crontab (daily at 2 AM)
echo "0 2 * * * /opt/rmgaas/scripts/deploy.sh backup" | sudo tee -a /etc/crontab
```

### Restore from Backup

```bash
# List available backups
ls -la backups/

# Restore (will prompt for confirmation)
./scripts/deploy.sh restore backups/rmgaas_backup_20241216_020000.sql.gz
```

### Manual Backup

```bash
# Backup database only
docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U rmgaas rmgaas_prod > backup.sql

# Backup with compression
docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U rmgaas rmgaas_prod | gzip > backup.sql.gz
```

---

## Troubleshooting

### Common Issues

#### Container Won't Start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs api

# Check environment variables
docker compose -f docker-compose.prod.yml config

# Rebuild from scratch
docker compose -f docker-compose.prod.yml down -v
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

#### Database Connection Failed

```bash
# Check postgres is running
docker compose -f docker-compose.prod.yml ps postgres

# Check postgres logs
docker compose -f docker-compose.prod.yml logs postgres

# Test connection
docker compose -f docker-compose.prod.yml exec postgres psql -U rmgaas -d rmgaas_prod -c "SELECT 1"
```

#### 502 Bad Gateway

```bash
# Check if API is running
docker compose -f docker-compose.prod.yml ps api

# Check API logs
docker compose -f docker-compose.prod.yml logs api

# Check nginx logs
docker compose -f docker-compose.prod.yml logs nginx
```

#### SSL Certificate Issues

```bash
# Verify certificates exist
ls -la docker/ssl/

# Check certificate expiry
openssl x509 -in docker/ssl/fullchain.pem -text -noout | grep -A2 "Validity"

# Test SSL connection
openssl s_client -connect rmgaas.newvision.in:443
```

### Useful Commands

```bash
# Restart specific service
docker compose -f docker-compose.prod.yml restart api

# Scale API (if needed)
docker compose -f docker-compose.prod.yml up -d --scale api=2

# Enter container shell
./scripts/deploy.sh shell api

# Run Prisma commands
docker compose -f docker-compose.prod.yml exec api npx prisma studio

# Clear Docker cache
docker system prune -af
```

---

## Security Checklist

- [ ] Strong passwords for all services
- [ ] SSL/TLS certificates installed
- [ ] Firewall configured (ports 80, 443 only)
- [ ] Environment file secured (chmod 600)
- [ ] Regular backups scheduled
- [ ] Log monitoring enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Security headers enabled (via Nginx)

---

## Updates & Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
./scripts/deploy.sh deploy
```

### Update Docker Images

```bash
# Pull latest base images
docker compose -f docker-compose.prod.yml pull

# Rebuild with new base
docker compose -f docker-compose.prod.yml build --pull
docker compose -f docker-compose.prod.yml up -d
```

### Database Migrations

```bash
# Run pending migrations
docker compose -f docker-compose.prod.yml exec api \
    npx prisma migrate deploy --schema=./apps/api/prisma/schema.prisma
```

---

## Support

For issues and support:
- Email: support@newvision.in
- Documentation: /docs/
- API Reference: https://api.rmgaas.newvision.in/api-docs

---

*Last updated: December 16, 2025*

