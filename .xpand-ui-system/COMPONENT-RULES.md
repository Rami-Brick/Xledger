# Component Rules

This file defines the default behavior and styling direction for recurring interface components.
Use these rules to make screens feel related across projects.

## Buttons

Primary buttons:
- prefer the style direction used in `salesforce.webp`
- keep them premium, rounded, and visually controlled
- default to soft filled treatments rather than harsh solid blocks

Secondary buttons:
- use soft filled by default
- keep them quieter than primary actions without making them disappear

Destructive buttons:
- use subtle red in normal UI
- use stronger red only in confirmations or final destructive moments

General button rules:
- avoid loud, generic CTA styling in serious business apps
- keep button shapes rounded
- keep action hierarchy obvious, especially when multiple actions appear together

## Cards and Containers

Default pattern:
- use both large wrapper cards and smaller nested cards when the page benefits from layering
- larger containers can unify dense content areas such as lists or grouped operational panels
- smaller cards can separate important internal blocks

Visual treatment:
- prefer visible borders
- cards should partially blend into the background rather than feeling like floating hard blocks
- use a mixed treatment similar in spirit to `salesforce.webp`: structured but soft

General card rules:
- use rounded cards consistently
- avoid introducing many competing card styles on the same screen
- preserve premium containment without making the UI feel heavy

## Inputs and Forms

Input shape:
- use rounded inputs inspired by `Crextio.png`

Labels:
- place labels above inputs

Helper text:
- use helper text only when necessary

General form rules:
- forms should feel organized and calm
- avoid excessive explanatory copy
- use spacing and grouping to make forms understandable before relying on text

## Lists

Row actions:
- keep row actions always visible

Bulk actions:
- show checkboxes only when needed

Selection:
- selected rows should be highlighted subtly, not aggressively

General list rules:
- list rows should feel premium and reusable
- maintain strong scanning rhythm
- use typography contrast to organize row content
- keep actions visible but controlled so rows do not feel cluttered

## Empty, Loading, and Error States

Overall feel:
- minimal and quiet

Empty states:
- icons are welcome
- keep copy concise and useful

Loading states:
- use both skeletons and spinners depending on context
- prefer skeletons for content regions that are about to appear
- prefer spinners for shorter blocking waits or compact loading moments

Error states:
- keep them calm and direct
- avoid alarming styling unless the situation is truly severe
- provide a clear recovery action when possible

## Cross-Component Behavior

- rounded geometry is a recurring design trait
- premium feel should come from restraint, spacing, and consistency more than decoration
- visible borders are allowed and encouraged, but they should support softness rather than create harsh separation
- use subtle emphasis first; escalate only when the action or state is truly important
