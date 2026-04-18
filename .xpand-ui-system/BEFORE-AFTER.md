# Before and After

This file shows the difference between weak UI requests and strong system-guided requests.

## Example 1: Weak redesign request

Weak:

```md
Improve this page design.
```

Why it fails:
- no screen type
- no user goal
- no action hierarchy
- no system reference
- invites generic styling

Better:

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`.

Inspect this settings page and refactor it to match the system.
Keep the current functionality.
Use grouped sections, compact spacing, sticky save actions, and stronger hierarchy.
Avoid crowded layouts, oversized elements, and inconsistent component treatment.
```

## Example 2: Weak new-screen request

Weak:

```md
Create a dashboard.
```

Why it fails:
- no audience
- no product context
- no purpose
- no style direction

Better:

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`.

Build a dashboard for an accounting SaaS used by managers and accountants.
The goal is to help users understand cash position and recent activity quickly.
Primary actions are create, filter, and export.
Keep the dashboard airy, premium, and not overloaded.
```

## Example 3: Weak component request

Weak:

```md
Make a nice table.
```

Why it fails:
- "nice" is subjective
- no role in the product
- no rules for density, actions, or states

Better:

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`.

Create a reusable history list component for back-office screens.
Rows should feel like premium utility lists, with always-visible row actions, top filters, subtle selection states, and strong scanability.
Support light and dark mode.
```
