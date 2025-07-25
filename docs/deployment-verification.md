# 🚀 Deployment Verification Guide

This guide provides step-by-step instructions to verify successful deployment of the Growmies NJ Discord bot.

## 📋 Pre-Deployment Checklist

Before initiating deployment, ensure:

1. **GitHub Secrets Configured**
   - [ ] `DISCORD_TOKEN` - Bot authentication token
   - [ ] `DISCORD_APPLICATION_ID` - Application ID for slash commands
   - [ ] `DISCORD_WEBHOOK_URL` - Webhook for deployment notifications
   - [ ] `RAILWAY_API_TOKEN` - Railway deployment authentication
   - [ ] `HEALTH_PORT` - Port for health monitoring (default: 3000)

2. **Local Testing Completed**
   ```powershell
   # Run local connection test
   node scripts/test-bot-connection-simple.js
   ```

3. **Dependencies Updated**
   ```powershell
   # Install all dependencies including Express for health monitoring
   npm install
   ```

## 🔍 Deployment Verification Steps

### 1. GitHub Actions Verification

1. Navigate to your repository's Actions tab
2. Check the latest workflow run for the `main` branch
3. Verify all stages pass:
   - ✅ Test stage (Node.js setup and tests)
   - ✅ Deploy stage (Railway deployment)
   - ✅ Security-scan stage (CodeQL analysis)

### 2. Railway Platform Verification

1. **Login to Railway Dashboard**
   ```powershell
   # Open Railway dashboard
   Start-Process "https://railway.app/dashboard"
   ```

2. **Check Deployment Status**
   - Navigate to your project
   - Verify deployment shows "Active" status
   - Check build logs for successful completion

3. **Environment Variables**
   - Confirm all secrets are properly mapped
   - Verify `HEALTH_PORT` is set (default: 3000)

### 3. Bot Connection Verification

1. **Discord Developer Portal**
   ```powershell
   # Open Discord Developer Portal
   Start-Process "https://discord.com/developers/applications"
   ```
   - Select your application
   - Navigate to Bot section
   - Verify bot shows as "Online"

2. **Server Presence**
   - Check Discord server (ID: 1303094117257052200)
   - Verify bot appears in member list
   - Status should show as online (green dot)

### 4. Health Monitoring Verification

1. **Railway Health Check**
   - Railway automatically checks `/health` endpoint
   - Dashboard should show "Healthy" status

2. **Direct Health Check** (if Railway provides public URL)
   ```powershell
   # Replace with your Railway app URL
   $railwayUrl = "https://your-app.railway.app"
   
   # Check health endpoint
   Invoke-RestMethod "$railwayUrl/health"
   
   # Check metrics endpoint
   Invoke-RestMethod "$railwayUrl/metrics"
   
   # View status page in browser
   Start-Process "$railwayUrl/status"
   ```

3. **Expected Health Response**
   ```json
   {
     "status": "healthy",
     "uptime": 120,
     "timestamp": "2025-01-16T08:45:00.000Z",
     "bot": {
       "ready": true,
       "username": "GrowmiesSprout 🌱",
       "guilds": 1,
       "ping": 45
     }
   }
   ```

### 5. Command Functionality Verification

1. **Test Ping Command**
   - In Discord, type `/ping`
   - Bot should respond with latency information

2. **Test Server Info Command**
   - Type `/server`
   - Bot should display server information

3. **Test Age Verification**
   - Type `/verify`
   - Bot should initiate age verification flow

### 6. Notification Verification

1. **Check Discord Webhook**
   - Deployment notification should appear in configured channel
   - Message includes:
     - Deployment status
     - Commit SHA
     - Timestamp
     - Link to GitHub Actions

## 📊 Monitoring Dashboard

Access the health monitoring dashboard to view:

- **Real-time Status**: Bot online/offline state
- **Performance Metrics**: 
  - Memory usage
  - Command processing stats
  - Error counts
  - Discord API latency
- **System Information**:
  - Uptime duration
  - Connected servers
  - Active users

## 🔧 Troubleshooting Common Issues

### Bot Shows Offline

1. **Check Logs in Railway**
   ```
   - Navigate to deployment logs
   - Look for connection errors
   - Verify token is correct
   ```

2. **Verify Intents**
   - Ensure privileged intents are enabled in Discord Developer Portal:
     - MESSAGE CONTENT INTENT
     - SERVER MEMBERS INTENT

### Health Check Failing

1. **Port Configuration**
   - Ensure `HEALTH_PORT` environment variable is set
   - Default is 3000, Railway may require different port

2. **Express Dependency**
   - Verify Express is installed: `npm list express`
   - Should show: `express@4.18.2`

### Commands Not Responding

1. **Command Registration**
   ```powershell
   # Re-deploy commands
   node deploy-commands.js
   ```

2. **Permission Check**
   - Bot needs appropriate permissions in server
   - Minimum required: 380930346200

## ✅ Verification Complete Checklist

- [ ] GitHub Actions workflow completed successfully
- [ ] Railway deployment shows active status
- [ ] Bot appears online in Discord server
- [ ] Health endpoint returns healthy status
- [ ] All commands respond correctly
- [ ] Deployment notification received
- [ ] Monitoring dashboard accessible
- [ ] No errors in deployment logs

## 📝 Post-Deployment Notes

1. **Monitor Initial Performance**
   - Watch health metrics for first 30 minutes
   - Check for any error spikes
   - Verify memory usage is stable

2. **Document Deployment**
   - Record deployment timestamp
   - Note any issues encountered
   - Update team on deployment status

3. **Enable Alerts** (Optional)
   - Configure Railway alerts for failures
   - Set up Discord notifications for errors
   - Consider uptime monitoring service

---

**Last Updated**: January 16, 2025  
**Deployment Version**: 1.0.0  
**Platform**: Railway with Nixpacks