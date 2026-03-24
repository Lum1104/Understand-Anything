<h1 align="center">Understand Anything</h1>

<p align="center">
  <strong>あらゆるコードベースを、探索・検索・質問ができるインタラクティブなナレッジグラフに変換します。</strong>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README.zh-CN.md">中文</a> | <a href="README.ja-JP.md">日本語</a> | <a href="README.tr-TR.md">Türkçe</a>
</p>

<p align="center">
  <a href="#-クイックスタート"><img src="https://img.shields.io/badge/Quick_Start-blue?style=for-the-badge" alt="クイックスタート" /></a>
  <a href="https://github.com/Lum1104/Understand-Anything/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="License: MIT" /></a>
  <a href="https://docs.anthropic.com/en/docs/claude-code"><img src="https://img.shields.io/badge/Claude_Code-Plugin-8A2BE2?style=for-the-badge" alt="Claude Code Plugin" /></a>
  <a href="https://lum1104.github.io/Understand-Anything"><img src="https://img.shields.io/badge/Homepage-d4a574?style=for-the-badge" alt="ホームページ" /></a>
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

## 🤔 なぜ必要なのか？

コードを読むのは大変です。コードベース全体を理解するのはさらに大変です。ドキュメントは常に古く、オンボーディングには数週間かかり、新機能の開発はまるで考古学のようです。

Understand Anything は、**LLMの知能**と**静的解析**を組み合わせることでこの問題を解決します。プロジェクトの生きた探索可能なマップを生成し、すべてに平易な日本語の説明が付きます。

---

## 🎯 誰のためのツール？

<table>
  <tr>
    <td width="33%" valign="top">
      <h3>👩‍💻 ジュニア開発者</h3>
      <p>不慣れなコードに溺れるのはもう終わり。アーキテクチャをステップバイステップで案内するガイドツアーで、すべての関数やクラスが平易な言葉で説明されます。</p>
    </td>
    <td width="33%" valign="top">
      <h3>📋 プロダクトマネージャー＆デザイナー</h3>
      <p>コードを読まなくても、システムが実際にどう動くかを理解できます。「認証はどう動いているの？」のような質問をすれば、実際のコードベースに基づいた明確な回答が得られます。</p>
    </td>
    <td width="33%" valign="top">
      <h3>🤖 AI活用開発者</h3>
      <p>AIツールにプロジェクトの深いコンテキストを与えましょう。コードレビュー前に <code>/understand-diff</code>、モジュールの詳細調査に <code>/understand-explain</code>、アーキテクチャの推論に <code>/understand-chat</code> を使えます。</p>
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

### Antigravity

Antigravityに以下を伝えてください：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.antigravity/INSTALL.md
```

### Gemini CLI

Gemini CLI に以下のように伝えます：
```text
Fetch and follow instructions from https://raw.githubusercontent.com/Lum1104/Understand-Anything/refs/heads/main/.gemini-cli/INSTALL.md
```

### プラットフォーム互換性

| プラットフォーム | ステータス | インストール方法 |
|----------|--------|----------------|
| Claude Code | ✅ ネイティブ | プラグインマーケットプレイス |
| Codex | ✅ サポート | AI駆動インストール |
| OpenCode | ✅ サポート | AI駆動インストール |
| OpenClaw | ✅ サポート | AI駆動インストール |
| Cursor | ✅ サポート | 自動検出 |
| Antigravity | ✅ サポート | AI駆動インストール |
| Gemini CLI | ✅ サポート | AI 主導のインストール |

---

## ✨ 機能

<p align="center">
  <img src="assets/overview.png" alt="ダッシュボードスクリーンショット" width="800" />
</p>

<table>
  <tr>
    <td width="50%" valign="top">
      <h3>🗺️ インタラクティブナレッジグラフ</h3>
      <p>ファイル・関数・クラスとそれらの関係をReact Flowで可視化。ノードをクリックするとコードと接続関係が表示されます。</p>
    </td>
    <td width="50%" valign="top">
      <h3>💬 平易な言葉での説明</h3>
      <p>すべてのノードがLLMによって説明されるため、技術者でなくても、それが何をしているのか、なぜ存在するのかを理解できます。</p>
    </td>
  </tr>
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

## 🔧 内部の仕組み

### マルチエージェントパイプライン

`/understand` コマンドは5つの専門エージェントをオーケストレーションします：

| エージェント | 役割 |
|-------|------|
| `project-scanner` | ファイルの検出、言語やフレームワークの検出 |
| `file-analyzer` | 関数・クラス・インポートの抽出、グラフノードとエッジの生成 |
| `architecture-analyzer` | アーキテクチャ層の特定 |
| `tour-builder` | ガイド学習ツアーの生成 |
| `graph-reviewer` | グラフの完全性と参照整合性の検証 |

ファイルアナライザーは並列実行されます（最大3つ同時）。インクリメンタル更新に対応しており、前回の実行から変更されたファイルのみを再分析します。

### プロジェクト構成

```
understand-anything-plugin/
  .claude-plugin/  — プラグインマニフェスト
  agents/          — 専門AIエージェント
  skills/          — スキル定義（/understand、/understand-chatなど）
  src/             — TypeScriptソース（context-builder、diff-analyzerなど）
  packages/
    core/          — 分析エンジン（types、persistence、tree-sitter、search、schema、tours）
    dashboard/     — React + TypeScript Webダッシュボード
```

### 技術スタック

TypeScript、pnpm workspaces、React 18、Vite、TailwindCSS v4、React Flow、Zustand、web-tree-sitter、Fuse.js、Zod、Dagre

### 開発コマンド

| コマンド | 説明 |
|---------|-------------|
| `pnpm install` | すべての依存関係をインストール |
| `pnpm --filter @understand-anything/core build` | coreパッケージをビルド |
| `pnpm --filter @understand-anything/core test` | coreテストを実行 |
| `pnpm --filter @understand-anything/skill build` | プラグインパッケージをビルド |
| `pnpm --filter @understand-anything/skill test` | プラグインテストを実行 |
| `pnpm --filter @understand-anything/dashboard build` | ダッシュボードをビルド |
| `pnpm dev:dashboard` | ダッシュボード開発サーバーを起動 |

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
