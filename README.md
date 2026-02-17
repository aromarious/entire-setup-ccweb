🇺🇸 English | 🇯🇵 [日本語](README.ja.md)

# entire-setup-ccweb

Setup tool for using [Entire CLI](https://github.com/entireio/cli) on Claude Code Web (ccweb).

Run once on a repository with `entire enable` already configured, and it will automatically install Entire CLI and set up direct GitHub push access on every ccweb session start.

> **Unofficial** community tool. Not part of the Entire CLI project.

## What's the problem on ccweb?

When you open a repository configured with `entire enable` on ccweb, you'll run into these issues:

1. **`entire` binary is missing** — Entire CLI is not pre-installed in the ccweb environment
2. **Can't push shadow branches** — The ccweb proxy restricts push to the current working branch only, so `entire/` prefixed checkpoint branches can't be pushed

## Setup

```bash
# 1. Enable Entire CLI (if not already done)
entire enable

# 2. Add ccweb setup
npx entire-setup-ccweb

# 3. Commit & push
git add .claude/
git commit -m "Add ccweb setup for Entire CLI"
git push
```

### ccweb environment requirements

- **Network access**: "Trusted" or higher is required (needed for downloading binaries and GitHub push)

### Configure ccweb environment variables

To record checkpoints, `GITHUB_TOKEN` must be configured in your ccweb custom environment. Without it, Entire CLI will be installed but shadow branches can't be pushed, so no checkpoints will be recorded.

#### Getting a GITHUB_TOKEN

1. Go to [GitHub > Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. **Fine-grained tokens** → "Generate new token"
   - **Repository access**: Select the target repository
   - **Permissions** → Repository permissions → **Contents**: Read and write
3. Copy the token

For classic tokens, grant the `repo` scope.

#### Adding to ccweb environment

Edit your environment from [Settings > Claude Code](https://claude.ai/settings) and add the environment variable:

```
GITHUB_TOKEN=ghp_xxxxx
```

## What does it do?

### `npx entire-setup-ccweb` (run once locally)

Automatically detects the git repository root, so it works from any subdirectory. Adds the following to the target repository:

- Registers a SessionStart hook in `.claude/settings.json`
- Creates `.claude/scripts/setup-env.sh`

### `setup-env.sh` (runs automatically on every ccweb session start)

Only runs when `CLAUDE_CODE_REMOTE=true`:

1. **Install Entire CLI** — Downloads a pre-built binary from GitHub Releases with SHA256 checksum verification
2. **Configure direct GitHub push** — If `GITHUB_TOKEN` is set, uses `pushInsteadOf` to bypass the proxy (push only; fetch stays proxied)
3. **Install pre-push filter** — Only allows pushing branches matching allowed prefixes

## Push prefix configuration

By default, only branches with the `entire/` prefix are allowed to push directly.

To change this, edit the top of `.claude/scripts/setup-env.sh`:

```sh
# Space-separated, multiple prefixes supported
ALLOWED_PUSH_PREFIXES="entire/ claude/"
```

## License

MIT
