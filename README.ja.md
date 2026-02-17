🇺🇸 [English](README.md) | 🇯🇵 日本語

# entire-setup-ccweb

[Entire CLI](https://github.com/entireio/cli) を Claude Code Web (ccweb) で使うためのセットアップツール。

リポジトリに対して一度実行するだけで、ccweb セッション開始時に Entire CLI の自動インストール・有効化と GitHub 直接 push を設定します。

> **非公式**コミュニティツールです。Entire CLI プロジェクト自体の一部ではありません。

## ccweb で何が問題？

`entire enable` でローカルにセットアップしたリポジトリを ccweb で開くと、以下の問題が発生します:

1. **`entire` バイナリが無い** — ccweb 環境には Entire CLI がプリインストールされていない
2. **シャドウブランチを push できない** — ccweb のプロキシは現在のワーキングブランチ以外への push を制限するため、`entire/` プレフィクスのチェックポイントブランチが push できない

## セットアップ

```bash
# 1. ccweb 用セットアップを追加
npx entire-setup-ccweb

# 2. コミット＆プッシュ
git add .claude/
git commit -m "Add ccweb setup for Entire CLI"
git push
```

ローカルで `entire enable` 済みなら ccweb でも即座に動作します。未実行でも ccweb 初回セッションで `entire enable --agent claude-code` が自動実行されます。

### ccweb 環境の要件

- **ネットワークアクセス**: 「信頼済み」(Trusted) 以上が必要（バイナリのダウンロードと GitHub push に必要）

### ccweb 環境変数の設定

チェックポイントを記録するには、ccweb のカスタム環境に `GITHUB_TOKEN` の設定が必要です。未設定だと Entire CLI はインストールされますが、シャドウブランチを push できずチェックポイントが記録されません。

#### GITHUB_TOKEN の取得

1. [GitHub > Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens) を開く
2. **Fine-grained tokens** → 「Generate new token」
   - **Repository access**: 対象リポジトリを選択
   - **Permissions** → Repository permissions → **Contents**: Read and write
3. トークンをコピー

Classic token の場合は `repo` スコープを付与してください。

#### ccweb 環境への設定

[Settings > Claude Code](https://claude.ai/settings) から環境を編集し、環境変数に追加:

```
GITHUB_TOKEN=ghp_xxxxx
```

## 何をするの？

### `npx entire-setup-ccweb`（ローカルで一回）

git リポジトリルートを自動検出するため、サブディレクトリからでも実行できます。対象リポジトリに以下を追加:

- `.claude/settings.json` に SessionStart フックを登録
- `.claude/scripts/setup-env.sh` を作成

### `setup-env.sh`（ccweb の毎セッション開始時に自動実行）

`CLAUDE_CODE_REMOTE=true` の場合のみ動作:

1. **Entire CLI インストール** — GitHub Releases からプリビルドバイナリをダウンロード（SHA256 チェックサム検証付き）
2. **Entire CLI 有効化** — 初回インストール時、未 enable なら `entire enable --agent claude-code` を非対話モードで自動実行
3. **直接 GitHub push 設定** — `GITHUB_TOKEN` があれば `pushInsteadOf` でプロキシをバイパス（push のみ。fetch はプロキシ経由のまま）
4. **pre-push フィルタ設置** — 許可されたプレフィクスのブランチのみ push を通す

## push プレフィクスの設定

デフォルトでは `entire/` プレフィクスのブランチのみ直接 push が許可されます。

変更するには `.claude/scripts/setup-env.sh` の先頭を編集してください:

```sh
# スペース区切りで複数指定可能
ALLOWED_PUSH_PREFIXES="entire/ claude/"
```

## ライセンス

MIT
