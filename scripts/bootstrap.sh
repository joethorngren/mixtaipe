#!/usr/bin/env bash
# ============================================================================
# bootstrap.sh — one-shot setup for mixtAIpe on macOS.
#
# Usage (from inside the repo):
#   bash scripts/bootstrap.sh
#
# Or from anywhere (uses the script's own location, not your CWD):
#   bash /path/to/mixtaipe/scripts/bootstrap.sh
#
# What it does:
#   1. Switch to Node 22 via nvm (installs nvm if missing).
#   2. Wipe + reinstall node_modules with pnpm. Intentional wipe: if deps
#      were previously installed under a different Node major (e.g. the
#      Homebrew Node 25 that triggered the DeploymentNotConfiguredForNodeActions
#      error this script was written for), cached native bindings can segfault
#      under Node 22. A clean install is cheap insurance.
#   3. Open a new Terminal tab running `npx convex dev`   (keep this running).
#   4. Open a new Terminal tab running `pnpm dev`         (keep this running).
#   5. Open http://localhost:3000 in your browser.
#
# First-run caveat: on step 3 Convex will prompt you to log in and pick a
# team the FIRST time. Do that in the tab it opens. After login, the watcher
# finishes deploying and pnpm dev can connect.
# ============================================================================

set -euo pipefail

# --- Resolve repo root from the script's own location (clone-portable) ------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
NODE_VERSION="22"

cd "$PROJECT_DIR"

# --- 1. nvm + Node 22 --------------------------------------------------------
if [ ! -s "$HOME/.nvm/nvm.sh" ]; then
  echo "==> nvm not found — installing via scripts/install-nvm.sh"
  bash "$SCRIPT_DIR/install-nvm.sh"
fi

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

if ! nvm ls "$NODE_VERSION" >/dev/null 2>&1; then
  echo "==> Installing Node ${NODE_VERSION}..."
  nvm install "$NODE_VERSION"
fi
nvm use "$NODE_VERSION" >/dev/null

echo "==> node: $(node --version)"

# --- 2. pnpm -----------------------------------------------------------------
if ! command -v pnpm >/dev/null 2>&1; then
  echo "==> Installing pnpm globally..."
  npm i -g pnpm
fi

echo "==> Wiping node_modules + reinstalling (see header for why)..."
rm -rf node_modules
pnpm install

# --- 3+4. Launch Convex dev + Next dev in new Terminal tabs ------------------
# Each spawned tab explicitly sources nvm and pins Node ${NODE_VERSION}. We do
# not trust that new Terminal tabs inherit the parent's Node — they don't, and
# if the user's ~/.zshrc doesn't load nvm (or loads a different default), the
# dev loop silently breaks. Being explicit here is the whole point of a
# bootstrap script.

open_tab() {
  # Write the command to a tempfile to avoid AppleScript quoting hell.
  local cmd="$1"
  local script
  script="$(mktemp -t mixtaipe_tab)"
  {
    echo "#!/usr/bin/env bash"
    echo "set -euo pipefail"
    echo "export NVM_DIR=\"\$HOME/.nvm\""
    echo "[ -s \"\$NVM_DIR/nvm.sh\" ] && . \"\$NVM_DIR/nvm.sh\""
    echo "nvm use ${NODE_VERSION} >/dev/null"
    echo "cd \"$PROJECT_DIR\""
    echo "$cmd"
  } >"$script"
  chmod +x "$script"

  osascript -e "tell application \"Terminal\" to activate" \
            -e "tell application \"System Events\" to keystroke \"t\" using {command down}" \
            -e "delay 0.4" \
            -e "tell application \"Terminal\" to do script \"bash $script\" in front window"
}

echo "==> Opening Terminal tab for: npx convex dev"
open_tab "npx convex dev"

echo "    (waiting 3s so the Convex tab gets the focus first)"
sleep 3

echo "==> Opening Terminal tab for: pnpm dev"
open_tab "pnpm dev"

# --- 5. Browser --------------------------------------------------------------
echo "==> Giving Next 5s to boot, then opening browser..."
sleep 5
open "http://localhost:3000"

cat <<'EOF'

==> Bootstrap done.

Two new Terminal tabs are open:
  - Tab A: `npx convex dev`  ← leave running. Log in if prompted.
  - Tab B: `pnpm dev`        ← leave running. Serves localhost:3000.

If the browser shows "Convex not configured" or the feed is empty,
wait for Tab A to finish deploying, then refresh.

Once the feed loads, seed the chips + run a smoke test:

    pnpm seed:topics
    pnpm smoke:topic

And set your Google key so Lyria + Gemini work for real:

    npx convex env set GOOGLE_AI_API_KEY <your_key>
    # grab a key at https://aistudio.google.com/app/apikey

EOF
