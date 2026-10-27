# Master Prompt: Build a Reusable React + Vite Project Template

## 1. Project Objective

Act as a senior frontend architect and UI design-system engineer.

Build a production-minded, reusable frontend starter template using React, Vite, TypeScript, Tailwind CSS, and shadcn/ui.

The goal is to establish a scalable foundation for modern web applications with:
- Consistent UI design across all pages.
- Reusable, composable React components.
- A well-organized and scalable folder structure.
- Shared design tokens for colors, typography, spacing, borders, shadows, and states.
- Reusable layouts for public pages, authentication pages, and dashboards.
- Standardized form handling, validation, routing, notifications, and API state management.
- Responsive layouts for mobile, tablet, and desktop.
- Clean code that is easy to maintain and extend.

Do not build the complete business application yet. Build the reusable project foundation, design system, component library, and demonstration pages.

## 2. Technology Stack

Use the following technologies:

### Core
- React
- Vite
- TypeScript with strict mode enabled

### Styling and UI
- Tailwind CSS, using the current version compatible with the official shadcn/ui Vite setup
- shadcn/ui for reusable UI primitives
- Radix UI primitives where appropriate through shadcn/ui
- Lucide React for icons
- CSS variables for theme tokens

### Routing and State
- React Router for client-side routing
- TanStack Query for server state, caching, and API mutations
- Zustand for shared client state when necessary
- React's built-in state and context for local and application-level UI concerns

### Forms and Validation
- React Hook Form
- Zod
- @hookform/resolvers

### Utilities
- Sonner for toast notifications
- TanStack Table for data tables
- React DayPicker for date selection
- A lightweight class-merging utility such as clsx, tailwind-merge, and class-variance-authority where appropriate

### Testing
- Vitest
- React Testing Library
- @testing-library/user-event
- Playwright for end-to-end testing

Do not introduce duplicate libraries that solve the same problem without a clear architectural reason.

Use current, mutually compatible stable versions. Follow the official installation documentation for Vite, Tailwind CSS, and shadcn/ui. Do not use deprecated configuration patterns.

## 3. Architecture Principles

Follow these architectural rules:

1. Use a component-driven architecture.
2. Separate generic UI primitives from reusable business components.
3. Organize domain-specific components by feature.
4. Keep page components focused on composition and routing.
5. Centralize design tokens and theme configuration.
6. Use TypeScript interfaces and types for component props and application data.
7. Use explicit component variants instead of duplicating styles.
8. Keep server state separate from local UI state.
9. Use reusable layouts and nested routes.
10. Avoid giant components, duplicated code, unnecessary abstractions, and excessive prop drilling.
11. Ensure all interactive controls have real, functional behavior.
12. Use semantic HTML and accessible interaction patterns.
13. Keep backend integration optional so the template can be reused with different APIs.
14. Do not hardcode secrets, credentials, or privileged backend keys in frontend code.

## 4. Required Folder Structure

Create a clean and scalable folder structure similar to the following:

src/
├── app/
│   ├── App.tsx
│   ├── router.tsx
│   └── providers.tsx
├── assets/
├── components/
│   ├── ui/
│   ├── shared/
│   ├── feedback/
│   ├── forms/
│   └── layouts/
├── features/
│   ├── dashboard/
│   ├── settings/
│   └── example/
├── hooks/
├── lib/
│   ├── utils.ts
│   ├── query-client.ts
│   └── api-client.ts
├── schemas/
├── services/
├── stores/
├── types/
├── styles/
│   └── globals.css
├── routes/
│   ├── HomePage.tsx
│   ├── ComponentsPage.tsx
│   ├── FormsPage.tsx
│   ├── DashboardPage.tsx
│   ├── SettingsPage.tsx
│   └── NotFoundPage.tsx
└── main.tsx

You may refine the structure if there is a clear technical benefit. Document the purpose of each major directory.

Use feature folders for domain-specific code. Shared primitives must not depend on specific business features.

## 5. Design System

Build a coherent, professional design system.

### Theme
Support:
- Light mode.
- Dark mode.
- System theme preference.
- Persistent theme selection where practical.

### Design tokens
Define centralized tokens for:
- Primary, secondary, accent, and muted colors.
- Background and foreground colors.
- Card and popover surfaces.
- Border and input colors.
- Focus rings.
- Destructive, success, warning, and informational states.
- Typography and font sizes.
- Spacing.
- Border radii.
- Shadows.
- Responsive breakpoints.

Use semantic tokens instead of scattered hex values or arbitrary CSS.

### Typography
Define a consistent type scale for:
- Display headings.
- Page titles.
- Section headings.
- Body text.
- Captions.
- Labels.
- Metadata.

Use a modern, readable font pairing or a single flexible font family.

### Layout standards
Establish reusable patterns for:
- Page containers.
- Maximum content widths.
- Responsive grids.
- Section spacing.
- Dashboard sidebars.
- Top navigation.
- Breadcrumbs.
- Empty states.
- Loading states.
- Error states.

### Component consistency
Every component must follow shared spacing, typography, color, radius, and interaction rules.

Provide documented variants and sizes rather than allowing every page to define its own visual style.

## 6. Shared UI Components

Create and configure a useful starter component library.

### Basic components
- Button
- Input
- Textarea
- Label
- Checkbox
- Radio group
- Select
- Switch
- Badge
- Avatar
- Separator
- Skeleton
- Tooltip

### Layout and navigation
- Card
- Container
- PageHeader
- SectionHeader
- Breadcrumbs
- Navbar
- Sidebar
- Footer
- Tabs
- Dropdown menu
- Command menu
- Pagination

### Feedback and overlays
- Dialog
- Alert dialog
- Sheet
- Popover
- Toast notifications using Sonner
- Alert
- Loading indicator
- Empty state
- Error state

### Data and forms
- DataTable using TanStack Table
- FormField wrapper
- FormError
- SearchInput
- FilterBar
- DatePicker
- Confirmation dialog

Use shadcn/ui primitives whenever suitable. Build custom wrappers only when they add consistent application-specific behavior or styling.

Do not recreate existing primitives unnecessarily.

## 7. Reusable Layouts

Create the following layouts:

### PublicLayout
- Responsive top navigation.
- Logo or brand placeholder.
- Navigation links.
- Primary action button.
- Mobile navigation menu.
- Optional footer.

### AuthLayout
- Focused authentication layout.
- Centered form or split-screen composition.
- Responsive behavior.
- Optional branding panel.

### DashboardLayout
- Responsive sidebar.
- Top bar.
- Page title and breadcrumb area.
- Main content container.
- User menu.
- Notification entry point.
- Mobile sidebar using a sheet or drawer.

Layouts must be reusable and accept page content through React composition or route outlets.

Do not duplicate the same navigation or shell across multiple pages.

## 8. Demonstration Pages

Build functional example pages that demonstrate the design system.

### A. Home Page
- Introduce the starter template.
- Display key capabilities.
- Include links to the component gallery and dashboard.
- Use polished typography and a responsive layout.

### B. Component Gallery
- Display all shared UI components.
- Show button variants and sizes.
- Demonstrate badges, cards, alerts, dialogs, dropdowns, tabs, and tooltips.
- Include light and dark theme examples.
- Provide realistic component states.

### C. Forms Playground
- Registration form.
- Profile editing form.
- Search and filter controls.
- Required-field validation.
- Invalid-input messages.
- Loading and success states.
- Zod validation schemas.
- React Hook Form integration.

Use mock submission handlers and clearly indicate that no real account is created or data persisted to a backend.

### D. Dashboard
- Summary metric cards.
- Recent activity list.
- Responsive data table.
- Search, sorting, and pagination where appropriate.
- Loading, empty, and error states.
- Charts only if they meaningfully demonstrate the template.

Use clearly labeled mock data.

### E. Settings Page
- Profile settings.
- Appearance settings.
- Notification preferences.
- Functional form validation.
- Clear save and reset behavior.

### F. Not Found Page
- Clear 404 message.
- Link back to the home page.
- Styling consistent with the design system.

## 9. Reusable Component API

Design component APIs that are intuitive and type-safe.

For example, a shared Button component should support:

- Variants: default, secondary, outline, ghost, destructive, link.
- Sizes: small, default, large, icon.
- Disabled state.
- Loading state where appropriate.
- Full-width layout where appropriate.
- Standard HTML button attributes.
- Accessible labels for icon-only buttons.

A reusable Card should support:
- Header.
- Title and description.
- Main content.
- Footer or actions.

Use composition instead of adding dozens of unrelated boolean props.

Prefer explicit variant definitions and strongly typed props.

## 10. API and Data Layer

Prepare the template for future backend integration.

Configure:
- A shared TanStack Query client.
- Query provider.
- A typed API client abstraction.
- Centralized error handling.
- Reusable loading and error patterns.
- Environment variable examples.
- A clear separation between mock services and production services.

Create a `.env.example` file containing only non-secret example variables.

Do not require a backend for the demonstration pages to work.

Avoid implementing unnecessary backend abstractions before a real API exists.

## 11. State Management Rules

Use the following state strategy:

- React local state for component-level interactions.
- React context for application-wide concerns when appropriate.
- TanStack Query for remote data.
- Zustand for shared client state that genuinely needs to persist across components or routes.

Do not use Zustand to duplicate server data already managed by TanStack Query.

Keep stores small, typed, and feature-oriented.

## 12. Responsive Design and Accessibility

Ensure all pages work at:
- Mobile widths around 320–390px.
- Tablet widths around 768px.
- Desktop widths around 1024–1440px and above.

Requirements:
- No horizontal overflow under normal content conditions.
- Keyboard-accessible navigation.
- Visible focus indicators.
- Semantic landmarks and heading hierarchy.
- Proper form labels and error associations.
- Accessible dialog focus management.
- Sufficient color contrast.
- Reduced-motion support.
- Responsive data tables or alternative mobile presentations.

Do not rely on color alone to communicate errors or statuses.

## 13. Code Quality and Testing

Configure:
- TypeScript strict mode.
- ESLint with React and TypeScript rules.
- Consistent formatting, preferably with Prettier.
- Clear import aliases.
- Vitest and React Testing Library.
- Playwright configuration.

Include tests for:
- Button variants and disabled behavior.
- Form validation.
- Theme switching.
- Navigation.
- Important interactive components.

Provide at least one end-to-end test covering navigation and a basic user interaction.

Do not suppress TypeScript errors or disable lint rules simply to make the build pass.

## 14. Documentation

Create a README.md containing:

- Project purpose.
- Technology stack.
- Prerequisites.
- Installation instructions.
- Development commands.
- Production build commands.
- Testing commands.
- Folder structure.
- Design token conventions.
- How to create a new shared component.
- How to create a new feature module.
- How to add a route.
- How to add a form with Zod validation.
- How to connect an API using TanStack Query.
- How to add or customize shadcn/ui components.
- Environment variable setup.
- Known limitations and future extension points.

Also create a component usage guide with examples of recommended composition patterns.

## 15. Implementation Workflow

Follow this implementation sequence:

1. Inspect the current workspace and determine whether a project already exists.
2. If starting from an empty workspace, initialize the Vite React TypeScript application.
3. Install and configure the required dependencies.
4. Configure Tailwind CSS, shadcn/ui, TypeScript aliases, and global design tokens.
5. Build the application providers and routing.
6. Implement shared UI components and reusable layouts.
7. Implement the demonstration pages.
8. Add mock data and mock service functions.
9. Configure linting, formatting, and tests.
10. Run the TypeScript checks, lint checks, tests, and production build.
11. Fix implementation errors instead of merely documenting them.
12. Review the responsive layouts and interactive states.
13. Update the README and component usage documentation.
14. Provide a concise summary of what was implemented and any remaining limitations.

Do not stop after creating a folder structure or writing a plan. Implement the actual files and working application.

If you have access to a terminal, use it to install dependencies, run commands, and verify the result. If an operation is unavailable, explain the limitation and provide the exact next step.

## 16. Acceptance Criteria

The project is complete when:

- The application starts successfully using the documented development command.
- The production build completes successfully.
- TypeScript checks pass.
- Lint checks pass.
- Tests pass.
- All demonstration routes load.
- Light and dark themes work consistently.
- Shared components use centralized design tokens.
- Forms validate and display useful feedback.
- Navigation and dashboard layouts are responsive.
- No demonstration control is presented as functional when it is only decorative.
- No real backend or payment integration is falsely claimed.
- Documentation explains how to extend the template.

## Final Instruction

Prioritize a clean, cohesive, maintainable foundation over unnecessary complexity.

Make reasonable implementation decisions independently. Avoid asking questions unless a missing requirement blocks implementation.

The result should be a polished, reusable React + Vite starter template that can serve as the foundation for multiple future web applications, including SaaS dashboards, booking marketplaces, admin panels, and customer-facing platforms.