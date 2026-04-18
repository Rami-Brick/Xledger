# System Principles

Your UI system should optimize for these priorities in order:

1. Clarity
The user should understand what the screen is for within a few seconds.

2. Consistency
Spacing, typography, button behavior, card treatment, and interaction patterns should repeat instead of changing from screen to screen.

3. Reusability
Prefer patterns, tokens, templates, and components that can be used in multiple apps.

4. Implementation realism
Design decisions must fit the stack already in use. Avoid ideas that are expensive to maintain unless they create strong product value.

5. Accessibility
Readable hierarchy, contrast, keyboard access, and comfortable tap targets are baseline quality requirements.

6. Restraint
Use emphasis intentionally. If everything is loud, nothing is important.

Core rules:
- Do not ask Claude to "make it beautiful" without constraints.
- Always define the page type first: dashboard, CRUD list, detail page, settings, onboarding, auth, analytics, billing, form, etc.
- Always define the primary action before refining visuals.
- Always define the state coverage: default, hover, focus, disabled, loading, empty, error.
- Prefer one strong visual direction per product.
- Prefer a house style over one-off experiments.
- Reuse tokens and primitives before creating new patterns.

Recommended long-term system layers:
- Layer 1: principles
- Layer 2: design tokens
- Layer 3: components
- Layer 4: screen templates
- Layer 5: review checklist
- Layer 6: Claude prompts, commands, and agents
