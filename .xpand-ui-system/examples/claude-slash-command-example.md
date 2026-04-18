# Example Slash Command

Create this file later if you want a reusable user-level command:
`~/.claude/commands/apply-ui-system.md`

```md
---
description: Apply my reusable UI system to a screen or component
argument-hint: [target]
---

Use `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md` as the UI instructions for this task.
Read the relevant files it references before making UI decisions.

Target: $ARGUMENTS

Your job:
1. inspect the relevant files
2. improve the UI using the system rules
3. keep the current stack unless explicitly told otherwise
4. cover layout, hierarchy, responsiveness, states, and accessibility
5. summarize what changed and what should become reusable patterns
```
