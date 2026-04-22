#!/usr/bin/env bash
# ============================================================================
# install-nvm.sh — install nvm + Node 22 LTS for this project.
#
# Convex "use node" actions only support Node 18, 20, 22, or 24. If you're on
# an odd-numbered Node (like v25), `npx convex dev` refuses to push actions.
# This script installs nvm, pulls Node 22, sets it as default, and leaves
# your existing Node install alone (nvm just shadows it via PATH).
#
# Usage: bash scripts/install-nvm.sh
# ============================================================================

set -euo pipefail

NVM_VERSION="v0.39.7"
NODE_VERSION="22"

echo "==> Installing nvm ${NVM_VERSION}..."
if [ -d "$HOME/.nvm" ] && [ -s "$HOME/.nvm/nvm.sh" ]; then
  echo "    nvm already installed at $HOME/.nvm — skipping download."
else
  curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
fi

# Load nvm into THIS shell (the installer only appends to rc files).
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

if ! command -v nvm >/dev/null 2>&1; then
  echo "!! nvm did not load. Open a new terminal tab and re-run this script."
  exit 1
fi

echo "==> Installing Node ${NODE_VERSION}..."
nvm install "${NODE_VERSION}"
nvm use "${NODE_VERSION}"
nvm alias default "${NODE_VERSION}"

echo ""
echo "==> Versions now active in THIS shell:"
echo "    node: $(node --version)"
echo "    npm:  $(npm --version)"

cat <<'EOF'

==> Done.

In any NEW terminal tab, node --version should print v22.x.x automatically.
If a tab still shows the old version, run:

    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
    nvm use default

Next steps for mixtAIpe:

    rm -rf node_modules       # rebuild against Node 22
    pnpm install
    npx convex dev            # leave running in one tab
    # in a new tab:
    pnpm dev                  # http://localhost:3000

EOF
