#!/usr/bin/env bash
set -euo pipefail

WORKSPACE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

export PATH="$WORKSPACE_DIR:$HOME/.local/bin:$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"

exec npx -y @codacy/codacy-mcp@latest "$@"
