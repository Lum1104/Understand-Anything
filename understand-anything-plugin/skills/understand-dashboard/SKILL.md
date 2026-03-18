---
name: understand-dashboard
description: Launch the interactive web dashboard to visualize a codebase's knowledge graph
argument-hint: [project-path]
{{EXTRA_FRONTMATTER}}
---

# /understand-dashboard

Start the Understand Anything dashboard to visualize the knowledge graph for the current project.

## Instructions

1. Determine the project directory:
   - If `$ARGUMENTS` contains a path, use that as the project directory
   - Otherwise, use the current working directory

2. Check that `.understand-anything/knowledge-graph.json` exists in the project directory. If not, tell the user:
   ```
   No knowledge graph found. Run /understand first to analyze this project.
   ```

3. Find the dashboard code. The dashboard is at `packages/dashboard/` relative to this plugin's root directory. Use the Bash tool to resolve the path:
   ```bash
   PLUGIN_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
   ```
   Or locate it by checking these paths in order:
   - `${CLAUDE_PLUGIN_ROOT}/packages/dashboard/`
   - The parent directory of this skill file, then `../../packages/dashboard/`

4. Install dependencies if needed:
   ```bash
   cd <dashboard-dir> && pnpm install --frozen-lockfile 2>/dev/null || pnpm install
   ```

5. Start the Vite dev server pointing at the project's knowledge graph:
   ```bash
   cd <dashboard-dir> && GRAPH_DIR=<project-dir> npx vite --open
   ```
   Run this in the background so the user can continue working.

6. Report to the user:
   ```
   Dashboard started at http://localhost:5173
   Viewing: <project-dir>/.understand-anything/knowledge-graph.json

   The dashboard is running in the background. Press Ctrl+C in the terminal to stop it.
   ```

## Notes

- The dashboard auto-opens in the default browser via `--open`
- If port 5173 is already in use, Vite will pick the next available port
- The `GRAPH_DIR` environment variable tells the dashboard where to find the knowledge graph
