# Local security check before commits
Write-Host "🔒 Running security scan..." -ForegroundColor Cyan

$issues = @()

# Check for common secret patterns in PWA files
Write-Host "Checking for secrets in code..." -ForegroundColor Yellow
$secretPatterns = @(
    'api[_-]?key\s*[:=]',
    'secret\s*[:=]',
    'password\s*[:=]',
    'token\s*[:=]',
    'private[_-]?key',
    'credential',
    'sk-[a-zA-Z0-9]{32,}',  # OpenAI API key pattern
    'ghp_[a-zA-Z0-9]{36}',  # GitHub Personal Access Token
    'AKIA[0-9A-Z]{16}'       # AWS Access Key
)

Get-ChildItem -Path ".\pwa" -Recurse -Include *.js,*.html,*.json | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    foreach ($pattern in $secretPatterns) {
        if ($content -match $pattern) {
            $issues += "⚠️  Potential secret in: $($_.Name) - Pattern: $pattern"
        }
    }
}

# Check for sensitive files
Write-Host "Checking for sensitive files..." -ForegroundColor Yellow
$sensitiveFiles = Get-ChildItem -Path ".\pwa" -Recurse -Include *.env*,*secret*,*password*,*.pem,*.key,*.p12
if ($sensitiveFiles) {
    $sensitiveFiles | ForEach-Object {
        $issues += "❌ Sensitive file detected: $($_.Name)"
    }
}

# Check for hardcoded IPs/domains (excluding CDNs)
Write-Host "Checking for hardcoded backend URLs..." -ForegroundColor Yellow
Get-ChildItem -Path ".\pwa" -Recurse -Include *.js | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match 'https?://(?!localhost|127\.0\.0\.1|cdn\.|jsdelivr)[\w\.-]+') {
        # Exclude known safe CDNs
        if ($content -notmatch 'cdn\.jsdelivr\.net') {
            $issues += "⚠️  External URL in: $($_.Name) - Verify this is intentional"
        }
    }
}

# Report results
Write-Host "`n========================================" -ForegroundColor Cyan
if ($issues.Count -eq 0) {
    Write-Host "✅ Security scan passed - No issues detected!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "❌ Security scan found potential issues:" -ForegroundColor Red
    Write-Host "========================================`n" -ForegroundColor Cyan
    $issues | ForEach-Object { Write-Host $_ -ForegroundColor Yellow }
    Write-Host "`nPlease review these issues before committing." -ForegroundColor Red
    Write-Host "If these are false positives, you can proceed.`n" -ForegroundColor Yellow
    
    $response = Read-Host "Continue with commit anyway? (y/N)"
    if ($response -eq 'y' -or $response -eq 'Y') {
        exit 0
    }
    exit 1
}
