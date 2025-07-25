# Growmies NJ Discord Bot - Troubleshooting Guide

## 🛠️ Comprehensive Issue Resolution Guide for Cannabis Community Discord Automation

**Target Audience**: System administrators, DevOps teams, and technical support  
**Estimated Time**: 5-30 minutes per issue resolution  
**Prerequisites**: Basic command line knowledge, system access

---

## 📋 Table of Contents

1. [Quick Diagnosis Tools](#quick-diagnosis-tools)
2. [Bot Startup Issues](#bot-startup-issues)
3. [Command and Interaction Problems](#command-and-interaction-problems)
4. [Third-Party Bot Integration Issues](#third-party-bot-integration-issues)
5. [Instagram Integration Problems](#instagram-integration-problems)
6. [Database and Persistence Issues](#database-and-persistence-issues)
7. [Monitoring and Alerting Problems](#monitoring-and-alerting-problems)
8. [Performance and Memory Issues](#performance-and-memory-issues)
9. [Security and Compliance Issues](#security-and-compliance-issues)
10. [Emergency Procedures](#emergency-procedures)

---

## ⚡ Quick Diagnosis Tools

### Health Check Commands

```bash
# Quick system status
npm run health-check

# Detailed diagnostics
npm run diagnose

# Check all integrations
npm run test:integrations

# Monitor system resources
npm run monitor:resources
```

### Log File Locations

```bash
# Main application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# Discord API logs
tail -f logs/discord.log

# Database logs
tail -f logs/database.log

# Integration logs
tail -f logs/integrations.log
```

### Environment Verification

```bash
# Check environment variables
npm run env:check

# Verify configuration
npm run config:validate

# Test database connection
npm run db:ping

# Verify Discord token
npm run discord:verify-token
```

---

## 🚨 Bot Startup Issues

### Issue: Bot Won't Start

**Symptoms:**
- Bot process exits immediately
- "Process finished with exit code 1"
- No "Bot is ready!" message in console

**Diagnosis:**
```bash
# Check Node.js version
node --version  # Should be 16.9.0+

# Verify dependencies
npm list discord.js

# Check environment file
cat .env | grep DISCORD_TOKEN

# Validate configuration
npm run config:validate
```

**Common Causes & Solutions:**

#### 1. Missing or Invalid Environment Variables

**Problem:** `.env` file missing or contains invalid tokens
```bash
# Check if .env exists
ls -la .env

# Verify token format
echo $DISCORD_TOKEN | wc -c  # Should be ~59 characters
```

**Solution:**
```bash
# Copy template
cp .env.example .env

# Edit with correct values
nano .env

# Verify format
npm run env:validate
```

#### 2. Discord Token Issues

**Problem:** Invalid or expired Discord bot token

**Solution:**
1. Go to https://discord.com/developers/applications
2. Select your application → Bot
3. Reset token if necessary
4. Update `.env` file with new token
5. Restart bot

#### 3. Permission Issues

**Problem:** Bot lacks required permissions in Discord server

**Solution:**
```bash
# Check bot permissions
npm run discord:check-permissions

# Generate new invite URL with correct permissions
npm run discord:generate-invite
```

Required permissions value: `8` (Administrator) or specific permissions:
- Manage Server (0x00000020)
- Manage Roles (0x10000000)
- Manage Channels (0x00000010)
- Send Messages (0x00000800)
- Use Slash Commands (0x80000000)

#### 4. Database Connection Problems

**Problem:** Cannot connect to database

**Diagnosis:**
```bash
# Test database connection
npm run db:ping

# Check database URL format
echo $DATABASE_URL
```

**Solution:**
```bash
# Verify database is running
systemctl status postgresql  # For PostgreSQL
systemctl status mysql       # For MySQL

# Test connection manually
psql $DATABASE_URL  # PostgreSQL
mysql $DATABASE_URL # MySQL

# Check firewall rules
sudo ufw status
```

---

## 🎮 Command and Interaction Problems

### Issue: Slash Commands Not Appearing

**Symptoms:**
- Commands don't auto-complete when typing `/`
- "This interaction failed" errors
- Commands work in some servers but not others

**Diagnosis:**
```bash
# Check command registration
npm run commands:list

# Verify guild ID
echo $DISCORD_GUILD_ID

# Check command permissions
npm run commands:check-permissions
```

**Solutions:**

#### 1. Re-register Commands

```bash
# Clear old commands
npm run commands:clear

# Re-register all commands
npm run commands:deploy

# Wait 1-2 minutes for Discord cache refresh
```

#### 2. Guild vs Global Commands

```bash
# Register commands globally (slower, affects all servers)
npm run commands:deploy:global

# Register commands for specific guild (faster)
npm run commands:deploy:guild
```

#### 3. Permission Configuration

```bash
# Reset command permissions
npm run commands:reset-permissions

# Configure role-based command access
npm run commands:configure-permissions
```

### Issue: Commands Respond Slowly or Time Out

**Symptoms:**
- "This interaction failed" after 3+ seconds
- Inconsistent response times
- Some commands work, others don't

**Diagnosis:**
```bash
# Check response times
npm run monitor:response-times

# Monitor system resources
top -p $(pgrep node)

# Check network latency
ping discord.com
```

**Solutions:**

#### 1. Optimize Command Handlers

```bash
# Profile command performance
npm run profile:commands

# Check for blocking operations
npm run analyze:performance
```

#### 2. Increase Discord Timeout

Edit command handlers to use `deferReply()` for long operations:
```javascript
// For commands that take >3 seconds
await interaction.deferReply();
// ... long operation ...
await interaction.editReply(response);
```

---

## 🤖 Third-Party Bot Integration Issues

### Issue: Carl-bot Not Responding

**Symptoms:**
- Carl-bot commands don't work
- Automod rules not triggering
- No moderation logs

**Diagnosis:**
```bash
# Check Carl-bot status
npm run carl:status

# Verify configuration
npm run carl:check-config

# Test permissions
npm run carl:test-permissions
```

**Solutions:**

#### 1. Re-invite Carl-bot

1. Remove Carl-bot from server
2. Use script to re-invite with correct permissions:
```bash
npm run bots:invite:carl
```
3. Reconfigure automod settings:
```bash
npm run carl:configure-automod
```

#### 2. Fix Permission Conflicts

```bash
# Check role hierarchy
npm run roles:check-hierarchy

# Ensure Carl-bot role is high enough
npm run roles:fix-carl-position
```

### Issue: Sesh Bot Event Problems

**Symptoms:**
- Events not created
- Notifications not sent
- Calendar sync issues

**Solutions:**

#### 1. Reconfigure Sesh Integration

```bash
# Reset Sesh configuration
npm run sesh:reset-config

# Re-setup event channels
npm run sesh:configure-channels

# Test event creation
npm run sesh:test-event
```

#### 2. Fix Timezone Issues

```bash
# Set server timezone
npm run sesh:set-timezone America/New_York

# Verify timezone settings
npm run sesh:check-timezone
```

### Issue: Statbot Analytics Missing

**Symptoms:**
- No statistics being collected
- `/stats` command shows no data
- Dashboard empty

**Solutions:**

```bash
# Reset Statbot data collection
npm run statbot:reset

# Verify permissions
npm run statbot:check-permissions

# Force data refresh
npm run statbot:refresh-data
```

---

## 📸 Instagram Integration Problems

### Issue: Instagram Posts Not Appearing

**Symptoms:**
- No posts from @growmiesNJ in #instagram-feed
- RSS.app webhook not triggering
- Error messages in logs

**Diagnosis:**
```bash
# Check RSS.app webhook status
curl -I $INSTAGRAM_RSS_WEBHOOK

# Verify Instagram integration
npm run instagram:test-webhook

# Check logs for errors
grep "instagram" logs/error.log
```

**Solutions:**

#### 1. Fix RSS.app Configuration

1. Log into RSS.app dashboard
2. Verify @growmiesNJ feed is active
3. Check webhook URL is correct
4. Test webhook manually:
```bash
npm run instagram:test-webhook
```

#### 2. Update Webhook Handler

```bash
# Restart webhook service
npm run instagram:restart-webhook

# Verify endpoint is responding
curl -X POST $INSTAGRAM_RSS_WEBHOOK \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

#### 3. Content Moderation Issues

```bash
# Check moderation filters
npm run instagram:check-filters

# Review blocked content queue
npm run instagram:review-queue

# Update content guidelines
npm run instagram:update-guidelines
```

### Issue: Instagram Posts Formatting Incorrectly

**Symptoms:**
- Images not displaying
- Text truncated or malformed
- Missing captions or hashtags

**Solutions:**

```bash
# Update post formatting templates
npm run instagram:update-templates

# Test formatting with sample post
npm run instagram:test-formatting

# Reset content parser
npm run instagram:reset-parser
```

---

## 🗄️ Database and Persistence Issues

### Issue: Data Not Persisting

**Symptoms:**
- User data resets after bot restart
- Settings not saved
- Age verification status lost

**Diagnosis:**
```bash
# Check database connection
npm run db:ping

# Verify database schema
npm run db:check-schema

# Test read/write operations
npm run db:test-operations
```

**Solutions:**

#### 1. Database Connection Issues

```bash
# Restart database service
sudo systemctl restart postgresql

# Check database logs
sudo journalctl -u postgresql

# Verify connection string
npm run db:verify-connection
```

#### 2. Schema Migration Problems

```bash
# Run pending migrations
npm run db:migrate

# Reset database schema
npm run db:reset-schema

# Reseed initial data
npm run db:seed
```

#### 3. Permission Problems

```bash
# Check database user permissions
npm run db:check-permissions

# Grant required permissions
npm run db:fix-permissions
```

### Issue: Database Performance Slow

**Symptoms:**
- Commands take long time to respond
- High database CPU usage
- Connection timeouts

**Solutions:**

```bash
# Analyze slow queries
npm run db:analyze-slow-queries

# Rebuild indexes
npm run db:rebuild-indexes

# Optimize database configuration
npm run db:optimize
```

---

## 📊 Monitoring and Alerting Problems

### Issue: Monitoring Not Working

**Symptoms:**
- No health check reports
- Missing performance metrics
- Alerts not being sent

**Diagnosis:**
```bash
# Check monitoring service status
npm run monitoring:status

# Verify webhook endpoints
npm run monitoring:test-webhooks

# Check monitoring configuration
npm run monitoring:check-config
```

**Solutions:**

#### 1. Restart Monitoring Services

```bash
# Restart health check service
npm run monitoring:restart-health-checks

# Reset metric collection
npm run monitoring:reset-metrics

# Verify alert channels
npm run monitoring:test-alerts
```

#### 2. Fix Webhook Issues

```bash
# Update webhook URLs
npm run monitoring:update-webhooks

# Test webhook delivery
npm run monitoring:test-webhook-delivery

# Check webhook permissions
npm run monitoring:check-webhook-permissions
```

---

## 🚀 Performance and Memory Issues

### Issue: High Memory Usage

**Symptoms:**
- Bot consuming >500MB RAM
- Gradual memory increase over time
- Out of memory errors

**Diagnosis:**
```bash
# Monitor memory usage
npm run monitor:memory

# Check for memory leaks
npm run profile:memory

# Analyze heap dump
npm run analyze:heap-dump
```

**Solutions:**

#### 1. Memory Leak Detection

```bash
# Generate heap snapshot
npm run debug:heap-snapshot

# Analyze memory usage patterns
npm run analyze:memory-patterns

# Restart bot with memory monitoring
npm run start:with-memory-monitoring
```

#### 2. Optimize Memory Usage

```bash
# Clear message cache
npm run cache:clear-messages

# Optimize database queries
npm run db:optimize-queries

# Reduce log file sizes
npm run logs:rotate
```

### Issue: High CPU Usage

**Symptoms:**
- Bot consuming >80% CPU
- Commands respond slowly
- Server becomes unresponsive

**Solutions:**

```bash
# Profile CPU usage
npm run profile:cpu

# Check for infinite loops
npm run analyze:cpu-usage

# Optimize hot code paths
npm run optimize:performance
```

---

## 🔒 Security and Compliance Issues

### Issue: Age Verification Bypass

**Symptoms:**
- Unverified users accessing 21+ content
- Age verification not enforcing
- Compliance logs missing entries

**Immediate Actions:**
```bash
# Emergency: Lock down 21+ channels
npm run emergency:lock-cannabis-channels

# Audit user permissions
npm run audit:user-permissions

# Review age verification logs
npm run audit:age-verification
```

**Solutions:**

```bash
# Reset age verification system
npm run age-verification:reset

# Re-verify all users
npm run age-verification:re-verify-all

# Update permission matrix
npm run permissions:update-matrix
```

### Issue: Content Moderation Failure

**Symptoms:**
- Inappropriate content not being filtered
- Cannabis sales content appearing
- Legal compliance violations

**Emergency Actions:**
```bash
# Enable emergency moderation mode
npm run emergency:strict-moderation

# Review and remove flagged content
npm run moderation:emergency-review

# Notify compliance team
npm run compliance:emergency-alert
```

---

## 🚨 Emergency Procedures

### Complete System Failure

**Step 1: Immediate Response**
```bash
# Stop all services
npm run emergency:stop-all

# Enable maintenance mode
npm run emergency:maintenance-mode

# Notify stakeholders
npm run emergency:notify-stakeholders
```

**Step 2: Assess Damage**
```bash
# Check system integrity
npm run emergency:system-check

# Verify data integrity
npm run emergency:data-check

# Review error logs
npm run emergency:collect-logs
```

**Step 3: Recovery**
```bash
# Restore from backup
npm run emergency:restore-backup

# Restart services gradually
npm run emergency:gradual-restart

# Verify system functionality
npm run emergency:verify-systems
```

### Data Breach Response

**Immediate Actions:**
1. Isolate affected systems
2. Preserve evidence
3. Notify legal team
4. Begin incident response

```bash
# Emergency security lockdown
npm run security:emergency-lockdown

# Audit access logs
npm run security:audit-access

# Reset all credentials
npm run security:reset-all-credentials

# Enable additional monitoring
npm run security:enhanced-monitoring
```

### Compliance Violation

**Immediate Actions:**
1. Document the incident
2. Assess legal implications
3. Implement corrective measures
4. Notify regulatory bodies if required

```bash
# Generate compliance report
npm run compliance:generate-incident-report

# Review all cannabis-related content
npm run compliance:audit-cannabis-content

# Implement additional safeguards
npm run compliance:enhance-safeguards
```

---

## 📞 Escalation Procedures

### When to Escalate

**Level 1 - Technical Support**
- Basic configuration issues
- Common integration problems
- Performance optimization

**Level 2 - System Administrator**
- Database issues
- Security concerns
- Infrastructure problems

**Level 3 - Emergency Response**
- System outages
- Data breaches
- Compliance violations
- Legal issues

### Contact Information

```
Technical Support: support@growmiesnj.com
System Administrator: admin@growmiesnj.com
Emergency Hotline: [Phone Number]
Legal Compliance: legal@growmiesnj.com
```

### Incident Report Template

```markdown
# Incident Report - [ID]

## Incident Details
- **Date/Time**: [Timestamp]
- **Severity**: [Critical/High/Medium/Low]
- **Category**: [Bot/Integration/Security/Compliance]
- **Reporter**: [Name]

## Description
[Detailed description of the issue]

## Impact Assessment
- **Users Affected**: [Number]
- **Services Down**: [List]
- **Compliance Risk**: [Yes/No]

## Resolution Steps
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Root Cause
[Analysis of underlying cause]

## Prevention Measures
[Steps to prevent recurrence]

## Timeline
- **Detected**: [Time]
- **Response Started**: [Time]
- **Resolution**: [Time]
- **Total Downtime**: [Duration]
```

---

## 🔧 Diagnostic Scripts

### Automated Diagnostics

```bash
#!/bin/bash
# comprehensive-diagnostics.sh

echo "=== Growmies NJ Bot Diagnostics ==="
echo "Timestamp: $(date)"
echo ""

echo "=== System Information ==="
node --version
npm --version
echo "Memory: $(free -h | grep Mem | awk '{print $3 "/" $2}')"
echo "Disk: $(df -h / | tail -1 | awk '{print $3 "/" $2 " (" $5 " used)"}')"
echo ""

echo "=== Bot Status ==="
if pgrep -f "node.*growmies" > /dev/null; then
    echo "✅ Bot process running"
else
    echo "❌ Bot process not found"
fi

echo ""
echo "=== Configuration Check ==="
if [ -f .env ]; then
    echo "✅ .env file exists"
    if grep -q "DISCORD_TOKEN=" .env; then
        echo "✅ Discord token configured"
    else
        echo "❌ Discord token missing"
    fi
else
    echo "❌ .env file missing"
fi

echo ""
echo "=== Database Connection ==="
npm run db:ping --silent 2>/dev/null && echo "✅ Database connected" || echo "❌ Database connection failed"

echo ""
echo "=== Discord API Status ==="
curl -s https://discord.com/api/v10/gateway | grep -q "url" && echo "✅ Discord API accessible" || echo "❌ Discord API unreachable"

echo ""
echo "=== Integration Status ==="
# Check RSS webhook
if [ ! -z "$INSTAGRAM_RSS_WEBHOOK" ]; then
    curl -s -I "$INSTAGRAM_RSS_WEBHOOK" | grep -q "200" && echo "✅ Instagram webhook reachable" || echo "❌ Instagram webhook unreachable"
else
    echo "❌ Instagram webhook not configured"
fi

echo ""
echo "=== Recent Errors ==="
if [ -f logs/error.log ]; then
    echo "Last 5 errors:"
    tail -5 logs/error.log
else
    echo "No error log found"
fi
```

### Performance Monitoring Script

```bash
#!/bin/bash
# performance-monitor.sh

while true; do
    echo "$(date): Memory: $(ps aux | grep 'node.*growmies' | grep -v grep | awk '{print $6}')KB, CPU: $(ps aux | grep 'node.*growmies' | grep -v grep | awk '{print $3}')%"
    sleep 30
done
```

---

## 📚 Related Documentation

- [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) - Initial setup procedures
- [TESTING_PROCEDURES.md](docs/TESTING_PROCEDURES.md) - Testing and validation
- [SECURITY_COMPLIANCE.md](docs/SECURITY_COMPLIANCE.md) - Security requirements
- [MAINTENANCE_MONITORING.md](docs/MAINTENANCE_MONITORING.md) - Ongoing maintenance
- [BACKUP_RECOVERY.md](docs/BACKUP_RECOVERY.md) - Disaster recovery procedures

---

**🛠️ This troubleshooting guide helps maintain reliable operation of the Growmies NJ Discord automation system and ensures quick resolution of common issues.**

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Growmies NJ Technical Support Team