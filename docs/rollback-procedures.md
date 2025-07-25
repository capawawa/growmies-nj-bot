# 🔄 Rollback Procedures

This document outlines procedures for rolling back deployments in case of failures or critical issues.

## 🚨 Emergency Response

### Immediate Actions

1. **Stop the Bleeding**
   ```powershell
   # If bot is causing issues in Discord, immediately revoke token
   # Go to Discord Developer Portal > Bot > Regenerate Token
   Start-Process "https://discord.com/developers/applications"
   ```

2. **Notify Team**
   - Post in deployment channel about the issue
   - Include error messages and symptoms
   - Tag relevant team members

## 📊 Railway Rollback Procedures

### Method 1: Railway Dashboard Rollback (Recommended)

1. **Access Railway Dashboard**
   ```powershell
   Start-Process "https://railway.app/dashboard"
   ```

2. **Navigate to Deployments**
   - Select your project
   - Click on "Deployments" tab
   - View deployment history

3. **Rollback to Previous Version**
   - Find the last stable deployment
   - Click the three dots menu (⋮)
   - Select "Rollback to this deployment"
   - Confirm the rollback

4. **Verify Rollback**
   - Check deployment status
   - Monitor health endpoint
   - Verify bot comes back online

### Method 2: Railway CLI Rollback

```powershell
# Install Railway CLI if not already installed
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# List recent deployments
railway deployments

# Rollback to specific deployment
railway deployments rollback <deployment-id>

# Example:
railway deployments rollback dep_xxxxxxxxxxxxx
```

### Method 3: Manual Deployment Rollback

```powershell
# Clone repository at previous commit
git clone https://github.com/SkaterPunisher/discord-bot-secure.git rollback-temp
cd rollback-temp

# Checkout last known good commit
git log --oneline -10  # View recent commits
git checkout <commit-hash>

# Deploy manually to Railway
railway up
```

## 🔧 GitHub Actions Rollback

### Reverting a Problematic Commit

1. **Create Revert Commit**
   ```powershell
   # Fetch latest changes
   git fetch origin
   git checkout main
   git pull origin main

   # Identify the problematic commit
   git log --oneline -5

   # Revert the commit
   git revert <commit-hash>
   
   # Push the revert
   git push origin main
   ```

2. **Alternative: Reset to Previous Commit**
   ```powershell
   # ⚠️ CAUTION: This rewrites history
   git reset --hard <last-good-commit>
   git push --force-with-lease origin main
   ```

### Re-running Failed Workflow

1. **Via GitHub Web Interface**
   - Go to Actions tab
   - Select failed workflow
   - Click "Re-run all jobs"

2. **Skip Deployment Temporarily**
   ```yaml
   # Temporarily add to .github/workflows/deploy.yml
   jobs:
     deploy:
       if: false  # Disable deployment
   ```

## 🗄️ Database/State Rollback

### Discord Application State

1. **Slash Commands Rollback**
   ```powershell
   # Re-deploy previous command version
   git checkout <previous-version> -- deploy-commands.js
   node deploy-commands.js
   ```

2. **Bot Permissions Reset**
   - Remove bot from server
   - Re-invite with correct permissions
   - Use minimal permissions: 380930346200

## 🔐 Secret/Configuration Rollback

### GitHub Secrets Recovery

1. **List Current Secrets**
   ```powershell
   gh secret list
   ```

2. **Restore Previous Values**
   ```powershell
   # If you have backup of previous values
   gh secret set DISCORD_TOKEN < backup/discord_token.txt
   gh secret set RAILWAY_API_TOKEN < backup/railway_token.txt
   ```

3. **Emergency Token Rotation**
   ```powershell
   # Generate new Discord token
   # Update in GitHub Secrets
   gh secret set DISCORD_TOKEN

   # Update Railway token
   gh secret set RAILWAY_API_TOKEN
   ```

## 📝 Rollback Verification Checklist

After any rollback, verify:

- [ ] Bot is online in Discord
- [ ] Health endpoint returns healthy status
- [ ] All commands are responding
- [ ] No error spikes in logs
- [ ] Memory usage is stable
- [ ] Deployment notifications sent

## 🚀 Recovery Procedures

### Full Recovery from Backup

1. **Restore from GitHub**
   ```powershell
   # Fresh clone
   git clone https://github.com/SkaterPunisher/discord-bot-secure.git recovery
   cd recovery
   
   # Install dependencies
   npm install
   
   # Test locally first
   npm run dev
   ```

2. **Redeploy to Railway**
   ```powershell
   # Link to Railway project
   railway link
   
   # Deploy
   railway up
   ```

### Partial Recovery (Health Monitor Only)

```powershell
# If only health monitoring is broken
# Temporarily disable in src/index.js

# Comment out health monitor initialization
# // const healthMonitor = new HealthMonitor(client);
# // healthMonitor.start(HEALTH_PORT);

# Commit and push
git add src/index.js
git commit -m "Temporarily disable health monitoring"
git push origin main
```

## 📊 Monitoring During Rollback

### Real-time Monitoring

1. **Railway Logs**
   ```powershell
   # Stream logs during rollback
   railway logs --follow
   ```

2. **GitHub Actions**
   - Monitor workflow execution
   - Check deployment status
   - Verify webhook notifications

3. **Discord Bot Status**
   - Check bot online status
   - Test basic commands
   - Monitor error responses

## 🎯 Rollback Decision Matrix

| Symptom | Severity | Rollback Method | Time to Recovery |
|---------|----------|-----------------|------------------|
| Bot offline | Critical | Railway Dashboard | 2-3 minutes |
| Commands failing | High | Railway CLI | 3-5 minutes |
| Memory leak | Medium | Git revert + deploy | 5-10 minutes |
| Config error | Low | Update secrets | 2-3 minutes |
| Health check fail | Low | Code fix + deploy | 5-10 minutes |

## 📋 Post-Rollback Actions

1. **Document the Incident**
   - What went wrong?
   - What was the root cause?
   - How was it detected?
   - What was the fix?

2. **Update Monitoring**
   - Add alerts for similar issues
   - Update health checks
   - Improve error handling

3. **Prevent Recurrence**
   - Add tests for the failure case
   - Update deployment procedures
   - Review code changes more carefully

## 🔗 Quick Reference Commands

```powershell
# Railway rollback
railway deployments rollback <id>

# Git revert
git revert <commit-hash>
git push origin main

# Emergency stop
gh secret set DISCORD_TOKEN --body "invalid"

# Re-deploy commands
node deploy-commands.js

# Check deployment status
railway status
railway logs --follow

# GitHub Actions re-run
gh run rerun <run-id>
```

## 📞 Escalation Contacts

1. **Railway Support**: https://railway.app/support
2. **Discord Developer Support**: https://discord.com/developers/docs/support
3. **GitHub Support**: https://support.github.com

---

**Last Updated**: January 16, 2025  
**Version**: 1.0.0  
**Critical Response Time**: < 5 minutes