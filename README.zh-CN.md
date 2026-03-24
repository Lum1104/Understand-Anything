<h1 align="center">Understand Anything</h1>
<p align="center">
  <strong>将任意代码库转化为可探索、可搜索、可对话的交互式知识图谱</strong>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.tr-TR.md">Türkçe</a>
</p>

<p align="center">
  <a href="#-快速开始"><img src="https://img.shields.io/badge/快速开始-blue?style=for-the-badge" alt="Quick Start" /></a>
  <a href="https://github.com/Lum1104/Understand-Anything/blob/main/LICENSE"><img src="https://img.shields.io/badge/许可证-MIT-yellow?style=for-the-badge" alt="License: MIT" /></a>
  <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude_Code-插件-8A2BE2?style=for-the-badge" alt="Claude Code Plugin" /></a>
  <a href="https://lum1104.github.io/Understand-Anything"><img src="https://img.shields.io/badge/项目主页-d4a574?style=for-the-badge" alt="Homepage" /></a>
</p>

<p align="center">
  <img src="assets/hero.jpg" alt="Understand Anything — 将任何代码库转换为交互式知识图谱" width="800" />
</p>

---

> [!TIP]
> **衷心感谢社区的支持！** Understand-Anything 收到的关注超出了我的预期。如果这个工具能帮你从复杂的资料中理出一点头绪，少走几分钟弯路，那我开发它的初衷就达到了。🚀

**当你刚加入一个新团队，面对 20 万行代码，你从哪里开始？**

Understand Anything 是一个基于 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 的插件，通过多智能体（multi-agent）架构分析你的项目，构建包含文件、函数、类以及依赖关系的知识图谱，并提供一个可视化交互界面，帮助你理解整个系统。不再“盲读代码”，而是从全局视角理解系统结构。

---

## 🤔 为什么需要它？

阅读代码已经很难，理解整个系统更难。文档往往过时，上手周期长达数周，新功能开发像考古。

Understand Anything 通过结合 **大语言模型（LLM）**与**静态代码分析**去生成一个**动态、可探索的代码知识地图** — 并提供自然语言解释。

---

## 🎯 适用人群

<table>
  <tr>
    <td width="33%" valign="top">
      <h3>👩‍💻 入门级开发者</h3>
      <p>不再被陌生代码淹没。通过结构化引导逐步理解系统架构，每个函数和类都有简明易懂的解释。</p>
    </td>
    <td width="33%" valign="top">
      <h3>📋 产品经理 & 设计师</h3>
      <p>无需阅读代码，也能理解系统逻辑。比如直接提问：“认证流程是怎么实现的？” 便可获得基于实际代码库的清晰答案。</p>
    </td>
    <td width="33%" valign="top">
      <h3>🤖 AI协同开发者</h3>
      <p>让你的 AI 工具深入了解你的项目。在代码审查之前使用<code>/understand-diff</code>，在深入任何模块时使用<code>/understand-explain</code>，或在架构分析中使用 <code>/understand-chat</code></p>
    </td>
  </tr>
</table>

---

## 🚀 快速开始

### 1. 安装插件

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### 2. 分析你的代码库

```bash
/understand
```

多智能体（multi-agent）架构会：扫描你的项目，提取函数 / 类 / 依赖，构建知识图谱保存至`.understand-anything/knowledge-graph.json`.

### 3. 打开数据看板

```bash
/understand-dashboard
```

打开交互式网页数据看板，您的代码库将以图表形式呈现 — 按架构层级进行颜色编码，支持搜索和点击。选择任意节点即可查看其代码、关系以及简明易懂的解释。

### 4. 深度使用

```bash
# 询问任意代码库的问题
/understand-chat How does the payment flow work?

# 分析当前修改的影响
/understand-diff

# 深入理解某个文件
/understand-explain src/auth/login.ts

# 为新团队成员生成指南
/understand-onboard
```

---

## 🌐 多平台支持

Understand-Anything 可在多个 AI 编码平台上运行。

### Claude Code （原生支持）

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### Codex

告诉 Codex:
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.codex/INSTALL.md
```

### OpenCode

告诉 OpenCode:
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.opencode/INSTALL.md
```

### OpenClaw

告诉 OpenClaw:
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.openclaw/INSTALL.md
```

### Cursor

克隆此仓库后，Cursor 会自动通过 `.cursor-plugin/plugin.json`文件发现插件。无需手动安装 — 只需克隆并在 Cursor 中打开即可。

### Antigravity

告诉 Antigravity:
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.antigravity/INSTALL.md
```

### Gemini CLI

告诉 Gemini CLI：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.gemini-cli/INSTALL.md
```

### 多平台兼容

| 平台 | 状态 | 安装方式 |
|----------|--------|----------------|
| Claude Code | ✅ Native | 插件市场 |
| Codex | ✅ 支持 | AI驱动安装 |
| OpenCode | ✅ 支持 | AI驱动安装 |
| OpenClaw | ✅ 支持 | AI驱动安装 |
| Cursor | ✅ 支持 | 自动发现 |
| Antigravity | ✅ 支持 | AI驱动安装 |
| Gemini CLI | ✅ 支持 | AI 驱动安装 |

---

## ✨ 核心功能

<p align="center">
  <img src="assets/overview.png" alt="Dashboard Screenshot" width="800" />
</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🗺️ 交互式知识图谱</h3>
      <p>使用 React Flow 可视化文件、函数、类及其关系。点击任意节点即可查看其代码和连接。</p>
    </td>
    <td width="50%" valign="top">
      <h3>💬 简明语言解释</h3>
      <p>LLM 自动生成解释，让非技术人员也能理解代码。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🧭 引导式学习</h3>
      <p>自动生成架构学习路径，按依赖顺序学习。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🔍 语义搜索</h3>
      <p>支持模糊搜索 + 语义搜索，例如搜索“哪些部分处理身份验证？”即可在整个图中获取相关结果。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📊 变更影响分析</h3>
      <p>提交更改前，查看更改会影响系统的哪些部分。了解更改对整个代码库的连锁反应。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🎭 用户角色自适应 UI</h3>
      <p>根据用户类型（初级开发 / 项目经理 / 高级用户）调整其详细程度。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🏗️ 层级可视化</h3>
      <p>按架构层级自动分组 — API，服务，数据，UI, 系统工具 — 并附有颜色编码图例。</p>
    </td>
    <td width="50%" valign="top">
      <h3>📚 语言概念</h3>
      <p>12 种编程模式（泛型、闭包、装饰器等）将在上下文中逐一解释。</p>
    </td>
  </tr>
</table>

---

## 🔧 技术原理

### 多智能体架构

`/understand` 命令调用 5 个 agent：

| Agent | 职责 |
|-------|------|
| `project-scanner` | 扫描项目文件，检测语言和框架 |
| `file-analyzer` | 提取代码结构（函数、类和导入），生成图节点和边 |
| `architecture-analyzer` | 识别架构层 |
| `tour-builder` | 生成引导式学习路径 |
| `graph-reviewer` | 验证图的完整性和引用完整性 |

文件分析器并行运行（最多 3 个并发）。支持增量更新 — 仅重新分析自上次运行以来发生更改的文件。

### 项目结构

```
understand-anything-plugin/
  .claude-plugin/  — 插件清单
  agents/          — 专业 AI 智能体
  skills/          — Skill 定义 (/understand, /understand-chat, etc.)
  src/             — TypeScript 源代码 (context-builder, diff-analyzer, etc.)
  packages/
    core/          — 分析引擎 (types, persistence, tree-sitter, search, schema, tours)
    dashboard/     — React + TypeScript 网页数据看板
```

### 技术栈

TypeScript, pnpm workspaces, React 18, Vite, TailwindCSS v4, React Flow, Zustand, web-tree-sitter, Fuse.js, Zod, Dagre

### 开发命令

| 命令 | 描述 |
|---------|-------------|
| `pnpm install` | 安装所有依赖项 |
| `pnpm --filter @understand-anything/core build` | 构建核心包 |
| `pnpm --filter @understand-anything/core test` | 运行核心测试 |
| `pnpm --filter @understand-anything/skill build` | 构建插件包 |
| `pnpm --filter @understand-anything/skill test` | 运行插件测试 |
| `pnpm --filter @understand-anything/dashboard build` | 构建数据看板 |
| `pnpm dev:dashboard` | 启动数据看板开发服务器 |

---

## 🤝 贡献

欢迎贡献！以下是贡献指南：

1. Fork 项目
2. 新建分支 (`git checkout -b feature/my-feature`)
3. 运行测试 (`pnpm --filter @understand-anything/core test`)
4. 提交更改并创建一个PR请求

对于重大变更，请先提交 issue，以便我们讨论解决方案。

---

<p align="center">
  <strong>不再盲读代码，而是理解整个系统</strong>
</p>

## Star 历史记录

<a href="https://www.star-history.com/?repos=Lum1104%2FUnderstand-Anything&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&legend=top-left" />
 </picture>
</a>

<p align="center">
  MIT 许可证 &copy; <a href="https://github.com/Lum1104">Lum1104</a>
</p>
