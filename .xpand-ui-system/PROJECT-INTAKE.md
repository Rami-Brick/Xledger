# Project Intake

Use this file as the starting profile for any new project.
It translates the UI system into practical defaults before design or implementation begins.

## Default Project Profile

### Common product types
- accounting SaaS
- admin dashboards
- internal tools
- e-commerce back offices

### Typical users
- managers
- founders
- accountants
- operations teams

### Default house style
- `Soft Premium B2B`

### Theme support
- both light mode and dark mode should be supported equally

### Default app shell
- sidebar only

### Most common screen types
- dashboard
- history or records list page
- create and edit forms
- reports page with stats and graphs
- settings page

### Most common primary actions
- create
- edit
- filter or search
- export

## Intake Questions For Any New App

Answer these before Claude starts designing:

1. What kind of product is this?
2. Who uses it most often?
3. Which house style should lead the design?
4. Is this app light-first, dark-first, or equally dual-theme?
5. Does the app shell use a sidebar, topbar, or both?
6. Which screen types are core to the product?
7. What are the primary user actions?
8. Does the product need dense utility screens, airy overview screens, or both?
9. Are there any brand constraints for color, typography, tone, or imagery?
10. Are there any reference screenshots or competitor products that should influence the work?

## Default Assumptions If The User Does Not Specify

If the user does not provide more specific design direction, assume:
- business-facing product
- premium and professional tone
- sidebar-only shell
- balanced density
- airy dashboards
- cleaner premium list pages
- grouped forms with sticky save actions
- both light and dark support
- serious visual tone appropriate for operators and decision-makers

## How Claude Should Use This

Before UI work begins:
- read `HOUSE-STYLES.md`
- read `SCREEN-RECIPES.md`
- read `COMPONENT-RULES.md`
- read `ANTI-PATTERNS.md`
- read `TOKENS-SPEC.md`

Then use this intake profile to choose:
- app shell
- layout density
- screen priorities
- action hierarchy
- tone

If a new project conflicts with these defaults, project-specific direction should win.
