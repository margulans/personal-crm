# Personal CRM Application

## Overview

A single-user personal CRM (Customer Relationship Management) web application designed to help manage and prioritize personal and professional contacts. The system tracks relationships through a sophisticated scoring mechanism that evaluates contacts based on their contribution and potential, assigns attention levels, and provides a "heat index" to identify which relationships need nurturing.

**Key Features:**
- Contact management with role-based categorization
- Contribution and potential scoring (0-15 scale, classified A-D)
- 10-level attention system for relationship prioritization
- Heat index analytics (green/yellow/red status) based on interaction frequency
- Interaction tracking with meaningful engagement flags
- Matrix visualization for importance vs. heat status
- Priority lists for urgent and development contacts
- **Notifications panel** showing contacts needing attention (red/yellow zones)
- **Import/Export** functionality supporting CSV and JSON formats
- **Analytics charts** with 4 visualizations (heat status, value category, importance vs status, attention distribution)
- **Bulk operations** for selecting multiple contacts and performing delete/update actions
- **Tag management** panel for adding/removing tags across multiple contacts
- **Mobile-optimized** responsive layouts and touch-friendly UI

**Technology Stack:**
- Frontend: React with TypeScript, Vite build system
- Backend: Express.js (Node.js)
- Database: PostgreSQL via Neon serverless
- ORM: Drizzle ORM
- UI: shadcn/ui components with Radix UI primitives, Tailwind CSS
- State Management: TanStack Query (React Query)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Application Type
Single-user application with no authentication system. All data belongs to one user, simplifying the data model and eliminating multi-tenancy concerns.

### Frontend Architecture

**Framework & Build:**
- React 18 with TypeScript for type safety
- Vite as the build tool and dev server
- Client-side routing via wouter (lightweight alternative to React Router)

**UI Component System:**
- shadcn/ui design system with "new-york" style variant
- Radix UI primitives for accessible component foundations
- Tailwind CSS for styling with custom design tokens
- Design philosophy: Linear/Notion-inspired productivity focus with data visualization clarity
- Typography: Inter for UI, JetBrains Mono for numerical data and scores

**State Management:**
- TanStack Query for server state management and caching
- Local component state with React hooks
- No global state management library (Redux, Zustand) - intentionally kept simple

**Key UI Patterns:**
- Card-based layouts for contact lists
- Matrix visualization for analytics (importance × heat status)
- Form-based contact creation/editing with tabbed sections
- Modal dialogs for detailed views and forms
- Responsive design with mobile sidebar toggle

### Backend Architecture

**API Design:**
- RESTful API with Express.js
- JSON request/response format
- Route organization in `server/routes.ts`
- Simple error handling with HTTP status codes

**Endpoints:**
- `GET /api/contacts` - List all contacts
- `GET /api/contacts/:id` - Get single contact
- `POST /api/contacts` - Create contact
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact
- `GET /api/contacts/:id/interactions` - Get contact interactions
- `POST /api/contacts/:id/interactions` - Create interaction
- `DELETE /api/interactions/:id` - Delete interaction
- `POST /api/contacts/:id/recalculate` - Recalculate metrics
- `POST /api/contacts/recalculate-all` - Batch recalculation
- `GET /api/export?format=csv|json` - Export contacts
- `POST /api/import` - Import contacts from CSV/JSON
- `POST /api/contacts/bulk-delete` - Delete multiple contacts
- `POST /api/contacts/bulk-update` - Update multiple contacts

**Business Logic:**
The core algorithm calculates contact priority through:
1. **Contribution Score** (0-15): Financial value, network help, tactical support, strategic influence, loyalty
2. **Potential Score** (0-15): Personal growth potential, resources, network, synergy, system role
3. **Value Category**: Combination of contribution class + potential class (e.g., "AA", "AB", "BC")
4. **Heat Index**: Formula based on days since last meaningful interaction vs. desired frequency
5. **Heat Status**: Green (healthy), Yellow (attention needed), Red (urgent)

### Data Layer

**Database:**
- PostgreSQL via Neon serverless (WebSocket-based connection)
- Drizzle ORM for type-safe database queries
- Schema-first approach with Drizzle Kit for migrations

**Data Model:**
Two main tables:

1. **contacts** - Core entity with fields:
   - Basic info: fullName, shortName, phone, email, socialLinks
   - Categorization: tags, roleTags
   - Scoring: contributionScore, potentialScore, contributionClass, potentialClass, valueCategory
   - Details: contributionDetails (JSON), potentialDetails (JSON)
   - Prioritization: importanceLevel (A/B/C), attentionLevel (1-10), desiredFrequencyDays
   - Relationship metrics: lastContactDate, responseQuality, relationshipEnergy, attentionTrend
   - Heat metrics: heatIndex, heatStatus
   - Timestamps: createdAt, updatedAt

2. **interactions** - Tracks all contact touchpoints:
   - contactId (foreign key)
   - date, type, channel
   - note (optional text)
   - isMeaningful (boolean flag for significant interactions)
   - createdAt timestamp

**Storage Pattern:**
- Repository pattern via `IStorage` interface in `server/storage.ts`
- `DatabaseStorage` class implements all CRUD operations
- Automatic metric recalculation on contact/interaction changes

### Calculation Engine

**Heat Index Formula:**
The Heat Index is calculated using a weighted formula:
- `HeatIndex = 0.4×Recency + 0.3×Energy + 0.2×ResponseQuality + 0.1×Trend`

Where:
- **Recency (R)**: `1 - (daysSinceLastContact / (2 × desiredFrequencyDays))`, clamped to 0-1
- **Energy (E)**: `(relationshipEnergy - 1) / 4`, normalized from 1-5 scale to 0-1
- **ResponseQuality (Q)**: `responseQuality / 3`, normalized from 0-3 scale to 0-1
- **Trend (T)**: Maps attentionTrend (-1, 0, 1) to (0, 0.5, 1)

**Status Thresholds:**
- Green: heatIndex >= 0.70
- Yellow: heatIndex >= 0.40 and < 0.70
- Red: heatIndex < 0.40

**Override Rules:**
- Force RED if `daysSinceLastContact > 3 × desiredFrequencyDays` (severe neglect)
- Force GREEN if `daysSinceLastContact <= 0.5 × desiredFrequencyDays` AND `relationshipEnergy >= 4` AND `responseQuality >= 2` (excellent recent engagement)

**Score Classification:**
- 12-15 points: Class A (high value)
- 8-11 points: Class B (medium value)
- 4-7 points: Class C (developing value)
- 0-3 points: Class D (low value)

**Metric Recalculation Triggers:**
- On contact save
- On meaningful interaction addition
- Manual "recalculate all" button
- Future: periodic background jobs (not yet implemented)

### File Structure

```
client/
  src/
    components/
      crm/          - Business logic components (ContactCard, ContactDetail, etc.)
      ui/           - Generic shadcn/ui components
    pages/          - Route components (ContactsPage, AnalyticsPage)
    lib/            - Utilities (API client, types, constants)
server/
  routes.ts         - API route definitions
  storage.ts        - Database repository layer
  db.ts            - Database connection setup
shared/
  schema.ts         - Drizzle ORM schema + Zod validation schemas
```

### Build & Deployment

**Development:**
- `npm run dev` - Runs Vite dev server with HMR and Express API server
- Hot module replacement for instant feedback
- Replit-specific plugins for runtime error overlays and dev banners

**Production:**
- `npm run build` - Builds both client (Vite) and server (esbuild)
- Client output: `dist/public/` (static assets)
- Server output: `dist/index.cjs` (bundled Node.js server)
- Static file serving from Express in production
- Dependency bundling for faster cold starts (selected allowlist of packages)

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: Managed PostgreSQL with WebSocket connections for serverless environments
- **Connection**: Via `@neondatabase/serverless` package with `ws` WebSocket library
- **Environment Variable**: `DATABASE_URL` (required)

### UI Component Libraries
- **Radix UI**: Unstyled, accessible component primitives (dialog, dropdown, select, etc.)
- **shadcn/ui**: Pre-styled component collection built on Radix UI
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library

### State & Data Fetching
- **TanStack Query**: Server state management, caching, and synchronization
- **React Hook Form**: Form state management
- **Zod**: Runtime type validation and schema definition

### Development Tools
- **Vite**: Fast development server and build tool
- **TypeScript**: Type safety across the stack
- **Drizzle Kit**: Database migration tool
- **esbuild**: Fast JavaScript bundler for server code

### Fonts
- **Google Fonts**: Inter (primary UI font), JetBrains Mono (monospace for data)
- Loaded via CDN in `client/index.html`

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal` - Development error overlay
- `@replit/vite-plugin-cartographer` - Code mapping (development only)
- `@replit/vite-plugin-dev-banner` - Development mode indicator

### Notable Architectural Decisions

**No Authentication:** Intentional choice for single-user simplicity. Future multi-user version would require session management and user context.

**Drizzle ORM over Prisma:** Lighter weight, better TypeScript inference, schema-as-code approach.

**wouter over React Router:** Minimal routing needs, smaller bundle size.

**Shared Schema:** TypeScript types and Zod validation schemas generated from Drizzle schema ensure type safety from database to frontend.

**Monorepo Structure:** Client and server in same repository with shared types, simplifying development and deployment.

**Heat Index as Primary Metric:** Designed to surface neglected high-value relationships automatically, making the CRM proactive rather than reactive.