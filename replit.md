# PRIMA - Personal Relationship & Interaction Management Assistant

## Overview
PRIMA is a multi-user collaborative CRM web application designed to help teams manage and prioritize personal and professional contacts. It features a sophisticated scoring mechanism, attention levels, and a "heat index" to identify relationships needing nurturing. The system supports team collaboration, secure authentication via Replit Auth, and robust contact management with analytics and bulk operations. Key capabilities include contribution and potential scoring, automatic importance calculation, real-time sync, and PWA support. The project aims to provide a proactive CRM solution with market potential for enhancing relationship management effectiveness.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Application Type
PRIMA is a multi-user collaborative application with team-based access control. Users authenticate via Replit Auth and can create or join teams. All contacts within a team are visible to members, operating on a "last save wins" conflict resolution strategy.

### Frontend Architecture
- **Framework & Build**: React 18 with TypeScript, Vite for fast development and build.
- **UI Component System**: shadcn/ui with Radix UI primitives and Tailwind CSS, following a Linear/Notion-inspired design. Typography uses Inter and JetBrains Mono.
- **State Management**: TanStack Query for server state and caching; local component state with React hooks.
- **Key UI Patterns**: Card-based layouts, matrix visualizations, form-based editing, modal dialogs, and responsive design.

### Backend Architecture
- **API Design**: RESTful API built with Express.js, using JSON format for requests/responses.
- **Business Logic**: Core algorithm calculates contact priority based on Contribution Score (0-9), Potential Score (0-15), Value Category, Importance Level, and a Heat Index. The Heat Index formula considers recency, relationship energy, response quality, and attention trend, categorizing contacts into Green, Yellow, or Red statuses.
- **AI Integration**: Leverages OpenAI's GPT-5.1 for AI-powered relationship intelligence, providing contact-level insights (next actions, summaries) and team-level analytics (network health, strategic recommendations) in Russian. AI responses are cached with varying durations and can be force-refreshed.

### Data Layer
- **Database**: PostgreSQL via Neon serverless, utilizing Drizzle ORM for type-safe queries.
- **Data Model**: Key tables include `contacts` (comprehensive contact details, scoring, and relationship metrics), `interactions` (tracking touchpoints), `attachments` (file uploads organized by category), `contact_connections` (relationship graph edges between contacts), `gifts` (gift tracking with direction, occasion, amount), and `backups` (team data snapshots).
- **Backup System**: Supports manual and automatic daily backups, with restoration capabilities and retention policies.

### Purchase Tracking (NEW)
- **Table**: `purchases` storing customer purchase history
- **Fields**: productName, category, amount, currency, purchasedAt, notes
- **Categories**: product, service, subscription, consultation, training, license, support, other
- **Currency Support**: USD (default), EUR, RUB, KZT (validated enum)
- **Aggregation**: `purchaseTotals` field on contacts stores totalAmount, count, lastPurchaseDate
- **Financial Score Calculation**: Automatic based on total purchase amount:
  - $0 = 0 points (Нет покупок)
  - >$0 и <$100,000 = 1 point
  - ≥$100,000 и <$500,000 = 2 points
  - ≥$500,000 = 3 points
- **Component**: PurchaseSection (in contact detail) with add/edit/delete functionality
- **API Endpoints**: /api/purchases, /api/contacts/:id/purchases

### Gift Tracking
- **Route**: `/gifts` accessible via sidebar "Подарки"
- **Features**: Track gifts given to and received from contacts with title, description, amount, currency, occasion type, and date
- **Direction**: "given" (sent to contact) or "received" (received from contact)
- **Occasions**: birthday, new_year, anniversary, holiday, business, thank_you, apology, no_occasion, other
- **Currency Support**: USD (default), EUR, RUB, KZT with appropriate symbols ($, €, ₽, ₸)
- **Components**: GiftSection (in contact detail), GiftsPage (full gift list with filters)

### Network Graph (Relationship Visualization)
- **Library**: react-force-graph-2d for interactive force-directed graph layout
- **Route**: `/network` accessible via sidebar "Граф связей"
- **Features**: Visual connections between contacts with typed relationships (friends, colleagues, partners, family, etc.)
- **Security**: All connection operations are team-scoped with duplicate prevention and cross-team isolation
- **Connection Types**: friend, colleague, partner, family, client, mentor, classmate, neighbor, acquaintance, other
- **Strength Levels**: 1-5 scale indicating relationship intensity

### File Attachments
- **Object Storage**: Uses Replit Object Storage (Google Cloud Storage) for file uploads with team-based access control.
- **Categories**: Files organized by context - personal, family, team (staff photos), work, documents.
- **Security**: Multi-tenant isolation with team-based ACL policies, verified team membership on all operations, path validation to prevent traversal attacks.
- **Components**: ObjectUploader (file upload), SectionAttachments (category-based display in contact detail).

### File Structure
The project adopts a monorepo structure, separating client (React components, pages, utilities) and server (API routes, storage, database setup) with shared schema definitions for type safety.

### Build & Deployment
- **Development**: `npm run dev` for Vite dev server with HMR and Express API server.
- **Production**: `npm run build` bundles client and server code for optimized deployment, serving static files from Express.

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: Managed PostgreSQL for serverless environments.

### UI Component Libraries
- **Radix UI**: Accessible, unstyled component primitives.
- **shadcn/ui**: Pre-styled component collection built on Radix UI.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.

### State & Data Fetching
- **TanStack Query**: Server state management and caching.
- **React Hook Form**: Form state management.
- **Zod**: Runtime type validation and schema definition.

### Development Tools
- **Vite**: Fast development server and build tool.
- **TypeScript**: Type safety.
- **Drizzle Kit**: Database migration tool.
- **esbuild**: Fast JavaScript bundler.

### Fonts
- **Google Fonts**: Inter (UI) and JetBrains Mono (data).

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `@replit/vite-plugin-dev-banner`