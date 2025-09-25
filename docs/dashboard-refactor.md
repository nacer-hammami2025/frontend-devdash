# Dashboard Refactor (Progressive Modernization)

This document summarizes the recent dashboard modernization and how to work with the new component architecture.

## Goals
- Improve visual hierarchy & professionalism (soft translucency + subtle gradients + consistent borders).
- Introduce reusable primitives to avoid copy/paste UI blocks.
- Keep incremental (Option A) without freezing feature delivery.
- Enhance mobile density and perceived performance (animations + lighter DOM).

## Key Components
| Component | Location | Purpose |
|-----------|----------|---------|
| `MetricCard` | `components/dashboard/MetricCard.jsx` | KPI card with optional sparkline & delta chip. |
| `ProjectMiniCard` | `components/dashboard/ProjectMiniCard.jsx` | Compact project summary (status, deadline risk, progress, task count). |
| `ProjectOverview` | `components/dashboard/ProjectOverview.jsx` | Grid wrapper selecting top projects (by progress). |
| `ProgressRing` | `components/dashboard/ProgressRing.jsx` | SVG circular progress, used inside project cards. |
| `Section` | `components/dashboard/Section.jsx` | Standard layout wrapper (title + actions + body). |
| `UpcomingDeadlines` | `components/dashboard/UpcomingDeadlines.jsx` | Merged view of nearest project/task deadlines. |

## Hook Ordering Fix
A `useMemo` (upcomingItems) originally lived below conditional early returns (loading/error). This produced a React error: "Rendered more hooks than during the previous render". It has been moved above those returns with an explanatory comment. DO NOT add hooks below early returns.

## Mobile Dense Mode (<640px)
Padding reductions applied: `Section`, `MetricCard`, `ProjectMiniCard`, deadlines list items, and root container now adapt with `sm:` breakpoints. This keeps information density high on small screens.

## Styling & Animations
Added custom utilities in `styles.css`:
- `animate-fade-in`, `animate-fade-in-stagger`: Staggered progressive reveal.
- `animate-card-rise`: Slight scale + rise for perceptual smoothness.
- Legacy classes (`.stat-card`, `.stats-grid`, `.dashboard-header`, `.chart-container`) no longer referenced and can be removed if not reused elsewhere.

## Data Access Pattern
`useDashboardData` centralizes data fetch and enrichment (taskCount injection per project, trends separation). UI components remain stateless/presentational.

## Adding a New Metric
1. Extend data in `useDashboardData` (or compute derived metric in Dashboard if cheap).
2. Add a new `<MetricCard />` with `variant` mapping (primary|success|warning|danger|neutral).
3. Optional trend: pass an array via `trend` prop for sparkline.

## Extending ProjectOverview Logic
Replace current sort (by progress) with a composite ranking (e.g., weight deadlines + task load). Keep selection code within the component to avoid bloating page logic.

## Upcoming Ideas (Not Implemented Yet)
- Persist user layout preferences (hidden sections, density toggle) in local storage.
- Add accessible live region for KPI changes (announce deltas).
- Integrate server-side streaming for real-time metrics.
- Introduce light theme adaptive gradient seeds based on time of day.

## Conventions
- All dashboard components are visually self-contained (they accept data; they never fetch).
- Keep hook declarations at the top of the page component, before any conditional returns.
- Prefer small granular presentational components for complex rows (e.g., future: `RecentTaskItem`).

## Maintenance Checklist
- Removing legacy CSS: confirm no other pages rely on `.stat-card`, `.stats-grid`, `.dashboard-header`, `.chart-container` before deletion.
- When adding animation, test CPU throttled (Chrome devtools) to avoid jank.
- Validate dark mode manually for each new accent color.

## Migration Summary
Old inline blocks → Replaced by: MetricCard / Section / ProjectMiniCard / UpcomingDeadlines. Layout now composes sections in semantic groups: KPIs → Projects/Deadlines → Charts → Insights → Activity/Recent Tasks.

---
Questions or future enhancements? Add them here or open a ticket.
