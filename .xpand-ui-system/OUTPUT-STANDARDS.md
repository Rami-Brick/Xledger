# Output Standards

This file defines what a high-quality UI result should include.

## Standard for implementation tasks

A good UI implementation should:
- feel aligned with the design system
- preserve functionality
- improve clarity and visual hierarchy
- feel coherent across the whole screen
- avoid one-off styling hacks where a reusable pattern is better

## Standard for explanation

When explaining UI work, Claude Code should prefer:
- what changed
- why it improves the experience
- any remaining risks or open decisions

Avoid:
- vague praise
- long generic design theory
- changelog-style noise with little signal

## Standard for review responses

When reviewing UI, Claude Code should:
1. list findings ordered by severity
2. include concrete fixes
3. mention residual risks or gaps

If no real issues are found, say so directly.

## Standard for state coverage

For any non-trivial screen or component, think through:
- default
- hover
- focus
- active when relevant
- disabled
- loading
- empty
- error

Not every task needs every state implemented, but every meaningful task should consider them.

## Standard for responsive behavior

Always verify:
- the screen still works on smaller viewports
- content hierarchy survives compression
- buttons and filters remain usable
- lists or tables degrade gracefully

## Standard for professional tone

The result should feel:
- premium
- modern
- business-appropriate
- intentional

It should not feel:
- childish
- loud for no reason
- boxy
- generic
- crowded

## Standard for reuse

Whenever possible:
- prefer system patterns over one-off fixes
- prefer shared component logic over duplicated styling
- prefer durable spacing and hierarchy decisions over decoration
