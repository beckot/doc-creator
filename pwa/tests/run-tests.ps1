# Automated Test Runner for PWA DOCX Converter
# Launches a local server and runs tests in a headless browser (if available)

param(
    [switch]$Headless = $false,
    [int]$Port = 8081
)

Write-Host "Starting test server on port $Port..." -ForegroundColor Cyan

# Start Python HTTP server in background
$serverJob = Start-Job -ScriptBlock {
    param($Port)
    Set-Location $using:PSScriptRoot\..
    python -m http.server $Port
} -ArgumentList $Port

Start-Sleep -Seconds 2

try {
    $testUrl = "http://localhost:$Port/tests/test-harness.html"
    
    if ($Headless) {
        Write-Host "Attempting headless test execution..." -ForegroundColor Yellow
        Write-Host "Note: Requires Chrome or Edge with automation support" -ForegroundColor Gray
        
        # Check for Chrome/Edge (basic check)
        $chromePath = Get-Command chrome -ErrorAction SilentlyContinue
        $edgePath = Get-Command msedge -ErrorAction SilentlyContinue
        
        if ($chromePath -or $edgePath) {
            Write-Host "Browser found. For full automation, use Playwright or Selenium." -ForegroundColor Gray
            Write-Host "Opening test harness in default browser for manual verification..." -ForegroundColor Yellow
            Start-Process $testUrl
        } else {
            Write-Host "No supported browser found for headless mode." -ForegroundColor Red
            Write-Host "Opening in default browser instead..." -ForegroundColor Yellow
            Start-Process $testUrl
        }
    } else {
        Write-Host "Opening test harness in browser..." -ForegroundColor Green
        Write-Host "Test URL: $testUrl" -ForegroundColor Cyan
        Start-Process $testUrl
    }
    
    Write-Host "`nTest server running. Press Ctrl+C to stop." -ForegroundColor Green
    Write-Host "View results at: $testUrl" -ForegroundColor Cyan
    
    # Keep server running
    Wait-Job -Job $serverJob -Timeout 300 | Out-Null
    
} finally {
    Write-Host "`nStopping test server..." -ForegroundColor Yellow
    Stop-Job -Job $serverJob -ErrorAction SilentlyContinue
    Remove-Job -Job $serverJob -Force -ErrorAction SilentlyContinue
}

Write-Host "Test runner stopped." -ForegroundColor Cyan
