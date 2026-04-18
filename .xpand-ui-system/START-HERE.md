# XPand UI System

This folder is your reusable cross-project UI operating system.

Purpose:
- keep design quality consistent across projects
- avoid redesigning from scratch every time
- give Claude repeatable instructions instead of vague taste-based prompts
- separate your reusable UI method from any single app implementation

What is inside:
- `CLAUDE-CODE-ENTRYPOINT.md`: best single file to reference for Claude Code UI tasks
- `SYSTEM-PRINCIPLES.md`: design philosophy and decision rules
- `WORKFLOW.md`: the step-by-step process to follow on real projects
- `HOW-TO-USE-CLAUDE-CODE.md`: workflow for Claude Code when it can read this whole folder
- `HOW-TO-USE-OTHER-AI.md`: workflow for ChatGPT and other AI tools
- `TASK-MODES.md`: behavior rules for different kinds of UI tasks
- `OUTPUT-STANDARDS.md`: quality bar for implementation and review
- `GOOD-PROMPTS.md`: strong prompt examples
- `BEFORE-AFTER.md`: weak versus strong request examples
- `checklists/UI-REVIEW-CHECKLIST.md`: fast quality-control checklist
- `templates/`: reusable briefs and reference annotation templates
- `prompts/NEW-SCREEN-PROMPT.md`: prompt for creating or redesigning a screen
- `prompts/REFINE-EXISTING-UI-PROMPT.md`: prompt for improving an existing interface
- `examples/claude-global-memory-example.md`: example content for `~/.claude/CLAUDE.md`
- `examples/claude-slash-command-example.md`: example custom slash command for Claude Code
- `examples/claude-subagent-example.md`: example subagent for UI review and polish

Recommended adoption order:
1. If using Claude Code, start from `CLAUDE-CODE-ENTRYPOINT.md`
2. Read `SYSTEM-PRINCIPLES.md` and `WORKFLOW.md`
3. Read the usage guide that matches your AI tool
4. Use the system on one real screen in any project
5. Run the UI review checklist on the result
6. Only after the method feels good, copy the example snippets into Claude Code global memory, commands, or agents

Important:
Do not treat this as a visual style locked to one app.
This is a reusable method for producing better UI across many apps.
The visual identity can vary by product, but the workflow should stay stable.
