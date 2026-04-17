# Task Modes

This file tells Claude Code how to behave for different UI tasks.

## Mode 1: Create a UI Element

Use when:
- the user asks for a button, card, table, form section, empty state, filter bar, modal, or similar component

What to do:
- inspect nearby components first
- match the current stack and the design system
- make the component reusable if practical
- define all important states
- ensure proportions and spacing fit surrounding UI

Must check:
- default
- hover
- focus
- disabled
- loading if relevant
- error if relevant

## Mode 2: Create a New Screen

Use when:
- the user asks for a brand new page or view

What to do:
- identify the screen type using `SCREEN-RECIPES.md`
- structure layout before styling
- establish title, main content zones, actions, and states
- implement using system tokens and component rules

Must check:
- hierarchy
- screen purpose
- primary action placement
- desktop and mobile behavior
- loading, empty, error states

## Mode 3: Refine an Existing Screen

Use when:
- the page already exists but feels weak, generic, cluttered, or inconsistent

What to do:
- inspect the current UI
- identify the biggest design problems first
- preserve functionality and stack
- improve hierarchy, spacing, alignment, card treatment, and interaction clarity
- remove anything that violates anti-patterns

Prioritize:
- clearer structure
- better proportions
- less visual noise
- stronger component consistency

## Mode 4: Redesign a Whole App UI

Use when:
- the user wants an application-wide design refresh or major consistency upgrade

What to do:
- inspect the app shell, page types, and recurring components
- identify shared patterns and inconsistencies
- define a system-driven redesign strategy before editing many files
- align shells, titles, cards, forms, lists, and actions under one visual language
- make the redesign feel like one product, not a sequence of isolated page fixes

Rollout order:
1. app shell
2. shared primitives
3. major screen recipes
4. page-by-page refinements
5. review pass

## Mode 5: UI Review

Use when:
- the user wants critique, audit, or design review

What to do:
- read `ANTI-PATTERNS.md` and `checklists/UI-REVIEW-CHECKLIST.md`
- inspect the target
- report findings ordered by severity
- focus on real issues, not style nitpicks

Review priorities:
- hierarchy
- consistency
- responsiveness
- accessibility
- action clarity
- professional tone

## Mode 6: Extract a Pattern into the System

Use when:
- a project UI solution works especially well and should become reusable

What to do:
- identify the reusable part
- decide whether it belongs in house styles, screen recipes, component rules, or tokens
- add only distilled lessons, not project-specific clutter

Rule:
- the system should grow through patterns, not through dumping project history into it
