# Screen Recipes

This file defines repeatable layout patterns for the screen types used most often.
These recipes should guide UI work before visual polish begins.

Assumptions currently in effect until explicitly changed:
- navigation preference: side panel
- corner radius: medium-to-large
- density default: balanced, except settings which should be compact
- button style: soft rounded
- charts: use when useful, but do not let them dominate the screen

## Dashboard Recipe

Use when:
- the user needs a quick high-level understanding of system state
- the page acts as a command center

Desired feel:
- airy
- premium
- calm
- informative without feeling crowded

Top of page:
- clear page title
- short supporting subtitle when needed
- quick actions near the title area

What should appear prominently:
- summary cards
- charts
- recent activity
- quick actions

Layout structure:
1. title and action row
2. summary cards row
3. analytics or trend section
4. recent activity and operational blocks

Rules:
- the title should establish the page immediately
- all four dashboard needs are valid: summary cards, charts, recent activity, and quick actions
- use breathing room between sections so the page stays airy
- keep charts visually simple and easy to scan
- avoid decorative elements that reduce seriousness in business apps

## List Page Recipe

Use when:
- the user needs to scan many records
- the user needs quick actions on each item
- the screen is operational and repeat-use heavy

Desired feel:
- premium utility
- modern
- clean
- highly reusable

List model:
- use a list similar in spirit to `salesforce.webp`
- prefer list rows or card-like rows inside a larger container
- the full list area can sit inside a larger premium wrapper card
- allow subtle gradient atmosphere in the background, but keep readability first

Filters:
- place filters at the top
- keep them visible and easy to scan

Layout structure:
1. title and action row
2. filter and search row
3. main list container
4. optional supporting side content only when truly needed

Rules:
- prioritize clear row scanning over decorative detail
- use typography weight changes to create hierarchy inside rows
- keep buttons clean and controlled
- avoid noisy table chrome
- keep row content aligned and rhythmically spaced

Action behavior:
- row actions should be always visible

## Detail Page Recipe

Use when:
- the user needs to inspect one entity deeply
- the page has multiple categories of information

Desired feel:
- structured
- focused
- navigable

Navigation pattern:
- use tabs and sections navigated through a side panel

Top of page:
- clear title
- no pinned summary block required by default

Side content:
- no side metadata panel by default

Layout structure:
1. title row
2. side navigation for sections or detail tabs
3. main content area with grouped sections

Rules:
- use the side panel to reduce long-scroll confusion
- keep sections clearly separated and titled
- avoid overloading the top of the page with summary widgets
- make navigation between sections feel stable and predictable

## Settings and Forms Recipe

Use when:
- the page is configuration-heavy
- the user needs to edit structured information safely

Desired feel:
- compact
- organized
- calm
- trustworthy

Form structure:
- use grouped sections
- do not present settings as one endless undifferentiated form

Save behavior:
- use sticky save actions

Layout structure:
1. title and contextual explanation
2. grouped form sections
3. sticky action area for save and cancel

Rules:
- keep inputs tightly organized, but not cramped
- group related settings together with clear headings
- make save behavior obvious at all times
- prefer predictable patterns over decorative experimentation

## Cross-Screen Rules

- prefer side panel navigation over top tabs for app-level navigation
- use clear titles at the top of major screens
- keep premium rounded surfaces as a recurring pattern
- preserve airy composition on dashboards and more compact structure on settings pages
- use gradients and soft atmosphere carefully; they should support the screen, not distract from it
