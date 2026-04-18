# Good Prompts

Use these examples as patterns when giving UI tasks to Claude Code or other agents.

## New screen

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md` as the UI instructions for this task.

Build a new reports page.

Context:
- product: accounting SaaS
- users: managers and accountants
- screen type: reports page
- primary actions: filter, export
- goal: help users understand trends quickly without feeling overloaded

Inspect the existing app shell and related pages first.
Then implement a screen that follows the system, supports light and dark mode, and feels consistent with the rest of the app.
```

## Refine a weak page

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`.

Inspect this existing history page and refactor it to match the design system.
Keep the current functionality and stack.
Improve hierarchy, spacing, list clarity, filters, and action visibility.
Avoid all anti-patterns.
Review the result against the checklist before finishing.
```

## Create a reusable component

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`.

Create a reusable filter bar component for list pages.
It should match the system's list style, support desktop and mobile, and feel premium but efficient.
Inspect existing list pages first so the result fits the app.
```

## App-wide refresh

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`.

Audit the current app UI and propose an application-wide refresh plan before editing.
Focus on the app shell, titles, cards, lists, forms, and settings screens.
Then implement the highest-value shared improvements first so the app starts feeling like one product.
```

## UI review

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`.

Review this screen against the system.
Read the checklist and anti-patterns first.
Give findings ordered by severity, then concrete fixes.
Focus on hierarchy, sizing, alignment, spacing rhythm, and professional tone.
```

## Weak prompts to avoid

Avoid prompts like:
- "make it better"
- "make it beautiful"
- "modernize this"
- "fix the design"

These prompts are too vague and usually lead to generic work.
