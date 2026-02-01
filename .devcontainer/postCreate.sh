#!/usr/bin/env bash
set -euo pipefail

echo "=== Post-create setup for openclaw-skill-audiobookshelf ==="

# Install pnpm if not present
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi

# Install dependencies if package.json exists
if [ -f package.json ]; then
  echo "Installing project dependencies..."
  pnpm install
fi

# Install Claude Code CLI
echo "Installing Claude Code CLI..."
npm install -g @anthropic-ai/claude-code || true

# Install Codex CLI
echo "Installing Codex CLI..."
npm install -g @openai/codex || true

# Install Claude Code plugins
echo "Installing Claude Code plugins..."
claude plugin add ralph-wiggum || true
claude plugin add code-review || true
claude plugin add security-guidance || true
claude plugin add pr-review-toolkit || true
claude plugin add github || true
claude plugin add commit-commands || true

echo "=== Post-create setup complete ==="
echo ""
echo "Next steps:"
echo "1. Authenticate Claude Code: claude auth login"
echo "2. Authenticate Codex: codex login --device-auth"
echo "3. Run tests: pnpm test"
