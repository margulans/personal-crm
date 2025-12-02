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
- **Data Model**: Key tables include `contacts` (comprehensive contact details, scoring, and relationship metrics), `interactions` (tracking touchpoints), and `backups` (team data snapshots).
- **Backup System**: Supports manual and automatic daily backups, with restoration capabilities and retention policies.

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