<h1 align="center">Understand Anything</h1>

<p align="center">
  <strong>Turn any codebase, Dockerfile, or docs into an interactive knowledge graph you can explore, search, and ask questions about.</strong>
  <br />
  <em>Works with Claude Code, Codex, Cursor, Copilot, Gemini CLI, and more.</em>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.zh-TW.md">繁體中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.tr-TR.md">Türkçe</a>
</p>

<p align="center">
  <a href="#-quick-start"><img src="https://img.shields.io/badge/Quick_Start-blue" alt="Quick Start" /></a>
  <a href="https://github.com/Lum1104/Understand-Anything/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="License: MIT" /></a>
  <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude_Code-8A2BE2" alt="Claude Code" /></a>
  <a href="#codex"><img src="https://img.shields.io/badge/Codex-000000" alt="Codex" /></a>
  <a href="#vs-code--github-copilot"><img src="https://img.shields.io/badge/Copilot-24292e" alt="Copilot" /></a>
  <a href="#gemini-cli"><img src="https://img.shields.io/badge/Gemini_CLI-4285F4" alt="Gemini CLI" /></a>
  <a href="#opencode"><img src="https://img.shields.io/badge/OpenCode-38bdf8" alt="OpenCode" /></a>
  <a href="https://lum1104.github.io/Understand-Anything"><img src="https://img.shields.io/badge/Homepage-d4a574" alt="Homepage" /></a>
  <a href="https://lum1104.github.io/Understand-Anything/demo/"><img src="https://img.shields.io/badge/Live_Demo-00c853" alt="Live Demo" /></a>
</p>

<p align="center">
  <img src="assets/hero.jpg" alt="Understand Anything — Turn any codebase into an interactive knowledge graph" width="800" />
</p>

---

> [!TIP]
> **A huge thank you to the community!** The support for Understand-Anything has been incredible. If this tool saves you a few minutes of digging through complexity, that's all I wanted. 🚀

**You just joined a new team. The codebase is 200,000 lines of code. Where do you even start?**

Understand Anything is a [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that analyzes your project with a multi-agent pipeline, builds a knowledge graph of every file, function, class, and dependency, then gives you an interactive dashboard to explore it all visually. Stop reading code blind. Start seeing the big picture.

---

## ✨ Features

### Explore the structural graph

Navigate your codebase as an interactive knowledge graph — every file, function, and class is a node you can click, search, and explore. Select any node to see plain-English summaries, relationships, and guided tours.

<p align="center">
  <img src="assets/overview-structural.gif" alt="Structural graph — explore files, functions, classes and their relationships" width="750" />
</p>

### Understand business logic

Switch to the domain view and see how your code maps to real business processes — domains, flows, and steps laid out as a horizontal graph.

<p align="center">
  <img src="assets/overview-domain.gif" alt="Domain graph — business domains, flows, and process steps" width="750" />
</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🧭 Guided Tours</h3>
      <p>Auto-generated walkthroughs of the architecture, ordered by dependency. Learn the codebase in the right order.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🔍 Fuzzy & Semantic Search</h3>
      <p>Find anything by name or by meaning. Search "which parts handle auth?" and get relevant results across the graph.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📊 Diff Impact Analysis</h3>
      <p>See which parts of the system your changes affect before you commit. Understand ripple effects across the codebase.</p>
    </td>
    <td width="50%" valign="top">
      <h3>🎭 Persona-Adaptive UI</h3>
      <p>The dashboard adjusts its detail level based on who you are — junior dev, PM, or power user.</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🏗️ Layer Visualization</h3>
      <p>Automatic grouping by architectural layer — API, Service, Data, UI, Utility — with color-coded legend.</p>
    </td>
    <td width="50%" valign="top">
      <h3>📚 Language Concepts</h3>
      <p>12 programming patterns (generics, closures, decorators, etc.) explained in context wherever they appear.</p>
    </td>
  </tr>
</table>

---

## 🚀 Quick Start

### 1. Install the plugin

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### 2. Analyze your codebase

```bash
/understand
```

A multi-agent pipeline scans your project, extracts every file, function, class, and dependency, then builds a knowledge graph saved to `.understand-anything/knowledge-graph.json`.

### 3. Explore the dashboard

```bash
/understand-dashboard
```

An interactive web dashboard opens with your codebase visualized as a graph — color-coded by architectural layer, searchable, and clickable. Select any node to see its code, relationships, and a plain-English explanation.

### 4. Keep learning

```bash
# Ask anything about the codebase
/understand-chat How does the payment flow work?

# Analyze impact of your current changes
/understand-diff

# Deep-dive into a specific file or function
/understand-explain src/auth/login.ts

# Generate an onboarding guide for new team members
/understand-onboard

# Extract business domain knowledge (domains, flows, steps)
/understand-domain
```

---

## 🌐 Multi-Platform Installation

Understand-Anything works across multiple AI coding platforms.

### Claude Code (Native)

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### Codex

Tell Codex:
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.codex/INSTALL.md
```

### OpenCode

Tell OpenCode:
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.opencode/INSTALL.md
```

### OpenClaw

Tell OpenClaw:
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.openclaw/INSTALL.md
```

### Cursor

Cursor auto-discovers the plugin via `.cursor-plugin/plugin.json` when this repo is cloned. No manual installation needed — just clone and open in Cursor.

### VS Code + GitHub Copilot

VS Code with GitHub Copilot (v1.108+) auto-discovers the plugin via `.copilot-plugin/plugin.json` when this repo is cloned. No manual installation needed — just clone and open in VS Code.

For personal skills (available across all projects), tell GitHub Copilot:
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.vscode/INSTALL.md
```

### Antigravity

Tell Antigravity:
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.antigravity/INSTALL.md
```

### Gemini CLI

Tell Gemini CLI:
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.gemini/INSTALL.md
```

### Pi Agent

Tell Pi Agent:
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.pi/INSTALL.md
```

### Platform Compatibility

| Platform | Status | Install Method |
|----------|--------|----------------|
| Claude Code | ✅ Native | Plugin marketplace |
| Codex | ✅ Supported | AI-driven install |
| OpenCode | ✅ Supported | AI-driven install |
| OpenClaw | ✅ Supported | AI-driven install |
| Cursor | ✅ Supported | Auto-discovery |
| VS Code + GitHub Copilot | ✅ Supported | Auto-discovery |
| Antigravity | ✅ Supported | AI-driven install |
| Gemini CLI | ✅ Supported | AI-driven install |
| Pi Agent | ✅ Supported | AI-driven install |

---

## 🔧 Under the Hood

### Multi-Agent Pipeline

The `/understand` command orchestrates 5 specialized agents, and `/understand-domain` adds a 6th:

| Agent | Role |
|-------|------|
| `project-scanner` | Discover files, detect languages and frameworks |
| `file-analyzer` | Extract functions, classes, imports; produce graph nodes and edges |
| `architecture-analyzer` | Identify architectural layers |
| `tour-builder` | Generate guided learning tours |
| `graph-reviewer` | Validate graph completeness and referential integrity (runs inline by default; use `--review` for full LLM review) |
| `domain-analyzer` | Extract business domains, flows, and process steps (used by `/understand-domain`) |

File analyzers run in parallel (up to 5 concurrent, 20-30 files per batch). Supports incremental updates — only re-analyzes files that changed since the last run.

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Run the tests (`pnpm --filter @understand-anything/core test`)
4. Commit your changes and open a pull request

Please open an issue first for major changes so we can discuss the approach.

---

<p align="center">
  <strong>Stop reading code blind. Start understanding everything.</strong>
</p>

## Star History

<a href="https://www.star-history.com/?repos=Lum1104%2FUnderstand-Anything&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&legend=top-left" />
 </picture>
</a>

<p align="center">
  MIT License &copy; <a href="https://github.com/Lum1104">Lum1104</a>
</p>
