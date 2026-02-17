#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatesDir = join(__dirname, "..", "templates");

function findRepoRoot() {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
  } catch {
    console.error("Error: not inside a git repository.");
    process.exit(1);
  }
}

const projectDir = findRepoRoot();

// --- Helpers ---

const color = !process.env.NO_COLOR && process.stdout.isTTY;
const fmt = {
  bold:  (s) => color ? `\x1b[1m${s}\x1b[22m` : s,
  dim:   (s) => color ? `\x1b[2m${s}\x1b[22m` : s,
  green: (s) => color ? `\x1b[32m${s}\x1b[39m` : s,
  yellow:(s) => color ? `\x1b[33m${s}\x1b[39m` : s,
  cyan:  (s) => color ? `\x1b[36m${s}\x1b[39m` : s,
};
const log = {
  done: (msg) => console.log(`  ${fmt.green("✔")} ${msg}`),
  skip: (msg) => console.log(`  ${fmt.yellow("–")} ${fmt.dim(msg)}`),
  step: (msg) => console.log(`\n${fmt.cyan("▸")} ${fmt.bold(msg)}`),
  info: (msg) => console.log(`  ${msg}`),
};

function readJSON(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

// --- Add SessionStart hook to .claude/settings.json ---

const SETUP_COMMAND = "sh .claude/scripts/setup-env.sh";
const SETUP_PERMISSION = `Bash(${SETUP_COMMAND})`;

function addSessionStartHook() {
  const claudeDir = join(projectDir, ".claude");
  const settingsPath = join(claudeDir, "settings.json");

  ensureDir(claudeDir);

  let settings = {};
  if (existsSync(settingsPath)) {
    settings = readJSON(settingsPath);
  }

  // Add SessionStart hook (prepend so it runs before entire hooks)
  if (!settings.hooks) settings.hooks = {};
  if (!settings.hooks.SessionStart) settings.hooks.SessionStart = [];

  const alreadyHooked = settings.hooks.SessionStart.some((entry) =>
    entry.hooks?.some((h) => h.command === SETUP_COMMAND)
  );

  if (!alreadyHooked) {
    settings.hooks.SessionStart.unshift({
      matcher: "",
      hooks: [{ type: "command", command: SETUP_COMMAND }],
    });
    log.done("Added SessionStart hook");
  } else {
    log.skip("SessionStart hook already present");
  }

  // Add permission
  if (!settings.permissions) settings.permissions = {};
  if (!settings.permissions.allow) settings.permissions.allow = [];

  if (!settings.permissions.allow.includes(SETUP_PERMISSION)) {
    settings.permissions.allow.push(SETUP_PERMISSION);
    log.done("Added permission for setup-env.sh");
  }

  writeJSON(settingsPath, settings);
}

// --- Create .claude/scripts/setup-env.sh ---

function createSetupScript() {
  const scriptsDir = join(projectDir, ".claude", "scripts");
  const scriptPath = join(scriptsDir, "setup-env.sh");
  const templateContent = readFileSync(join(templatesDir, "setup-env.sh"), "utf8");

  if (existsSync(scriptPath)) {
    const existing = readFileSync(scriptPath, "utf8");

    // Extract user-customized ALLOWED_PUSH_PREFIXES
    const prefixMatch = existing.match(/^ALLOWED_PUSH_PREFIXES="([^"]*)"$/m);
    const templatePrefixMatch = templateContent.match(/^ALLOWED_PUSH_PREFIXES="([^"]*)"$/m);

    // Replace template's default with the user's value
    let newContent = templateContent;
    if (prefixMatch && templatePrefixMatch) {
      newContent = templateContent.replace(templatePrefixMatch[0], prefixMatch[0]);
    }

    if (existing === newContent) {
      log.skip("setup-env.sh is already up to date");
      return;
    }

    writeFileSync(scriptPath, newContent);
    chmodSync(scriptPath, 0o755);
    if (prefixMatch && prefixMatch[1] !== templatePrefixMatch?.[1]) {
      log.done(`Updated setup-env.sh (preserved ALLOWED_PUSH_PREFIXES="${prefixMatch[1]}")`);
    } else {
      log.done("Updated setup-env.sh");
    }
    return;
  }

  ensureDir(scriptsDir);
  writeFileSync(scriptPath, templateContent);
  chmodSync(scriptPath, 0o755);
  log.done("Created .claude/scripts/setup-env.sh");
}

// --- Main ---

console.log(`\n${fmt.bold("entire-setup-ccweb")}`);
console.log(fmt.dim("Setup Entire CLI auto-install for Claude Code Web"));
console.log(fmt.dim(`  repo: ${projectDir}`));

log.step("Configuring hooks");
addSessionStartHook();

log.step("Creating scripts");
createSetupScript();

console.log(`\n${fmt.green("✔")} ${fmt.bold("All done!")} Commit ${fmt.cyan(".claude/")} and push to your repository.`);
console.log(fmt.dim("  On ccweb, Entire will be auto-installed via SessionStart hook.\n"));
