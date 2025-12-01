# Security Scanning

This repository includes automated security scanning to prevent accidental exposure of secrets or sensitive data.

## Automated Checks

### GitHub Actions (on every push)
- **TruffleHog**: Scans for leaked secrets, API keys, tokens
- **Pattern matching**: Detects common secret patterns (API keys, passwords, tokens)
- **Sensitive file detection**: Blocks `.env`, `.pem`, `.key` files
- **Backend call validation**: Alerts on unexpected external API calls

### Local Pre-Commit Check
Run before committing:
```powershell
.\.github\scripts\security-check.ps1
```

This checks:
- ✅ No hardcoded secrets in code
- ✅ No sensitive files (`.env`, `.key`, `.pem`)
- ✅ No unexpected backend URLs
- ✅ Clean PWA structure (client-side only)

## What's Safe to Commit
- ✅ Pure client-side JavaScript
- ✅ HTML/CSS files
- ✅ CDN references (mermaid.js, jszip.js)
- ✅ Static assets (icons, images)

## What's Blocked
- ❌ API keys or tokens
- ❌ Passwords or credentials
- ❌ Private keys (`.pem`, `.key`)
- ❌ Environment files (`.env`)
- ❌ Backend connection strings

## Deployment Security
The PWA is **client-side only**:
- No backend server
- No database connections
- No API keys required
- All processing in-browser
- GitHub Pages serves static files only

Safe for public deployment.
