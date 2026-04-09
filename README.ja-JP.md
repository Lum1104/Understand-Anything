<h1 align="center">Understand Anything</h1>

<p align="center">
  <strong>あらゆるコードベース、Dockerfile、ドキュメントを、探索・検索・質問ができるインタラクティブなナレッジグラフに変換します。</strong>
  <br />
  <em>Claude Code、Codex、Cursor、Copilot、Gemini CLI など、マルチプラットフォーム対応。</em>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">简体中文</a> | <a href="README.zh-TW.md">繁體中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.tr-TR.md">Türkçe</a>
</p>

<p align="center">
  <a href="#-クイックスタート"><img src="https://img.shields.io/badge/Quick_Start-blue" alt="クイックスタート" /></a>
  <a href="https://github.com/Lum1104/Understand-Anything/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow" alt="License: MIT" /></a>
  <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude_Code-8A2BE2" alt="Claude Code" /></a>
  <a href="#codex"><img src="https://img.shields.io/badge/Codex-000000" alt="Codex" /></a>
  <a href="#vs-code--github-copilot"><img src="https://img.shields.io/badge/Copilot-24292e" alt="Copilot" /></a>
  <a href="#gemini-cli"><img src="https://img.shields.io/badge/Gemini_CLI-4285F4" alt="Gemini CLI" /></a>
  <a href="#opencode"><img src="https://img.shields.io/badge/OpenCode-38bdf8" alt="OpenCode" /></a>
  <a href="https://lum1104.github.io/Understand-Anything"><img src="https://img.shields.io/badge/Homepage-d4a574" alt="ホームページ" /></a>
  <a href="https://lum1104.github.io/Understand-Anything/demo/"><img src="https://img.shields.io/badge/Live_Demo-00c853" alt="ライブデモ" /></a>
</p>

<p align="center">
  <img src="assets/hero.jpg" alt="Understand Anything — あらゆるコードベースをインタラクティブなナレッジグラフに変換" width="800" />
</p>

---

> [!TIP]
> **コミュニティの皆さんに感謝！** Understand-Anythingへのサポートは本当に素晴らしいものです。このツールが複雑なコードを理解する時間を少しでも短縮できたなら、それが私の望みです。🚀

**新しいチームに参加したばかり。コードベースは20万行。どこから手をつければいいのか？**

Understand Anything は [Claude Code](https://docs.anthropic.com/en/docs/claude-code) プラグインです。マルチエージェントパイプラインでプロジェクトを分析し、すべてのファイル・関数・クラス・依存関係のナレッジグラフを構築して、インタラクティブなダッシュボードで視覚的に探索できるようにします。コードを闇雲に読むのはやめて、全体像を把握しましょう。

---

## ✨ 機能

### コード構造グラフを探索

コードベースをインタラクティブなナレッジグラフとして表示——すべてのファイル、関数、クラスがクリック・検索・探索可能なノードです。ノードを選択すると、わかりやすい要約、依存関係、ガイド付きツアーが表示されます。

<p align="center">
  <img src="assets/overview-structural.gif" alt="構造グラフ——ファイル、関数、クラスとその関係を探索" width="750" />
</p>

### ビジネスロジックを理解

ドメインビューに切り替えると、コードが実際のビジネスプロセスにどう対応するかが一目でわかります——ドメイン、フロー、ステップが横方向のグラフとして表示されます。

<p align="center">
  <img src="assets/overview-domain.gif" alt="ドメイングラフ——ビジネスドメイン、フロー、プロセスステップ" width="750" />
</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🧭 ガイドツアー</h3>
      <p>依存関係順に並べられた、自動生成のアーキテクチャウォークスルー。正しい順序でコードベースを学べます。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🔍 ファジー＆セマンティック検索</h3>
      <p>名前や意味で何でも検索できます。「認証を処理する部分は？」と検索すれば、グラフ全体から関連する結果が得られます。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>📊 差分影響分析</h3>
      <p>コミット前に、変更がシステムのどの部分に影響するかを確認。コードベース全体への波及効果を把握できます。</p>
    </td>
    <td width="50%" valign="top">
      <h3>🎭 ペルソナ適応型UI</h3>
      <p>ダッシュボードは、ジュニア開発者・PM・パワーユーザーなど、ユーザーに応じて詳細レベルを調整します。</p>
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <h3>🏗️ レイヤー可視化</h3>
      <p>API・Service・Data・UI・Utilityなどのアーキテクチャ層ごとに自動グループ化。色分けされた凡例付き。</p>
    </td>
    <td width="50%" valign="top">
      <h3>📚 言語コンセプト</h3>
      <p>ジェネリクス・クロージャ・デコレータなど12のプログラミングパターンが、出現箇所のコンテキストで説明されます。</p>
    </td>
  </tr>
</table>

---

## 🚀 クイックスタート

### 1. プラグインをインストール

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### 2. コードベースを分析

```bash
/understand
```

マルチエージェントパイプラインがプロジェクトをスキャンし、すべてのファイル・関数・クラス・依存関係を抽出して、`.understand-anything/knowledge-graph.json` にナレッジグラフを保存します。

### 3. ダッシュボードで探索

```bash
/understand-dashboard
```

インタラクティブなWebダッシュボードが開き、コードベースがグラフとして可視化されます。アーキテクチャ層ごとに色分けされ、検索やクリックが可能です。ノードを選択すると、コード・関連関係・平易な説明が表示されます。

### 4. さらに学ぶ

```bash
# コードベースについて何でも質問
/understand-chat 支払いフローはどう動いているの？

# 現在の変更の影響を分析
/understand-diff

# 特定のファイルや関数を詳しく調べる
/understand-explain src/auth/login.ts

# 新メンバー向けのオンボーディングガイドを生成
/understand-onboard

# ビジネスドメイン知識を抽出（ドメイン、フロー、ステップ）
/understand-domain
```

---

## 🌐 マルチプラットフォームインストール

Understand-Anythingは複数のAIコーディングプラットフォームで動作します。

### Claude Code（ネイティブ）

```bash
/plugin marketplace add Lum1104/Understand-Anything
/plugin install understand-anything
```

### Codex

Codexに以下を伝えてください：
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.codex/INSTALL.md
```

### OpenCode

OpenCodeに以下を伝えてください：
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.opencode/INSTALL.md
```

### OpenClaw

OpenClawに以下を伝えてください：
```
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.openclaw/INSTALL.md
```

### Cursor

Cursorはこのリポジトリをクローンすると `.cursor-plugin/plugin.json` 経由でプラグインを自動検出します。手動インストールは不要です — クローンしてCursorで開くだけです。

### VS Code + GitHub Copilot

GitHub Copilot拡張機能（v1.108+）をインストールしたVS Codeは、`.copilot-plugin/plugin.json` 経由でプラグインを自動検出します。クローンしてVS Codeで開くだけで、手動インストールは不要です。

全プロジェクトで使用するパーソナルスキルとして設定する場合は、GitHub Copilotに以下を伝えてください：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.vscode/INSTALL.md
```

### Antigravity

Antigravityに以下を伝えてください：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.antigravity/INSTALL.md
```

### Gemini CLI

Gemini CLIに以下を伝えてください：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.gemini/INSTALL.md
```

### Pi Agent

Pi Agentに以下を伝えてください：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.pi/INSTALL.md
```

### プラットフォーム互換性

| プラットフォーム | ステータス | インストール方法 |
|----------|--------|----------------|
| Claude Code | ✅ ネイティブ | プラグインマーケットプレイス |
| Codex | ✅ サポート | AI駆動インストール |
| OpenCode | ✅ サポート | AI駆動インストール |
| OpenClaw | ✅ サポート | AI駆動インストール |
| Cursor | ✅ サポート | 自動検出 |
| VS Code + GitHub Copilot | ✅ サポート | 自動検出 |
| Antigravity | ✅ サポート | AI駆動インストール |
| Gemini CLI | ✅ サポート | AI駆動インストール |
| Pi Agent | ✅ サポート | AI駆動インストール |

---

## 🔧 内部の仕組み

### マルチエージェントパイプライン

`/understand` コマンドは5つの専門エージェントをオーケストレーションし、`/understand-domain` は6つ目を追加します：

| エージェント | 役割 |
|-------|------|
| `project-scanner` | ファイルの検出、言語やフレームワークの検出 |
| `file-analyzer` | 関数・クラス・インポートの抽出、グラフノードとエッジの生成 |
| `architecture-analyzer` | アーキテクチャ層の特定 |
| `tour-builder` | ガイド学習ツアーの生成 |
| `graph-reviewer` | グラフの完全性と参照整合性の検証 |
| `domain-analyzer` | ビジネスドメイン、フロー、処理ステップの抽出（`/understand-domain` で使用） |

ファイルアナライザーは並列実行されます（最大3つ同時）。インクリメンタル更新に対応しており、前回の実行から変更されたファイルのみを再分析します。

---

## 🤝 コントリビュート

コントリビュートを歓迎します！始め方は以下の通りです：

1. リポジトリをフォーク
2. フィーチャーブランチを作成（`git checkout -b feature/my-feature`）
3. テストを実行（`pnpm --filter @understand-anything/core test`）
4. 変更をコミットしてプルリクエストを作成

大きな変更については、まずIssueを作成してアプローチを議論してください。

---

<p align="center">
  <strong>コードを闇雲に読むのはやめよう。すべてを理解しよう。</strong>
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
