# ClairOS Architecture

> A unified family operations platform for managing the interlinked complexities of domestic life.

## Overview

ClairOS is a "Family Operating System" designed to help households manage shopping lists, recipes, meal planning, chores, schedules, and reminders in a cohesive, interconnected way.

> [!TIP]
> For a user-facing description of features, see [Product Features](./product-features.md).

### Design Philosophy

1. **Everything is Connected**: Real-life domestic tasks don't exist in isolation. A recipe needs ingredients (shopping), gets cooked on a specific day (calendar), might require prep work (tasks), and could involve multiple family members. Our data model and UI reflect these natural relationships.

2. **Reduce Cognitive Load**: Instead of juggling multiple apps, families have one place to manage everything. Cross-linking means you don't have to remember or manually coordinate—the system does it for you.

3. **Warm & Welcoming**: The interface uses a warm color palette and soft design language. It should feel like a comfortable kitchen table, not a corporate productivity tool.

4. **Family-First**: Designed for households of all types—traditional families, roommates, couples, or individuals managing complex lives.

## Technical Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Bun | Fast, modern JavaScript/TypeScript runtime |
| **Frontend** | Vite + React 19 | Fast dev experience, modern React features |
| **UI Components** | Shadcn UI (via base-ui) | Accessible, customizable components |
| **Styling** | Tailwind CSS 4 | Utility-first styling with design tokens |
| **Routing** | React Router 7 | Client-side navigation |
| **State/Fetching** | TanStack Query | Server state management with caching |
| **Backend** | Hono | Lightweight, fast HTTP framework |
| **Database** | PostgreSQL 16 | Reliable relational data storage |
| **ORM** | Drizzle | Type-safe database access |
| **Validation** | Zod | Runtime type validation for API |
| **Deployment** | Docker Compose | Simple container orchestration |

## Project Structure

```
clair-os/
├── package.json              # Bun workspace root
├── docker-compose.yml        # Deployment configuration
├── packages/
│   └── shared/               # Shared types & utilities
├── api/                      # Hono backend server
│   └── src/
│       ├── db/               # Drizzle schema & migrations
│       ├── routes/           # API endpoints
│       └── middleware/       # Auth, logging, etc.
├── app/                      # Vite + React frontend
│   └── src/
│       ├── routes/           # Page components
│       ├── components/       # UI components
│       └── lib/              # Utilities & API client
└── docs/                     # Documentation
```

## Core Modules

### 1. Recipes
Store family recipes with ingredients, instructions, prep/cook times, and tags. Each recipe can be linked to meals and automatically populate shopping lists.

### 2. Shopping Lists
Dynamic lists that can be created manually or generated from recipes. Items track their source (which recipe needs them) and can be checked off during shopping.

### 3. Meal Planning
Schedule meals on a calendar. Can link to recipes, auto-generate shopping lists for the week, and create preparation reminders.

### 4. Tasks & Chores
Assignable tasks with optional recurrence (daily, weekly, monthly). Great for household chores that rotate among family members.

### 5. Calendar
Unified view of all scheduled items—meals, appointments, task due dates, and custom events. Each family member can have a designated color.

### 6. Reminders
Time-based or contextual reminders that can be attached to tasks, events, or standalone.

## Entity Relationships

The power of ClairOS comes from how entities link together:

```
Recipe ──creates──▶ Shopping List Items
   │
   └──scheduled as──▶ Meal ──appears on──▶ Calendar Event
                        │
                        └──generates──▶ Task (prep work, cleanup)
```

### Link Types

| Relationship | Example |
|-------------|---------|
| **Recipe → Shopping** | "Add ingredients to list" |
| **Recipe → Meal** | "Schedule this for Tuesday" |
| **Meal → Calendar** | Appears as dinner event |
| **Task → Member** | "Assigned to Alex" |
| **Task → Calendar** | Due date shows on calendar |
| **Reminder → Task** | "Don't forget to defrost chicken" |

## PWA Capabilities

ClairOS is a Progressive Web App, providing:

- **Installable**: Add to home screen on any device
- **Offline Support**: Basic functionality without internet
- **Push Notifications**: Reminders and updates (when configured)
- **Responsive**: Works on phones, tablets, and desktops

## Deployment

Designed for home server deployment via Docker Compose:

```bash
# Start the stack
docker-compose up -d

# Access the app
http://localhost:3000
```

No cloud dependencies—your family's data stays on your own hardware.

## Future Considerations

- [ ] Real-time sync via WebSockets
- [ ] AI-powered meal suggestions based on history
- [ ] Barcode scanning for pantry management
- [ ] Integration with grocery delivery APIs
- [ ] Import recipes from URLs
- [ ] Mobile apps (React Native or native)
