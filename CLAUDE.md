# CLAUDE.md

Claude Code (claude.ai/code) 向けのガイダンス。

## プロジェクト概要

`entire-setup-ccweb` は、`entire enable` 設定済みのリポジトリを Claude Code Web (ccweb) で使えるようにする npm パッケージ。ローカルで `npx entire-setup-ccweb` を一度実行すると、ccweb セッション開始時に自動実行されるスクリプトとフック設定を非破壊的に追加する。

**非公式**コミュニティツール。Entire CLI プロジェクト自体の一部ではない。

## 使い方

```bash
# 1. ローカルで entire を有効化（まだなら）
entire enable

# 2. ccweb 用のセットアップを追加
npx entire-setup-ccweb

# 3. コミット＆プッシュ
git add .claude/
git commit -m "Add ccweb setup for Entire CLI"
git push

# 4. ccweb でリポジトリを開く → SessionStart で自動セットアップ
```

## 前提

- 対象リポジトリで `entire enable` が実行済みであること（`.claude/settings.json` に entire の hooks、`.entire/settings.json` が存在する状態）
- このツールは entire のセットアップは行わない。ccweb 環境での以下を解決する:
  - `entire` バイナリが無い問題（`go install` で自動インストール）
  - ccweb プロキシが現在のブランチ以外への push を制限する問題（`GITHUB_TOKEN` + `pushInsteadOf` で直接 GitHub に push し、pre-push フィルタで許可プレフィクスのみ通す）

## アーキテクチャ

### setup.mjs（ローカルで一回だけ実行）

エントリポイントは `bin/setup.mjs`（Node.js ESM、依存なし）。`git rev-parse --show-toplevel` で**リポジトリルート**を割り出し、そこに対して2つの操作を行う:

1. **`.claude/settings.json` に SessionStart フックを追加** — `sh .claude/scripts/setup-env.sh` を既存フックの先頭に追加（重複検出付き）。`Bash(sh .claude/scripts/setup-env.sh)` の permission も追加
2. **`.claude/scripts/setup-env.sh` を作成** — テンプレートからコピー。既にファイルがあればスキップ

### setup-env.sh（ccweb の毎セッション開始時に実行）

`CLAUDE_CODE_REMOTE=true` の場合のみ動作。以下を順に実行:

1. **Entire CLI インストール** — `go install` で entire バイナリをインストール（既にあればスキップ）
2. **直接 GitHub push アクセス設定** — `GITHUB_TOKEN` が設定されていれば、origin のプロキシ URL を検出し `pushInsteadOf` で直接 GitHub に向ける（push のみ。fetch はプロキシのまま）
3. **pre-push フィルタ設置** — `.git/hooks/pre-push` に許可プレフィクスチェックを設置。その後 `entire enable` が走るとこのフックをバックアップしてチェーンする

許可プレフィクスは setup-env.sh 先頭の `ALLOWED_PUSH_PREFIXES` 変数で設定（デフォルト: `entire/`）。

テンプレートは `templates/` に配置し、package.json の `files` フィールドで npm パッケージに同梱。

## コマンド

ビルド・テスト・リントは未設定。依存なしの ESM パッケージ。

```bash
# ローカル実行（リポジトリ内のどこからでも OK）
node /path/to/entire-setup-ccweb/bin/setup.mjs

# npx 経由のテスト（サブディレクトリからでも動作）
cd /some/test-repo/sub/dir && npx /path/to/entire-setup-ccweb
```

## 設計方針

- **非破壊的**: `.claude/settings.json` へはコマンド文字列の重複チェック付きで追加。既存ファイルは上書きしない
- **依存なし**: Node.js 組み込みモジュール（`fs`, `path`, `url`, `child_process`）のみ使用
- **setup-env.sh は冪等**: セッション開始時に毎回実行しても安全。`entire` が PATH にあればスキップ。ローカル環境（`CLAUDE_CODE_REMOTE` 未設定）では何もしない
- **GITHUB_TOKEN は実質必須**: 未設定だと entire はインストールされるがシャドウブランチを push できずチェックポイントが記録されない。ccweb のカスタム環境の環境変数に設定する想定
- **push 制限**: `pushInsteadOf`（push のみ直通）+ pre-push フィルタで許可プレフィクスのブランチのみ push 可能。デフォルトは `entire/`
