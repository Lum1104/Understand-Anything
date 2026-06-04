---
name: understand-dashboard
description: Launch the Understand Anything dashboard for the current project
---

Use the existing Understand Anything dashboard skill, but treat this command's CLI-style arguments as the skill's `$ARGUMENTS`.

## Argument forwarding

- Everything after `:understand-dashboard` is the optional project path.
- While following the underlying skill workflow, interpret `$ARGUMENTS` as that path.

Examples:
- `:understand-dashboard`
- `:understand-dashboard ../other-repo`

## Execute

1. Ensure Understand Anything is installed (the universal plugin root should exist):
   - `$HOME/.understand-anything-plugin`

2. Read and follow the workflow in:
   - `$HOME/.understand-anything-plugin/skills/understand-dashboard/SKILL.md`
