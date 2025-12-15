# RMGaaS

> **Resource Management & Governance as a Service**  
> *THINK FORWARD*

![NewVision Software](New-Vision-2023.png)

Enterprise-grade platform for managing professional services workforce allocation, utilization, and governance.

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Development Setup

```bash
# 1. Clone and install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Start database and Redis
docker-compose up -d postgres redis

# 4. Run database migrations
npm run db:migrate

# 5. Generate Prisma client
npm run db:generate

# 6. Seed sample data (optional)
npm run db:seed

# 7. Start development servers
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| API | http://localhost:4000 |
| API Health | http://localhost:4000/health |
| Prisma Studio | http://localhost:5555 |

---

## Project Structure

```
rmgaas/
├── apps/
│   ├── api/              # Backend API (Express + TypeScript)
│   │   ├── prisma/       # Database schema & migrations
│   │   └── src/
│   │       ├── config/   # Configuration
│   │       ├── lib/      # Utilities
│   │       ├── middleware/
│   │       └── modules/  # Feature modules
│   └── frontend/         # Frontend (React + Vite)
│       └── src/
│           ├── components/
│           ├── features/
│           ├── hooks/
│           ├── lib/
│           ├── pages/
│           └── stores/
├── packages/
│   └── shared/           # Shared code
│       └── src/
│           ├── schemas/  # Zod validation schemas
│           ├── types/    # TypeScript types
│           └── utils/    # Utility functions
├── docker/               # Docker configuration
├── .context/             # AI development context
└── .github/              # CI/CD workflows
```

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Build all packages |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |
| `npm run test` | Run tests |
| `npm run db:migrate` | Run database migrations |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:seed` | Seed database |
| `npm run db:studio` | Open Prisma Studio |
| `npm run docker:up` | Start Docker containers |
| `npm run docker:down` | Stop Docker containers |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite, TailwindCSS, shadcn/ui |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL 16, Prisma |
| Cache | Redis |
| Validation | Zod |
| State | TanStack Query, Zustand |

---

## Documentation

See the `.context/` directory for comprehensive documentation:

- [MASTER_CONTEXT.md](.context/MASTER_CONTEXT.md) - Project overview
- [FEATURE_SCOPE.md](.context/FEATURE_SCOPE.md) - Feature scope
- [TECH_STACK.md](.context/TECH_STACK.md) - Technology details
- [DATA_MODEL.md](.context/DATA_MODEL.md) - Database schema
- [API_CONTRACTS.md](.context/API_CONTRACTS.md) - API specifications

---

## License

UNLICENSED - Proprietary software of NewVision Software Pvt. Ltd.

---

*Built with ❤️ by NewVision Software*
