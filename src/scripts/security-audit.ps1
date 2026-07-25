Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "🔒  BLOODLINK SECURITY AUDIT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Started: $(Get-Date)" -ForegroundColor Yellow
Write-Host ""

New-Item -ItemType Directory -Force -Path "security-reports" | Out-Null

Write-Host "📦 [1/4] Checking dependencies..." -ForegroundColor Green
Write-Host "----------------------------------------"
npm audit --audit-level high 2>&1 | Tee-Object -FilePath "security-reports/dependency-audit.txt"
Write-Host ""

Write-Host "🔑 [2/4] Checking for hardcoded secrets..." -ForegroundColor Green
Write-Host "----------------------------------------"
Select-String -Path "src\**\*.ts", "src\**\*.tsx" -Pattern "password|secret|api_key|token|key" -Exclude "*.test.ts","*.spec.ts","*.d.ts" 2>$null | Tee-Object -FilePath "security-reports/hardcoded-secrets.txt"
if ((Get-Content "security-reports/hardcoded-secrets.txt" | Measure-Object -Line).Lines -eq 0) {
    Write-Host "✅ No hardcoded secrets found" -ForegroundColor Green
}
Write-Host ""

Write-Host "⚠️  [3/4] Checking for dangerous patterns..." -ForegroundColor Green
Write-Host "----------------------------------------"
$dangerousOutput = @()
$dangerousOutput += "=== dangerouslySetInnerHTML usage ==="
$dangerousPatterns = Select-String -Path "src\**\*.tsx" -Pattern "dangerouslySetInnerHTML" 2>$null
if ($dangerousPatterns) {
    $dangerousOutput += $dangerousPatterns | ForEach-Object { $_.Line }
} else {
    $dangerousOutput += "✅ None found"
}
$dangerousOutput += ""
$dangerousOutput += "=== eval() usage ==="
$evalPatterns = Select-String -Path "src\**\*.ts", "src\**\*.tsx" -Pattern "eval\(" 2>$null
if ($evalPatterns) {
    $dangerousOutput += $evalPatterns | ForEach-Object { $_.Line }
} else {
    $dangerousOutput += "✅ None found"
}
$dangerousOutput | Out-File -FilePath "security-reports/dangerous-patterns.txt"
Write-Host ""

Write-Host "🌐 [4/4] Checking environment variables..." -ForegroundColor Green
Write-Host "----------------------------------------"
$envOutput = @()
$envOutput += "=== import.meta.env usage ==="
$envPatterns = Select-String -Path "src\**\*.ts", "src\**\*.tsx" -Pattern "import.meta.env" 2>$null
if ($envPatterns) {
    $envOutput += $envPatterns | ForEach-Object { $_.Line }
} else {
    $envOutput += "✅ None found"
}
$envOutput += ""
$envOutput += "=== process.env usage ==="
$processPatterns = Select-String -Path "src\**\*.ts", "src\**\*.tsx" -Pattern "process.env" 2>$null
if ($processPatterns) {
    $envOutput += $processPatterns | ForEach-Object { $_.Line }
} else {
    $envOutput += "✅ None found"
}
$envOutput | Out-File -FilePath "security-reports/env-usage.txt"
Write-Host ""

$summary = @"
Bloodlink Security Audit Report
Generated: $(Get-Date)

=============================================

✅ DEPENDENCY AUDIT: Complete (check dependency-audit.txt)

🔑 HARDCODED SECRETS: $((Get-Content "security-reports/hardcoded-secrets.txt" | Measure-Object -Line).Lines) potential issues

⚠️  DANGEROUS PATTERNS: $((Get-Content "security-reports/dangerous-patterns.txt" | Measure-Object -Line).Lines) lines checked

🌐 ENVIRONMENT VARIABLES: $(Select-String -Path "security-reports/env-usage.txt" -Pattern "import.meta.env|process.env" | Measure-Object | Select-Object -ExpandProperty Count) references found

=============================================
All reports saved to security-reports/
"@

$summary | Out-File -FilePath "security-reports/summary.txt"

Write-Host ""
Write-Host "✅ Security audit complete!" -ForegroundColor Green
Write-Host "📁 Results saved to security-reports/" -ForegroundColor Yellow
Write-Host "📄 Summary: security-reports/summary.txt" -ForegroundColor Yellow
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan