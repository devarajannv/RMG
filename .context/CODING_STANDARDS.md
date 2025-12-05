# RMGaaS - Coding Standards

> **All code must follow these standards. AI assistants must enforce these rules.**
> **No exceptions without ADR approval.**

---

## Table of Contents

1. [General Principles](#general-principles)
2. [TypeScript Standards](#typescript-standards)
3. [React Standards](#react-standards)
4. [API Standards](#api-standards)
5. [Database Standards](#database-standards)
6. [Testing Standards](#testing-standards)
7. [Git Standards](#git-standards)
8. [Documentation Standards](#documentation-standards)
9. [Security Standards](#security-standards)
10. [Performance Standards](#performance-standards)

---

## General Principles

### Code Philosophy

```
1. CLARITY over cleverness
2. EXPLICIT over implicit
3. SIMPLE over complex
4. CONSISTENT over novel
5. TESTED over trusted
```

### File Organization

```
src/
├── client/                    # Frontend React application
│   ├── components/           # Reusable UI components
│   │   ├── ui/              # Base UI components (buttons, inputs)
│   │   ├── features/        # Feature-specific components
│   │   └── layouts/         # Page layouts
│   ├── pages/               # Route pages
│   ├── hooks/               # Custom React hooks
│   ├── services/            # API client services
│   ├── stores/              # State management
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   └── styles/              # Global styles
│
├── server/                    # Backend Node.js application
│   ├── api/                 # API routes and controllers
│   │   ├── routes/          # Express routes
│   │   ├── controllers/     # Request handlers
│   │   └── middleware/      # Express middleware
│   ├── services/            # Business logic
│   ├── repositories/        # Data access layer
│   ├── models/              # Prisma models (generated)
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   └── config/              # Configuration
│
├── shared/                    # Shared between client and server
│   ├── types/               # Shared TypeScript types
│   ├── constants/           # Shared constants
│   └── validation/          # Shared validation schemas
│
└── database/                  # Database related
    ├── migrations/          # Prisma migrations
    ├── seeds/               # Seed data
    └── schema.prisma        # Database schema
```

---

## TypeScript Standards

### Strict Mode Required

```typescript
// tsconfig.json MUST have:
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Naming Conventions

```typescript
// ✅ CORRECT
interface ResourceAllocation { }     // PascalCase for interfaces/types
type AllocationStatus = 'active';    // PascalCase for type aliases
enum ProjectType { }                 // PascalCase for enums
const MAX_ALLOCATION = 100;          // SCREAMING_SNAKE for constants
const resourceCount = 5;             // camelCase for variables
function calculateUtilization() { }  // camelCase for functions
class ResourceService { }            // PascalCase for classes

// ❌ WRONG
interface resource_allocation { }    // No snake_case
type allocation_status = 'active';   // No snake_case
const ResourceCount = 5;             // No PascalCase for variables
```

### Type Definitions

```typescript
// ✅ CORRECT - Explicit types for function signatures
function getAllocations(resourceId: string, options?: GetAllocationsOptions): Promise<Allocation[]> {
  // ...
}

// ✅ CORRECT - Use interface for objects
interface Resource {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  practiceId: string;
  status: ResourceStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ✅ CORRECT - Use type for unions/intersections
type ResourceStatus = 'active' | 'inactive' | 'on-leave' | 'exited';
type ResourceWithSkills = Resource & { skills: Skill[] };

// ❌ WRONG - No 'any' type
function processData(data: any) { }  // NEVER use any

// ✅ CORRECT - Use 'unknown' and narrow
function processData(data: unknown) {
  if (isResource(data)) {
    // data is now typed as Resource
  }
}
```

### Null Handling

```typescript
// ✅ CORRECT - Explicit null checks
function getResourceName(resource: Resource | null): string {
  if (!resource) {
    return 'Unknown';
  }
  return resource.fullName;
}

// ✅ CORRECT - Optional chaining with fallback
const managerName = resource?.manager?.fullName ?? 'Unassigned';

// ❌ WRONG - Non-null assertion without validation
const name = resource!.fullName;  // AVOID ! operator
```

### Error Handling

```typescript
// ✅ CORRECT - Custom error classes
export class ResourceNotFoundError extends Error {
  constructor(public readonly resourceId: string) {
    super(`Resource not found: ${resourceId}`);
    this.name = 'ResourceNotFoundError';
  }
}

// ✅ CORRECT - Type-safe error handling
try {
  await resourceService.getById(id);
} catch (error) {
  if (error instanceof ResourceNotFoundError) {
    // Handle specific error
  }
  throw error; // Re-throw unknown errors
}
```

---

## React Standards

### Component Structure

```typescript
// ✅ CORRECT - Functional components with TypeScript
interface ResourceCardProps {
  resource: Resource;
  onSelect?: (resource: Resource) => void;
  isSelected?: boolean;
}

export function ResourceCard({ 
  resource, 
  onSelect, 
  isSelected = false 
}: ResourceCardProps) {
  // 1. Hooks at the top
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: skills } = useResourceSkills(resource.id);
  
  // 2. Derived state / computations
  const utilizationColor = getUtilizationColor(resource.utilization);
  
  // 3. Event handlers
  const handleClick = useCallback(() => {
    onSelect?.(resource);
  }, [onSelect, resource]);
  
  // 4. Effects (minimize these)
  useEffect(() => {
    // Side effects here
  }, [dependency]);
  
  // 5. Early returns for edge cases
  if (!resource) {
    return null;
  }
  
  // 6. Main render
  return (
    <Card onClick={handleClick} className={cn(isSelected && 'border-primary')}>
      {/* JSX content */}
    </Card>
  );
}
```

### File Naming

```
# Components
ResourceCard.tsx           # PascalCase for component files
ResourceCard.test.tsx      # Test file alongside component
ResourceCard.stories.tsx   # Storybook file alongside component
index.ts                   # Re-export from index

# Hooks
useResourceAllocation.ts   # camelCase with 'use' prefix

# Utils
formatDate.ts              # camelCase for utility files

# Types
resource.types.ts          # kebab-case with .types suffix
```

### State Management

```typescript
// ✅ CORRECT - Server state with TanStack Query
export function useResources(filters: ResourceFilters) {
  return useQuery({
    queryKey: ['resources', filters],
    queryFn: () => resourceApi.getAll(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ✅ CORRECT - Client state with Zustand
interface AllocationStore {
  selectedResourceId: string | null;
  setSelectedResource: (id: string | null) => void;
}

export const useAllocationStore = create<AllocationStore>((set) => ({
  selectedResourceId: null,
  setSelectedResource: (id) => set({ selectedResourceId: id }),
}));

// ❌ WRONG - Don't use useState for server data
const [resources, setResources] = useState<Resource[]>([]);
useEffect(() => {
  fetchResources().then(setResources);
}, []);
```

### Component Props

```typescript
// ✅ CORRECT - Destructure props, provide defaults
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  onClick,
}: ButtonProps) {
  // ...
}

// ❌ WRONG - Inline default props
export function Button(props: ButtonProps) {
  const variant = props.variant || 'primary'; // Don't do this
}
```

---

## API Standards

### Route Structure

```typescript
// Routes follow REST conventions
// /api/v1/{resource}

GET    /api/v1/resources              // List all
GET    /api/v1/resources/:id          // Get one
POST   /api/v1/resources              // Create
PUT    /api/v1/resources/:id          // Full update
PATCH  /api/v1/resources/:id          // Partial update
DELETE /api/v1/resources/:id          // Delete

// Nested resources
GET    /api/v1/resources/:id/allocations    // Resource's allocations
POST   /api/v1/resources/:id/allocations    // Create allocation for resource

// Actions (when REST doesn't fit)
POST   /api/v1/resources/:id/actions/deactivate
POST   /api/v1/allocations/:id/actions/approve
```

### Request/Response Format

```typescript
// ✅ CORRECT - Consistent response format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
  meta?: {
    page?: number;
    pageSize?: number;
    totalCount?: number;
    totalPages?: number;
  };
}

// Success response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource with ID 'abc123' not found",
    "details": null
  }
}

// Validation error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "email": ["Invalid email format"],
      "allocationPercentage": ["Must be between 0 and 100"]
    }
  }
}
```

### Controller Pattern

```typescript
// ✅ CORRECT - Controller with proper error handling
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = parseResourceFilters(req.query);
      const resources = await this.resourceService.findAll(filters);
      
      return res.json({
        success: true,
        data: resources.items,
        meta: {
          page: filters.page,
          pageSize: filters.pageSize,
          totalCount: resources.totalCount,
          totalPages: Math.ceil(resources.totalCount / filters.pageSize),
        },
      });
    } catch (error) {
      next(error); // Pass to error middleware
    }
  }
}
```

### Input Validation

```typescript
// ✅ CORRECT - Zod schema validation
import { z } from 'zod';

export const createResourceSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  practiceId: z.string().uuid('Invalid practice ID'),
  role: z.enum(['developer', 'lead', 'manager', 'architect']),
  startDate: z.string().datetime(),
});

export type CreateResourceInput = z.infer<typeof createResourceSchema>;

// Use in route
router.post('/resources', 
  validateBody(createResourceSchema),
  resourceController.create
);
```

---

## Database Standards

### Schema Conventions

```prisma
// ✅ CORRECT - Prisma schema conventions

model Resource {
  id            String   @id @default(uuid())
  employeeId    String   @unique @map("employee_id")
  fullName      String   @map("full_name")
  email         String   @unique
  practiceId    String   @map("practice_id")
  status        ResourceStatus @default(ACTIVE)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")
  
  // Relations
  practice      Practice @relation(fields: [practiceId], references: [id])
  allocations   Allocation[]
  skills        ResourceSkill[]
  
  @@map("resources")
  @@index([practiceId])
  @@index([status])
}

enum ResourceStatus {
  ACTIVE
  INACTIVE
  ON_LEAVE
  EXITED
}
```

### Naming Rules

```
Tables:         snake_case, plural (resources, allocations)
Columns:        snake_case (employee_id, full_name)
Primary Keys:   id (UUID)
Foreign Keys:   {table}_id (resource_id, project_id)
Timestamps:     created_at, updated_at, deleted_at
Booleans:       is_active, has_skills, can_edit
Indexes:        idx_{table}_{columns}
```

### Query Patterns

```typescript
// ✅ CORRECT - Repository pattern
export class ResourceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Resource | null> {
    return this.prisma.resource.findUnique({
      where: { id },
      include: {
        practice: true,
        skills: {
          include: { skill: true }
        }
      }
    });
  }

  async findAll(filters: ResourceFilters): Promise<PaginatedResult<Resource>> {
    const where = this.buildWhereClause(filters);
    
    const [items, totalCount] = await Promise.all([
      this.prisma.resource.findMany({
        where,
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.resource.count({ where }),
    ]);

    return { items, totalCount };
  }
}
```

---

## Testing Standards

### Test File Location

```
src/
├── client/
│   └── components/
│       └── ResourceCard/
│           ├── ResourceCard.tsx
│           ├── ResourceCard.test.tsx    # Unit tests alongside
│           └── index.ts
│
└── server/
    └── services/
        └── ResourceService.ts
        └── ResourceService.test.ts      # Unit tests alongside

tests/                                    # Integration/E2E tests
├── integration/
│   └── api/
│       └── resources.test.ts
└── e2e/
    └── allocation-flow.test.ts
```

### Test Naming

```typescript
// ✅ CORRECT - Descriptive test names
describe('ResourceService', () => {
  describe('findById', () => {
    it('should return resource when found', async () => {});
    it('should return null when resource does not exist', async () => {});
    it('should include related skills when requested', async () => {});
  });
  
  describe('create', () => {
    it('should create resource with valid input', async () => {});
    it('should throw ValidationError when email is invalid', async () => {});
    it('should throw ConflictError when employee ID already exists', async () => {});
  });
});
```

### Test Coverage Requirements

```
- Unit tests: > 80% coverage
- Critical paths: 100% coverage
- API endpoints: Integration tests required
- User flows: E2E tests for critical paths
```

---

## Git Standards

### Branch Naming

```
main                    # Production-ready code
develop                 # Integration branch
feature/A001-auth       # Feature branches (task ID + description)
bugfix/B012-login       # Bug fixes
hotfix/urgent-fix       # Production hotfixes
release/v1.2.0          # Release branches
```

### Commit Messages

```
<type>(<scope>): <subject>

[optional body]

[optional footer]

# Types
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, no code change
refactor: Code change, no feature/fix
perf:     Performance improvement
test:     Adding tests
chore:    Maintenance tasks

# Examples
feat(allocation): add drag-and-drop allocation UI

- Implemented DnD with react-beautiful-dnd
- Added conflict detection on drop
- Updated allocation API to handle reorder

Refs: .specs/features/allocation-dnd.md
ADR: ADR-012

fix(auth): prevent session expiry during active use

- Implemented token refresh on API calls
- Added 5-minute buffer before expiry

Fixes: #123
```

### PR Requirements

```markdown
## PR Checklist

- [ ] Code follows coding standards
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Context files updated (.context/)
- [ ] No console.log or debug code
- [ ] No hardcoded secrets
- [ ] ctx-merge-check passes
- [ ] Reviewed by at least 1 team member
```

---

## Security Standards

### Authentication

```typescript
// ✅ CORRECT - JWT with refresh tokens
// Access token: 15 minutes
// Refresh token: 7 days

// Never store tokens in localStorage
// Use httpOnly cookies for refresh token
// Store access token in memory only
```

### Input Validation

```typescript
// ✅ CORRECT - Validate ALL inputs
// Server-side validation is MANDATORY
// Client-side validation is for UX only

// Sanitize outputs to prevent XSS
import { escape } from 'lodash';
const safeHtml = escape(userInput);
```

### Secrets Management

```typescript
// ❌ NEVER commit secrets
// ❌ NEVER hardcode API keys
// ❌ NEVER log sensitive data

// ✅ Use environment variables
const dbUrl = process.env.DATABASE_URL;

// ✅ Use .env.example for documentation
// DATABASE_URL=postgresql://user:pass@host:5432/db
```

---

## Performance Standards

### Frontend

```typescript
// ✅ CORRECT - Lazy load routes
const Dashboard = lazy(() => import('./pages/Dashboard'));

// ✅ CORRECT - Memoize expensive components
const ResourceList = memo(function ResourceList({ resources }) {
  return resources.map(r => <ResourceCard key={r.id} resource={r} />);
});

// ✅ CORRECT - Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';
```

### Backend

```typescript
// ✅ CORRECT - Pagination is MANDATORY for list endpoints
// Default: 20 items
// Max: 100 items

// ✅ CORRECT - Use database indexes for filtered columns
// ✅ CORRECT - Cache frequently accessed data in Redis
// ✅ CORRECT - Use connection pooling for database
```

---

## Enforcement

These standards are enforced by:

1. **ESLint** - Code style and patterns
2. **Prettier** - Formatting
3. **TypeScript** - Type safety
4. **Husky** - Pre-commit hooks
5. **PR Review** - Human verification
6. **AI Assistants** - Must follow and enforce

---

*Last Updated: 2025-12-06*
*Version: 1.0*
