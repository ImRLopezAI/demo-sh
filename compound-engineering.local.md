---
review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle, architecture-strategist]
plan_review_agents: [kieran-typescript-reviewer, code-simplicity-reviewer]
---

# Review Context

- This repo is a TanStack Start SPA with module views under `src/app/_shell/_views`.
- Prioritize routing ergonomics, dynamic detail-view strategy, and maintainability over modal-heavy interactions.
- Validate type safety and route param/search propagation from `src/app/_shell/$.tsx` into module views.
- Flag cross-module UI coupling and patterns that make route-driven detailed views harder.
