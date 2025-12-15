# AI Assistant Security & Secret-Scanning Policy

All AI agents (Copilot, ChatGPT, Codex, automation scripts) working on this repository **must enforce TruffleHog secret scanning** before submitting changes. Secret scanning is mandatory for a public repository and failures are hard blockers.

## Required commands
- Local diff scan (preferred):
  ```bash
  ./scripts/trufflehog_diff.sh origin/main HEAD
  ```
- Full filesystem scan (pre-commit hook):
  ```bash
  trufflehog filesystem --fail --only-verified --json --exclude-paths .trufflehogignore .
  ```
- Install toolchain if missing:
  ```bash
  pip install "git+https://github.com/trufflesecurity/trufflehog@v3.0.5"
  ```

## Exit codes
- `0`: No verified secrets found (proceed).
- `183`: Verified secrets detected (stop immediately; never suppress without remediation).
- `2`: Infrastructure or invocation error (fix tooling before proceeding).

## Rules for agents
- Do **not** disable, weaken, or remove TruffleHog checks in CI, pre-commit, or scripts.
- Vendor/minified bundles (e.g., `pwa/libs/mermaid.min.js`) are allowlisted via `.trufflehogignore`; do not delete code to quiet the scanner.
- Treat any new finding as critical until resolved; coordinate remediation instead of adding broad ignores.
- Ensure `.trufflehogignore` remains narrow and only covers vetted third-party artifacts.
- Run the diff script before finalizing patches and include its status in PR/testing notes.
