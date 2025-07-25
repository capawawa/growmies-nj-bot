# Discord Bot Deployment Instructions

> **⚠️ SECURITY NOTE**: This guide uses secure methods for handling credentials. Never expose tokens or passwords in code or documentation.

## Table of Contents
1. [GitHub Secrets Configuration](#github-secrets-configuration)
2. [Railway Deployment Setup](#railway-deployment-setup)
3. [Environment Variables Reference](#environment-variables-reference)
4. [Post-Deployment Verification](#post-deployment-verification)
5. [Troubleshooting](#troubleshooting)
6. [Rollback Procedures](#rollback-procedures)

---

## 1. GitHub Secrets Configuration

### Prerequisites
- Windows 11 with PowerShell
- GitHub CLI installed (version 2.73.0 or later)
- Repository access to `capawawa/discord-bot-secure`
- Valid GitHub authentication

### Authentication Methods

#### Option A: Using GitHub CLI with Web Authentication (Recommended)
```powershell
# Authenticate with GitHub (opens browser for secure login)
gh auth login

# Follow prompts:
# - Choose: GitHub.com
# - Protocol: HTTPS
# - Authentication: Login with a web browser
# - Copy the one-time code and press Enter to open browser
```

#### Option B: Using GitHub Personal Access Token
```powershell
# Set your PAT as environment variable (temporary session only)
$env:GITHUB_TOKEN = "your-github-pat-here"

# Or authenticate directly
gh auth login --with-token < token.txt
```

### Setting GitHub Secrets

Execute these commands in PowerShell to set each secret:

```powershell
# Discord Configuration
gh secret set DISCORD_BOT_TOKEN --repo capawawa/discord-bot-secure
# When prompted, paste the token and press Enter

gh secret set DISCORD_SERVER_ID --repo capawawa/discord-bot-secure
# When prompted, paste the server ID and press Enter

gh secret set DISCORD_APPLICATION_ID --repo capawawa/discord-bot-secure
# When prompted, paste the application ID and press Enter

# Railway Configuration
gh secret set RAILWAY_API_TOKEN --repo capawawa/discord-bot-secure
# When prompted, paste the Railway token and press Enter

# Backup Configuration
gh secret set XENON_BACKUP_TOKEN --repo capawawa/discord-bot-secure
# When prompted, paste the Xenon token and press Enter
```

### Verify Secrets Are Set
```powershell
# List all secrets (shows names only, not values)
gh secret list --repo capawawa/discord-bot-secure
```

Expected output:
```
DISCORD_APPLICATION_ID     Updated 2025-07-16
DISCORD_BOT_TOKEN         Updated 2025-07-16
DISCORD_SERVER_ID         Updated 2025-07-16
RAILWAY_API_TOKEN         Updated 2025-07-16
XENON_BACKUP_TOKEN        Updated 2025-07-16
```

---

## 2. Railway Deployment Setup

### Step 1: Access Railway Dashboard
1. Open browser and navigate to https://railway.app
2. Sign in with your account (adamb.capuana@gmail.com)
3. Click "New Project" or access existing project

### Step 2: Connect GitHub Repository
1. Click "Deploy from GitHub repo"
2. Search for "discord-bot-secure"
3. Select the repository
4. Choose the main branch

### Step 3: Configure Environment Variables
Add these environment variables in Railway:

```
DISCORD_BOT_TOKEN=<your-bot-token>
DISCORD_SERVER_ID=<your-server-id>
DISCORD_APPLICATION_ID=<your-application-id>
XENON_BACKUP_TOKEN=<your-xenon-token>
NODE_ENV=production
```

### Step 4: Deploy Settings
1. **Build Command**: `npm ci --production`
2. **Start Command**: `node src/index.js`
3. **Health Check Path**: `/health` (if implemented)
4. **Region**: Select closest to your users

### Step 5: Deploy
1. Click "Deploy" button
2. Monitor deployment logs
3. Wait for "Deployment live" status

---

## 3. Environment Variables Reference

### Required Variables
| Variable | Description | Source |
|----------|-------------|--------|
| `DISCORD_BOT_TOKEN` | Bot authentication token | Discord Developer Portal |
| `DISCORD_SERVER_ID` | Target Discord server ID | Discord (Server Settings) |
| `DISCORD_APPLICATION_ID` | Bot application ID | Discord Developer Portal |
| `RAILWAY_API_TOKEN` | Railway deployment token | Railway Account Settings |
| `XENON_BACKUP_TOKEN` | Xenon backup service token | Xenon Dashboard |

### Optional Variables
| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `LOG_LEVEL` | Logging verbosity | `info` |
| `PORT` | HTTP port (if applicable) | `3000` |

---

## 4. Post-Deployment Verification

### Automated Checks (via GitHub Actions)
The deployment workflow automatically verifies:
- ✅ Bot comes online in Discord
- ✅ Commands are registered
- ✅ Basic health check passes
- ✅ Environment variables are loaded

### Manual Verification Steps

1. **Check Bot Status**
   ```powershell
   # Check if bot is online in Discord
   # Look for green status indicator next to bot name
   ```

2. **Test Commands**
   - Type `/ping` in any channel
   - Expected: Bot responds with latency
   - Type `/server` in any channel
   - Expected: Bot shows server information

3. **Verify Logs in Railway**
   ```
   Navigate to Railway Dashboard > Your Project > Deployments > View Logs
   Look for:
   - "Bot logged in as [Bot Name]"
   - "Commands registered successfully"
   - No error messages
   ```

4. **Monitor Resource Usage**
   - Check Railway metrics dashboard
   - Normal usage: <100MB RAM, <1% CPU

---

## 5. Troubleshooting

### Common Issues and Solutions

#### Bot Not Coming Online
```powershell
# Check GitHub Actions logs
gh run list --repo capawawa/discord-bot-secure
gh run view <run-id> --repo capawawa/discord-bot-secure

# Verify secrets are set correctly
gh secret list --repo capawawa/discord-bot-secure
```

#### Invalid Token Errors
1. Regenerate bot token in Discord Developer Portal
2. Update GitHub Secret:
   ```powershell
   gh secret set DISCORD_BOT_TOKEN --repo capawawa/discord-bot-secure
   ```
3. Redeploy via Railway or GitHub Actions

#### Commands Not Working
1. Check command registration logs
2. Verify application ID matches bot ID
3. Re-run deploy commands:
   ```powershell
   npm run deploy-commands
   ```

#### Railway Deployment Failures
1. Check build logs for errors
2. Verify all dependencies in package.json
3. Ensure Dockerfile is valid (if using)
4. Check Railway service health

### Debug Commands
```powershell
# View recent workflow runs
gh run list --repo capawawa/discord-bot-secure --limit 5

# View specific run details
gh run view <run-id> --repo capawawa/discord-bot-secure --log

# Check Railway deployment status via CLI (if Railway CLI installed)
railway status
railway logs
```

---

## 6. Rollback Procedures

### Immediate Rollback (Railway)
1. Access Railway Dashboard
2. Navigate to Deployments
3. Find previous successful deployment
4. Click "Rollback to this deployment"
5. Confirm rollback

### GitHub Actions Rollback
```powershell
# List recent deployments
gh run list --repo capawawa/discord-bot-secure --workflow deploy.yml

# Re-run a previous successful deployment
gh run rerun <run-id> --repo capawawa/discord-bot-secure
```

### Manual Rollback Steps
1. **Identify Last Working Commit**
   ```powershell
   git log --oneline -10
   ```

2. **Create Rollback Branch**
   ```powershell
   git checkout -b rollback/<date>
   git reset --hard <commit-hash>
   git push origin rollback/<date>
   ```

3. **Deploy Rollback Branch**
   - Update Railway to deploy from rollback branch
   - Or trigger GitHub Action on rollback branch

### Emergency Procedures
If bot is causing issues:
1. **Immediate Shutdown**
   - Pause deployment in Railway
   - Or revoke bot token in Discord Developer Portal

2. **Notify Team**
   - Post in #bot-alerts channel
   - Document issue in incident log

3. **Investigation**
   - Review logs from affected timeframe
   - Check recent commits for changes
   - Test locally before redeploying

---

## Additional Resources

- [Discord.js Guide](https://discordjs.guide/)
- [Railway Documentation](https://docs.railway.app/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub CLI Manual](https://cli.github.com/manual/)

## Support Contacts

- **Technical Issues**: Create issue in GitHub repository
- **Railway Support**: support@railway.app
- **Discord Developer Support**: https://discord.com/developers/support

---

> Last Updated: July 16, 2025
> Version: 1.0.0