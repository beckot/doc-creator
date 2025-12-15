# Agent Guidance

## Secret scanning
- TruffleHog is enforced in pre-commit hooks and CI. Do not bypass or weaken it.
- Run `./scripts/trufflehog_diff.sh origin/main HEAD` before submitting patches; failures block merges.
- Keep vendor allowlists narrow (e.g., `pwa/libs/mermaid.min.js` in `.trufflehogignore`). Do not delete code to appease scanners.
- See `.github/copilot-instructions.md` for full policy and required commands.

## General
- Respect repository security posture; never commit secrets or credentials.
