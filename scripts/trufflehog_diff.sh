#!/usr/bin/env bash
# TruffleHog diff scan helper for local and CI use.
# Usage: ./scripts/trufflehog_diff.sh [<base_ref> [<head_ref>]]
# Defaults: base_ref=origin/main, head_ref=HEAD.

set -euo pipefail

TRUFFLEHOG_VERSION="3.79.0" # Keep in sync with CI workflow pin to avoid mismatches.

BASE_REF=${1:-origin/main}
HEAD_REF=${2:-HEAD}

if ! command -v trufflehog >/dev/null 2>&1; then
  echo "trufflehog is not installed. Install with: pip install 'trufflehog==${TRUFFLEHOG_VERSION}'" >&2
  exit 2
fi

trufflehog git file://. \
  --since-commit="${BASE_REF}" \
  --branch="${HEAD_REF}" \
  --only-verified \
  --fail \
  --exclude-paths ".trufflehogignore"
