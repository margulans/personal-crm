# Design Guidelines: Personal CRM Application

## Design Approach

**Selected Approach**: Design System (Productivity-Focused)
**Primary Inspiration**: Linear + Notion aesthetic with data visualization clarity
**Rationale**: Utility-focused application requiring efficiency, information density, and clear data hierarchy over visual storytelling.

---

## Core Design Principles

1. **Clarity Over Decoration**: Clean, minimal interface that prioritizes data readability
2. **Scannable Hierarchy**: Strong visual hierarchy enables quick information scanning
3. **Functional Color**: Color serves data visualization (heat status, priority levels) not decoration
4. **Consistent Density**: Balanced information density - neither sparse nor overwhelming

---

## Typography

**Font Stack**:
- Primary: Inter (via Google Fonts) - excellent for data-dense interfaces
- Monospace: JetBrains Mono - for numerical data, scores, dates

**Hierarchy**:
- Page Titles: text-2xl font-semibold (24px)
- Section Headers: text-lg font-semibold (18px)
- Card Titles: text-base font-medium (16px)
- Body Text: text-sm (14px)
- Metadata/Labels: text-xs font-medium uppercase tracking-wide (12px)
- Data Values: text-sm font-mono (14px, monospace)

---

## Layout System

**Spacing Units**: Standardize on Tailwind units: 2, 3, 4, 6, 8, 12, 16
- Component padding: p-4, p-6
- Section gaps: gap-4, gap-6, gap-8
- Card spacing: p-6 for content, p-4 for compact cards
- Page margins: px-6 lg:px-8

**Container Strategy**:
- Main application container: max-w-7xl mx-auto
- Sidebar (if used): fixed w-64
- Content area: flex-1 with appropriate padding

---

## Component Library

### Navigation
- **Top Bar**: Fixed header with logo, search, user actions. Height: h-16, subtle border-b
- **Sidebar Navigation** (if multi-section): Fixed left sidebar, clear section separation with icons + labels

### Data Display

**Contact Cards**:
- Bordered cards with p-6, rounded-lg, hover:shadow-md transition
- Header: Name + heat status indicator (prominent colored dot)
- Metadata grid: 2-column layout showing key metrics
- Quick actions: Icon buttons aligned right

**Tables**:
- Clean borders, striped rows (alternate bg-gray-50)
- Sticky headers with font-medium
- Cell padding: px-4 py-3
- Sortable columns with subtle arrow indicators

**Heat Status Indicators**:
- Large prominent circles (w-4 h-4 or larger for emphasis)
- Green: bg-emerald-500, Yellow: bg-amber-500, Red: bg-red-500
- Always paired with numerical HeatIndex display

**Metrics Display**:
- Label + Value pairs in grid layout
- Labels: text-xs uppercase text-gray-500
- Values: text-sm font-semibold with appropriate emphasis

### Forms

**Input Fields**:
- Consistent height: h-10 for text inputs
- Border: border border-gray-300 rounded-md
- Focus state: focus:ring-2 focus:ring-blue-500 focus:border-blue-500
- Labels: text-sm font-medium mb-1

**Select/Dropdown**:
- Same styling as text inputs
- Clear down arrow indicator

**Buttons**:
- Primary: bg-blue-600 text-white px-4 py-2 rounded-md font-medium
- Secondary: border border-gray-300 bg-white px-4 py-2 rounded-md
- Icon buttons: p-2 rounded hover:bg-gray-100

### Analytics Components

**Matrix Grid**: 
- 3x3 or 4x4 grid showing distribution
- Each cell: bordered, centered text, shows count
- Headers for rows (A/B/C class) and columns (Green/Yellow/Red)

**Priority Lists**:
- Ordered cards with visual priority indicators
- Category badges (AA, AB, BA) with distinctive styling
- Clear call-to-action for each item

### Filters & Search

**Filter Bar**:
- Horizontal layout with gap-3
- Chip-style filter pills (removable)
- Dropdown for adding filters
- Search input with icon, w-64 or w-80

---

## Interaction Patterns

**Navigation Flow**:
- List → Detail → Back to List (breadcrumb or back button)
- Analytics accessible from top navigation
- Persistent search accessible globally

**Data Entry**:
- Inline editing where appropriate (click to edit)
- Modal forms for creating new contacts
- Slide-over panels for adding interactions

**Feedback**:
- Toast notifications for actions (top-right)
- Loading states with skeleton screens
- Validation messages inline with forms

---

## Layout Templates

### List View (Contacts)
- Filter bar at top (sticky)
- Grid of contact cards (2-3 columns on desktop) OR table view toggle
- Each card shows: name, tags, value category, heat status, last contact
- Pagination or infinite scroll at bottom

### Detail View (Contact Card)
- Two-column layout on desktop
- Left: Primary info, metrics, ценность breakdown
- Right: Interaction timeline (scrollable)
- Sticky header with name + heat status
- Tabbed sections for organization if needed

### Analytics Dashboard
- Top: Summary cards (total contacts by class)
- Middle: Heat status matrix (visual grid)
- Bottom: Two priority lists side-by-side (Red zone / Yellow zone)

---

## Icons
**Library**: Heroicons (outline style for general UI, solid for emphasis)
- Navigation icons: 20px (w-5 h-5)
- Action icons: 16px (w-4 h-4)
- Status indicators: custom colored circles, not icons

---

## Visual Emphasis

**Priority Indicators**:
- A-class: font-semibold, larger text, top position
- B/C-class: normal weight, smaller
- Use subtle background tints for categorization (e.g., bg-blue-50 for A-class sections)

**Data Visualization**:
- Heat colors are the only decorative colors used prominently
- Numerical scores use monospace font for alignment
- Trend indicators: ↑↓ arrows with appropriate colors

---

## Responsive Behavior
- Desktop-first (as specified), but graceful mobile adaptation
- Cards stack to single column on mobile
- Tables convert to card view on small screens
- Filter bar collapses to dropdown menu
- Sidebar becomes bottom navigation or hamburger menu