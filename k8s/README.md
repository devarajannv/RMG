# RMGaaS Kubernetes Deployment

This directory contains Kubernetes manifests for deploying RMGaaS to a Kubernetes cluster.

## Directory Structure

```
k8s/
├── base/                  # Base configurations
│   ├── namespace.yaml     # Namespace definition
│   ├── configmap.yaml     # Configuration data
│   └── secrets.yaml       # Secret references (use external secrets in production)
├── api/                   # API service manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   └── hpa.yaml           # Horizontal Pod Autoscaler
├── frontend/              # Frontend service manifests
│   ├── deployment.yaml
│   └── service.yaml
├── database/              # PostgreSQL manifests (for development/staging)
│   ├── statefulset.yaml
│   └── service.yaml
├── redis/                 # Redis manifests
│   ├── deployment.yaml
│   └── service.yaml
├── ingress/               # Ingress configurations
│   └── ingress.yaml
└── monitoring/            # Monitoring stack
    ├── prometheus/
    └── grafana/
```

## Quick Start

### Prerequisites
- Kubernetes cluster (1.24+)
- kubectl configured
- Helm 3+ (for monitoring stack)

### Deploy to Staging

```bash
# Create namespace
kubectl apply -f base/namespace.yaml

# Apply secrets (create from template first)
kubectl apply -f base/secrets.yaml

# Deploy all services
kubectl apply -f base/configmap.yaml
kubectl apply -f database/
kubectl apply -f redis/
kubectl apply -f api/
kubectl apply -f frontend/
kubectl apply -f ingress/
```

### Deploy to Production

For production, use the overlay approach with Kustomize:

```bash
kubectl apply -k overlays/production
```

## Configuration

### Environment Variables

Configure via `configmap.yaml`:
- `NODE_ENV`: Environment (production/staging)
- `API_URL`: API base URL
- `FRONTEND_URL`: Frontend URL
- `LOG_LEVEL`: Logging verbosity

### Secrets

Store sensitive data in Kubernetes secrets or use external secret management:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT signing key
- `SESSION_SECRET`: Session encryption key

### Resource Limits

Default resource configurations (adjust based on load):

| Service  | CPU Request | CPU Limit | Memory Request | Memory Limit |
|----------|-------------|-----------|----------------|--------------|
| API      | 250m        | 1000m     | 256Mi          | 1Gi          |
| Frontend | 100m        | 500m      | 128Mi          | 512Mi        |
| Redis    | 100m        | 500m      | 128Mi          | 512Mi        |
| Postgres | 250m        | 1000m     | 256Mi          | 2Gi          |

## Scaling

### Horizontal Pod Autoscaler

The API deployment includes HPA configuration:
- Min replicas: 2
- Max replicas: 10
- CPU target: 70%
- Memory target: 80%

### Manual Scaling

```bash
kubectl scale deployment rmgaas-api --replicas=5 -n rmgaas
```

## Monitoring

### Health Checks

- Liveness: `/health/live`
- Readiness: `/health/ready`

### Prometheus Metrics

Metrics endpoint: `/metrics`

Install Prometheus stack:
```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring
```

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n rmgaas
kubectl describe pod <pod-name> -n rmgaas
```

### View Logs
```bash
kubectl logs -f deployment/rmgaas-api -n rmgaas
```

### Port Forward for Debugging
```bash
kubectl port-forward svc/rmgaas-api 4000:4000 -n rmgaas
```
