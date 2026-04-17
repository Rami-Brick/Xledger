# Claude Code Entrypoint

Use this file when Claude Code is asked to do any UI, UX, styling, component, layout, page, theme, or redesign task.

## Mission

Use `.xpand-ui-system` as the design and UI execution system for this project.
Do not invent a random visual language.
Do not produce generic "AI UI".
Do not optimize only for visual novelty.

Optimize for:
- clarity
- consistency
- professional premium tone
- implementation realism
- reusability
- responsiveness
- accessibility

## Default behavior

When a UI-related task is requested:

1. Read the relevant files from `.xpand-ui-system`
2. Infer the task mode from `TASK-MODES.md`
3. Inspect the current code and UI before changing anything
4. Use the existing stack unless explicitly told otherwise
5. Apply the system rules before adding styling
6. Preserve functionality while improving hierarchy, spacing, and interaction quality
7. Cover important states
8. Review the result against the checklist before considering the task complete

## Read order

Always start with:
- `PROJECT-INTAKE.md`
- `HOUSE-STYLES.md`
- `SCREEN-RECIPES.md`
- `COMPONENT-RULES.md`
- `ANTI-PATTERNS.md`
- `TOKENS-SPEC.md`
- `OUTPUT-STANDARDS.md`
- `TASK-MODES.md`

When useful, also read:
- `references/ANNOTATED-REFERENCES.md`
- `checklists/UI-REVIEW-CHECKLIST.md`
- `GOOD-PROMPTS.md`
- `BEFORE-AFTER.md`
- `templates/SCREEN-BRIEF.md`
- `templates/APP-UI-BRIEF.md`

## Project defaults

Unless the user overrides them:
- use the `Soft Premium B2B` house style
- support both light and dark mode
- prefer sidebar-only app shells
- use balanced density overall
- keep dashboards airy
- keep settings and forms more compact
- use premium rounded surfaces
- keep list pages clean, efficient, and highly scannable

## Hard constraints

- avoid everything listed in `ANTI-PATTERNS.md`
- do not make the UI boxy
- do not overload dashboards
- do not use weak typography hierarchy
- do not create inconsistent component behavior
- do not let decorative effects overpower utility
- do not introduce unprofessional colors or cheap-looking default styling

## Required quality bar

For any meaningful UI task, ensure:
- screen purpose is obvious quickly
- primary action is obvious
- spacing rhythm is consistent
- titles and hierarchy are clear
- proportions feel balanced
- row and card alignment are tight
- light and dark mode are considered when relevant
- loading, empty, error, hover, focus, and disabled states are considered when relevant
- mobile and desktop both work

## Expected working style

Claude Code should:
- inspect first
- explain key UI issues if the page already exists
- then implement
- then review the result against the system

If the task is ambiguous, choose the smallest set of UI changes that produces the biggest clarity improvement.
