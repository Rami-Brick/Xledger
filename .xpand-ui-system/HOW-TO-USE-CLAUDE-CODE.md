# How To Use With Claude Code

Use this guide when Claude Code has access to the repository and can read this whole `.xpand-ui-system` folder directly.

## Core idea

Do not manually paste the entire system into every prompt.
Instead, tell Claude Code to use this folder as its design playbook and name the files it should consult.

Because Claude Code can inspect files and edit the repo, the best workflow is:
1. point it to this folder
2. tell it what kind of UI task you want
3. tell it which screen or files to inspect
4. ask it to apply the system, not invent a new visual language

## Best single-file shortcut

If you want the simplest instruction possible, point Claude Code to:
- `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`

That file tells it what else to read and how to operate.

## The files Claude Code should read first

For most UI tasks, Claude Code should consult:
- `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`
- `.xpand-ui-system/PROJECT-INTAKE.md`
- `.xpand-ui-system/HOUSE-STYLES.md`
- `.xpand-ui-system/SCREEN-RECIPES.md`
- `.xpand-ui-system/COMPONENT-RULES.md`
- `.xpand-ui-system/ANTI-PATTERNS.md`
- `.xpand-ui-system/TOKENS-SPEC.md`
- `.xpand-ui-system/TASK-MODES.md`
- `.xpand-ui-system/OUTPUT-STANDARDS.md`
- `.xpand-ui-system/checklists/UI-REVIEW-CHECKLIST.md`

For taste and reference alignment, it can also consult:
- `.xpand-ui-system/references/ANNOTATED-REFERENCES.md`
- `.xpand-ui-system/screenshots/`

## Best default instruction

Use a short directive like this at the start of a task:

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md` as the UI instructions for this task.
Read the relevant files it references before making UI decisions.
```

That is usually enough when Claude Code already has folder access.

## Best workflows

### 1. New screen

Use when building a screen from scratch.

Example:

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md` as the UI instructions for this task.

Build this screen using the system:
- screen type: dashboard
- goal: help managers understand cash position quickly
- primary actions: create transaction, filter, export

Inspect the relevant app files first, then implement the UI.
Follow the house style, screen recipe, component rules, token guidance, and anti-patterns.
Support both light and dark mode.
```

### 2. Refine existing screen

Use when a page already exists but feels weak.

Example:

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`.

Inspect this page and refactor it to match the system.
Keep the current functionality and stack.
Improve hierarchy, spacing, component consistency, responsiveness, and states.
Avoid anything listed in `ANTI-PATTERNS.md`.
```

### 3. UI review

Use when you want critique before or after implementation.

Example:

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`.

Review this screen against the system.
Read the checklist and anti-patterns first.
Give findings ordered by severity, then concrete fixes.
Focus on hierarchy, consistency, sizing, spacing, responsiveness, and professional tone.
```

### 4. Cross-project startup

Use when opening a new project for the first time.

Example:

```md
Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md` as the UI instructions for this project.
Start by reading the files it references.
Then tell me what design defaults you will apply to this project before making changes.
```

## What not to do with Claude Code

Avoid prompts like:
- "make it nicer"
- "make it modern"
- "improve the design"

Those are too vague and waste the value of this folder.

Instead, always anchor the task in:
- screen type
- user goal
- key actions
- files or route to inspect
- instruction to use `.xpand-ui-system`

## Best operating model

For best results, use Claude Code in this order:
1. Ask it to inspect the current UI
2. Ask it to explain what is wrong using the system
3. Ask it to implement the fix
4. Ask it to review the result against the checklist

That keeps design work more consistent than jumping straight to implementation.

## If you later want more automation

When this system feels stable, connect it to Claude Code using:
- user-level memory
- a custom slash command
- a UI-review subagent

See:
- `examples/claude-global-memory-example.md`
- `examples/claude-slash-command-example.md`
- `examples/claude-subagent-example.md`
