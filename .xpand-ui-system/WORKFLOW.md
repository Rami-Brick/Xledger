# Workflow

Use this process for any new project or redesign.

## Step 1: classify the screen

Before asking Claude for UI work, define:
- product type
- screen type
- main user goal
- primary action
- key secondary actions
- most important data on the page

## Step 2: choose the visual direction

Pick one house style for the app. Examples:
- clean B2B dashboard
- premium editorial
- bold operations console
- friendly SaaS
- dense admin tool

Do not mix multiple styles in the same app.

## Step 3: define structure before aesthetics

Ask Claude to produce:
- information hierarchy
- layout zones
- component list
- state list
- only then visual polish

## Step 4: force reusable decisions

For every design task, ask:
- what tokens should exist?
- which components are reusable?
- which patterns are one-off and should be avoided?
- what should become a page template?

## Step 5: review before shipping

Use the UI review checklist to verify:
- hierarchy
- spacing consistency
- responsiveness
- states
- accessibility
- action clarity

## Step 6: save what worked

When a screen pattern works well, save it into your long-term system as:
- a token decision
- a component rule
- a layout recipe
- a Claude prompt pattern

## Efficient daily usage in Claude Code

For best results, do not ask for everything at once.
Use this order:
1. ask for structure
2. ask for implementation
3. ask for polish
4. ask for review

Bad prompt:
"make this page nicer"

Better prompt:
"Refactor this settings screen into a cleaner B2B layout. Keep the current stack. Use a calm visual hierarchy, strong section grouping, and clear primary/secondary actions. Cover mobile, loading, empty, and error states. Reuse existing components where possible."
