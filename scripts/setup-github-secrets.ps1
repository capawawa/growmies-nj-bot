# ================================================================
# GitHub Secrets Setup Script for Discord Bot
# ================================================================
# This script automates the configuration of GitHub Secrets
# for the discord-bot-secure repository
# ================================================================

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "GitHub Secrets Configuration Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
try {
    $ghVersion = gh --version
    Write-Host "✓ GitHub CLI detected: $($ghVersion[0])" -ForegroundColor Green
} catch {
    Write-Host "✗ GitHub CLI not found. Please install from: https://cli.github.com/" -ForegroundColor Red
    exit 1
}

# Read credentials from file
$credentialsFile = Join-Path $PSScriptRoot "..\CREDENTIALS_COLLECTION.txt"
if (-not (Test-Path $credentialsFile)) {
    Write-Host "✗ Credentials file not found at: $credentialsFile" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Reading credentials from file..." -ForegroundColor Green
$credentials = @{}
Get-Content $credentialsFile | ForEach-Object {
    if ($_ -match '^([A-Z_]+)=(.+)$') {
        $credentials[$matches[1]] = $matches[2]
    }
}

# Verify required credentials
$requiredCreds = @(
    "DISCORD_BOT_TOKEN",
    "DISCORD_SERVER_ID", 
    "DISCORD_APPLICATION_ID",
    "RAILWAY_API_TOKEN",
    "XENON_BACKUP_TOKEN",
    "GITHUB_USERNAME"
)

$missingCreds = @()
foreach ($cred in $requiredCreds) {
    if (-not $credentials[$cred]) {
        $missingCreds += $cred
    }
}

if ($missingCreds.Count -gt 0) {
    Write-Host "✗ Missing required credentials:" -ForegroundColor Red
    $missingCreds | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
}

Write-Host "✓ All required credentials found" -ForegroundColor Green
Write-Host ""

# Repository details
$owner = $credentials["GITHUB_USERNAME"]
$repo = "discord-bot-secure"
$repoPath = "$owner/$repo"

Write-Host "Repository: $repoPath" -ForegroundColor Yellow
Write-Host ""

# Check authentication status
Write-Host "Checking GitHub authentication..." -ForegroundColor Yellow
try {
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Not authenticated. Starting authentication process..." -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Please follow the prompts to authenticate:" -ForegroundColor Cyan
        gh auth login
    } else {
        Write-Host "✓ Already authenticated with GitHub" -ForegroundColor Green
    }
} catch {
    Write-Host "Error checking auth status. Attempting login..." -ForegroundColor Yellow
    gh auth login
}

Write-Host ""
Write-Host "Setting up GitHub Secrets..." -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

# Function to set a secret
function Set-GitHubSecret {
    param(
        [string]$Name,
        [string]$Value,
        [string]$Description
    )
    
    Write-Host "`nSetting $Name..." -ForegroundColor Cyan
    Write-Host "  Description: $Description" -ForegroundColor Gray
    
    try {
        # Use echo to pipe the value to gh secret set
        $Value | gh secret set $Name --repo $repoPath
        Write-Host "  ✓ $Name configured successfully" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "  ✗ Failed to set ${Name}: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Set each secret
$secrets = @(
    @{
        Name = "DISCORD_BOT_TOKEN"
        Value = $credentials["DISCORD_BOT_TOKEN"]
        Description = "Discord bot authentication token"
    },
    @{
        Name = "DISCORD_SERVER_ID"
        Value = $credentials["DISCORD_SERVER_ID"]
        Description = "Discord server ID for the bot"
    },
    @{
        Name = "DISCORD_APPLICATION_ID"
        Value = $credentials["DISCORD_APPLICATION_ID"]
        Description = "Discord application ID"
    },
    @{
        Name = "RAILWAY_API_TOKEN"
        Value = $credentials["RAILWAY_API_TOKEN"]
        Description = "Railway deployment API token"
    },
    @{
        Name = "XENON_BACKUP_TOKEN"
        Value = $credentials["XENON_BACKUP_TOKEN"]
        Description = "Xenon backup service token"
    }
)

$successCount = 0
$failCount = 0

foreach ($secret in $secrets) {
    if (Set-GitHubSecret -Name $secret.Name -Value $secret.Value -Description $secret.Description) {
        $successCount++
    } else {
        $failCount++
    }
}

Write-Host ""
Write-Host "=============================" -ForegroundColor Yellow
Write-Host "Configuration Summary" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow
Write-Host "✓ Successful: $successCount secrets" -ForegroundColor Green
if ($failCount -gt 0) {
    Write-Host "✗ Failed: $failCount secrets" -ForegroundColor Red
}

Write-Host ""
Write-Host "Verifying secrets..." -ForegroundColor Yellow
try {
    $secretsList = gh secret list --repo $repoPath
    Write-Host ""
    Write-Host "Current secrets in repository:" -ForegroundColor Cyan
    Write-Host $secretsList
} catch {
    Write-Host "Could not list secrets: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================" -ForegroundColor Green
Write-Host "✓ Setup Complete!" -ForegroundColor Green
Write-Host "=============================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify the GitHub Actions workflow in your repository" -ForegroundColor White
Write-Host "2. Configure Railway deployment at https://railway.app" -ForegroundColor White
Write-Host "3. Push code to trigger automatic deployment" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see: docs/DEPLOYMENT_INSTRUCTIONS.md" -ForegroundColor Cyan