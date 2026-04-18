# How To Use With Other AI Tools

Use this guide for ChatGPT or other agents that may not naturally inspect the whole repository the way Claude Code does.

## Core idea

Other AI tools often need more explicit direction.
Even if they can access files, they may benefit from a more guided instruction structure.

## Minimum files to point them to

At minimum, direct the AI to these files:
- `.xpand-ui-system/PROJECT-INTAKE.md`
- `.xpand-ui-system/HOUSE-STYLES.md`
- `.xpand-ui-system/SCREEN-RECIPES.md`
- `.xpand-ui-system/COMPONENT-RULES.md`
- `.xpand-ui-system/ANTI-PATTERNS.md`
- `.xpand-ui-system/TOKENS-SPEC.md`

For reviews, also include:
- `.xpand-ui-system/checklists/UI-REVIEW-CHECKLIST.md`

For taste references, include:
- `.xpand-ui-system/references/ANNOTATED-REFERENCES.md`

## Best instruction pattern

Use explicit structured requests.
Tell the AI:
- what to read
- what screen type it is working on
- what the main user goal is
- what actions matter most
- what not to do

If the other AI can read repository files directly, you can also start from:
- `.xpand-ui-system/CLAUDE-CODE-ENTRYPOINT.md`

Then explicitly tell it to follow the referenced files.

## Example: new screen

```md
Use the design system in `.xpand-ui-system`.

Before answering, read:
- `PROJECT-INTAKE.md`
- `HOUSE-STYLES.md`
- `SCREEN-RECIPES.md`
- `COMPONENT-RULES.md`
- `ANTI-PATTERNS.md`
- `TOKENS-SPEC.md`

Task:
Design or refactor a reports page for an accounting SaaS.

Requirements:
- use the Soft Premium B2B style
- keep sidebar-first thinking
- support light and dark mode
- include clear title, stat blocks, graphs, and export actions
- avoid overcrowding and weak hierarchy
- keep the UI professional and premium
```

## Example: review

```md
Review this UI against the design system in `.xpand-ui-system`.

Read:
- `COMPONENT-RULES.md`
- `ANTI-PATTERNS.md`
- `checklists/UI-REVIEW-CHECKLIST.md`

Give:
1. critical issues
2. design consistency issues
3. concrete fixes
```

## Best practice for other AI tools

- be more explicit than you would be with Claude Code
- name the files to read
- specify the desired screen type and outcome
- remind the model to avoid anti-patterns
- ask for structured output when useful

## If the other AI tool cannot access files well

Then give it a compressed summary based on:
- house style
- screen recipe
- component rules
- anti-patterns

In that case, this folder still works as your source material, even if the AI cannot consume it directly.
