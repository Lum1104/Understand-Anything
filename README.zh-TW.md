<h1 align="center">Understand Anything</h1>
<p align="center">
  <strong>將任意程式碼庫、Dockerfile 或文件轉化為可探索、可搜尋、可對話的互動式知識圖譜</strong>
  <br />
  <em>支援 Claude Code、Codex、Cursor、Copilot、Gemini CLI 等多平台。</em>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.zh-TW.md">繁體中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.tr-TR.md">Türkçe</a>
</p>

<p align="center">
  <a href="#-快速開始"><img src="https://img.shields.io/badge/快速開始-blue" alt="Quick Start" /></a>
  <a href="https://github.com/Lum1104/Understand-Anything/blob/main/LICENSE"><img src="https://img.shields.io/badge/授權條款-MIT-yellow" alt="License: MIT" /></a>
  <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude_Code-8A2BE2" alt="Claude Code" /></a>
  <a href="#codex"><img src="https://img.shields.io/badge/Codex-000000" alt="Codex" /></a>
  <a href="#vs-code--github-copilot"><img src="https://img.shields.io/badge/Copilot-24292e" alt="Copilot" /></a>
  <a href="#gemini-cli"><img src="https://img.shields.io/badge/Gemini_CLI-4285F4" alt="Gemini CLI" /></a>
  <a href="#opencode"><img src="https://img.shields.io/badge/OpenCode-38bdf8" alt="OpenCode" /></a>
  <a href="https://lum1104.github.io/Understand-Anything"><img src="https://img.shields.io/badge/專案首頁-d4a574" alt="Homepage" /></a>
  <a href="https://lum1104.github.io/Understand-Anything/demo/"><img src="https://img.shields.io/badge/線上展示-00c853" alt="Live Demo" /></a>
</p>

<p align="center">
  <img src="assets/hero.jpg" alt="Understand Anything — 將任何程式碼庫轉換為互動式知識圖譜" width="800" />
</p>

---

> [!TIP]
> **衷心感謝社群的支持！** Understand-Anything 收到的關注超出了我的預期。如果這個工具能幫你從複雜的資料中理出一點頭緒，少走幾分鐘彎路，那我開發它的初衷就達到了。🚀

**當你剛加入一個新團隊，面對 20 萬行程式碼，你從哪裡開始？**

Understand Anything 是一個基於 [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 的外掛程式，透過多智能體（multi-agent）架構分析你的專案，建構包含檔案、函式、類別以及相依關係的知識圖譜，並提供一個視覺化互動介面，幫助你理解整個系統。不再「盲讀程式碼」，而是從全局視角理解系統結構。

---

## ✨ 核心功能

### 探索程式碼結構圖

將你的程式碼庫以互動式知識圖譜呈現——每個檔案、函式和類別都是可點擊、可搜尋、可探索的節點。選取任意節點即可檢視淺顯易懂的摘要、依賴關係和引導式學習路徑。

<p align="center">
  <img src="assets/overview-structural.gif" alt="結構圖——探索檔案、函式、類別及其關係" width="750" />
</p>

### 理解業務邏輯

切換到領域視圖，查看程式碼如何對應到真實的業務流程——以水平圖的形式展示領域、流程和步驟。

<p align="center">
  <img src="assets/overview-domain.gif" alt="領域圖——業務領域、流程和處理步驟" width="750" />
</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🧭 引導式學習</h3>
      <p>自動產生架構學習路徑，按相依順序學習。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🔍 語意搜尋</h3>
      <p>支援模糊搜尋 + 語意搜尋，例如搜尋「哪些部分處理身分驗證？」即可在整個圖中獲取相關結果。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📊 變更影響分析</h3>
      <p>提交變更前，查看變更會影響系統的哪些部分。了解變更對整個程式碼庫的連鎖反應。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🎭 使用者角色自適應 UI</h3>
      <p>根據使用者類型（初級開發 / 專案經理 / 進階使用者）調整其詳細程度。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🏗️ 層級視覺化</h3>
      <p>按架構層級自動分組 — API、服務、資料、UI、系統工具 — 並附有顏色編碼圖例。</p>
    </td>
    <td width="50%" valign="top">
      <h3>📚 語言概念</h3>
      <p>12 種程式設計模式（泛型、閉包、裝飾器等）將在上下文中逐一解釋。</p>
    </td>
  </tr>
</table>

---

## 🚀 快速開始

### 1. 安裝外掛程式

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### 2. 分析你的程式碼庫

```bash
/understand
```

多智能體（multi-agent）架構會：掃描你的專案，提取函式 / 類別 / 相依關係，建構知識圖譜並儲存至 `.understand-anything/knowledge-graph.json`。

### 3. 開啟資料看板

```bash
/understand-dashboard
```

開啟互動式網頁資料看板，你的程式碼庫將以圖表形式呈現 — 按架構層級進行顏色編碼，支援搜尋和點擊。選擇任意節點即可查看其程式碼、關係以及簡明易懂的解釋。

### 4. 深度使用

```bash
# 詢問任意程式碼庫的問題
/understand-chat 付款流程是怎麼運作的？

# 分析目前修改的影響
/understand-diff

# 深入理解某個檔案
/understand-explain src/auth/login.ts

# 為新團隊成員產生指南
/understand-onboard

# 提取業務領域知識（領域、流程、步驟）
/understand-domain
```

---

## 🌐 多平台支援

Understand-Anything 可在多個 AI 編碼平台上執行。

### Claude Code（原生支援）

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### Codex

告訴 Codex：
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.codex/INSTALL.md
```

### OpenCode

告訴 OpenCode：
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.opencode/INSTALL.md
```

### OpenClaw

告訴 OpenClaw：
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.openclaw/INSTALL.md
```

### Cursor

複製此儲存庫後，Cursor 會自動透過 `.cursor-plugin/plugin.json` 檔案發現外掛程式。無需手動安裝 — 只需複製並在 Cursor 中開啟即可。

### VS Code + GitHub Copilot

安裝 GitHub Copilot 擴充功能（v1.108+）後，VS Code 會透過 `.copilot-plugin/plugin.json` 自動發現外掛程式，複製後直接在 VS Code 中開啟即可，無需手動安裝。

若需要在所有專案中使用（個人技能），告訴 GitHub Copilot：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.vscode/INSTALL.md
```

### Antigravity

告訴 Antigravity：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.antigravity/INSTALL.md
```

### Gemini CLI

告訴 Gemini CLI：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.gemini/INSTALL.md
```

### Pi Agent

告訴 Pi Agent：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.pi/INSTALL.md
```

### 多平台相容性

| 平台 | 狀態 | 安裝方式 |
|----------|--------|----------------|
| Claude Code | ✅ 原生 | 外掛程式市集 |
| Codex | ✅ 支援 | AI 驅動安裝 |
| OpenCode | ✅ 支援 | AI 驅動安裝 |
| OpenClaw | ✅ 支援 | AI 驅動安裝 |
| Cursor | ✅ 支援 | 自動發現 |
| VS Code + GitHub Copilot | ✅ 支援 | 自動發現 |
| Antigravity | ✅ 支援 | AI 驅動安裝 |
| Gemini CLI | ✅ 支援 | AI 驅動安裝 |
| Pi Agent | ✅ 支援 | AI 驅動安裝 |

---

## 🔧 技術原理

### 多智能體架構

`/understand` 指令呼叫 5 個 agent，`/understand-domain` 額外增加第 6 個：

| Agent | 職責 |
|-------|------|
| `project-scanner` | 掃描專案檔案，偵測語言和框架 |
| `file-analyzer` | 提取程式碼結構（函式、類別和匯入），產生圖節點和邊 |
| `architecture-analyzer` | 識別架構層 |
| `tour-builder` | 產生引導式學習路徑 |
| `graph-reviewer` | 驗證圖的完整性和參考完整性 |
| `domain-analyzer` | 提取業務領域、流程和處理步驟（由 `/understand-domain` 使用） |

檔案分析器並行執行（最多 3 個並發）。支援增量更新 — 僅重新分析自上次執行以來發生變更的檔案。

---

## 🤝 貢獻

歡迎貢獻！以下是貢獻指南：

1. Fork 專案
2. 新建分支（`git checkout -b feature/my-feature`）
3. 執行測試（`pnpm --filter @understand-anything/core test`）
4. 提交變更並建立 PR

對於重大變更，請先提交 issue，以便我們討論解決方案。

---

<p align="center">
  <strong>不再盲讀程式碼，而是理解整個系統</strong>
</p>

## Star 歷史記錄

<a href="https://www.star-history.com/?repos=Lum1104%2FUnderstand-Anything&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/image?repos=Lum1104/Understand-Anything&type=date&legend=top-left" />
 </picture>
</a>

<p align="center">
  MIT 授權條款 &copy; <a href="https://github.com/Lum1104">Lum1104</a>
</p>
