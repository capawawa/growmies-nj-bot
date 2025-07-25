# Growmies NJ Discord Bot - Deployment Guide

## 🚀 Complete Deployment Guide for Cannabis Community Discord Automation

**Target Audience**: Technical administrators, server owners, and community managers  
**Estimated Time**: 45-90 minutes for complete setup  
**Prerequisites**: Basic command line knowledge, Discord server admin access

---

## 📋 Table of Contents

1. [Prerequisites & Requirements](#prerequisites--requirements)
2. [Environment Setup](#environment-setup)
3. [Quick Start (Automated)](#quick-start-automated)
4. [Manual Deployment](#manual-deployment)
5. [Post-Deployment Validation](#post-deployment-validation)
6. [Related Documentation](#related-documentation)

---

## 🔧 Prerequisites & Requirements

### System Requirements
- **Operating System**: Linux, Windows, or macOS
- **Node.js**: Version 16.9.0 or higher
- **npm**: Version 7.0.0 or higher
- **Memory**: Minimum 512MB RAM
- **Storage**: 1GB free space
- **Network**: Stable internet connection

### Required Accounts & Access
- **Discord Account** with server administrator permissions
- **GitHub Account** (for repository access and CI/CD)
- **Instagram Business Account** (@growmiesNJ)
- **RSS.app Account** (for Instagram integration)
- **Hosting Provider** (VPS/Cloud server for production)

### Legal Compliance Requirements
- ⚠️ **CRITICAL**: Server must comply with New Jersey cannabis laws
- ⚠️ **MANDATORY**: 21+ age verification for all cannabis content
- ⚠️ **REQUIRED**: Content moderation and privacy protection

---

## 🏗️ Environment Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/growmies-nj-discord-bot.git
cd growmies-nj-discord-bot
```

**✅ Validation**: Confirm you see the following key files:
- `package.json`
- `.env.example`
- `config.json.example`
- `scripts/` directory

### Step 2: Install Dependencies
```bash
npm install
```

**✅ Validation**: Run `npm list discord.js` - should show version 14.x.x

### Step 3: Environment Configuration
```bash
cp .env.example .env
cp config.json.example config.json
```

**✅ Validation**: Both `.env` and `config.json` files should exist

### Step 4: Configure Environment Variables

Edit `.env` file with your credentials:
```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_server_id_here

# Database Configuration
DATABASE_URL=your_database_connection_string

# Instagram Integration
INSTAGRAM_RSS_WEBHOOK=your_rss_app_webhook_url

# Monitoring & Alerts
MONITORING_WEBHOOK=your_monitoring_webhook_url
ALERT_CHANNEL_ID=your_alert_channel_id

# Security
ENCRYPTION_KEY=your_32_character_encryption_key
JWT_SECRET=your_jwt_secret_key

# Compliance
AGE_VERIFICATION_CHANNEL=your_age_verification_channel_id
COMPLIANCE_LOG_CHANNEL=your_compliance_log_channel_id
```

**⚠️ Security Note**: Never commit `.env` files to version control

### Step 5: Discord Bot Setup

1. **Create Discord Application**:
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Name: "Growmies NJ Bot"
   - Navigate to "Bot" section
   - Click "Create Bot"

2. **Configure Bot Permissions**:
   - **Required Permissions**:
     - Manage Server
     - Manage Roles
     - Manage Channels
     - Read Messages
     - Send Messages
     - Manage Messages
     - Embed Links
     - Attach Files
     - Read Message History
     - Use Slash Commands
     - Connect (for voice channels)
     - Speak (for voice channels)

3. **Generate Invite Link**:
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=8&scope=bot%20applications.commands
   ```

4. **Add Bot to Server**:
   - Use generated invite link
   - Ensure bot has highest role (except @everyone)

**✅ Validation**: Bot should appear online in your Discord server

---

## 🚀 Quick Start (Automated)

### Option A: GitHub Actions Deployment (Recommended)

1. **Fork Repository** to your GitHub account

2. **Configure GitHub Secrets**:
   - Go to Repository Settings → Secrets and Variables → Actions
   - Add all environment variables from `.env` as secrets

3. **Trigger Deployment**:
   ```bash
   git push origin main
   ```

4. **Monitor Deployment**:
   - Check Actions tab in GitHub
   - Deployment takes 5-10 minutes
   - Green checkmark indicates success

**✅ Validation**: All GitHub Actions workflows pass

### Option B: Local Automated Deployment

```bash
# Run complete deployment script
npm run deploy:all

# Or run individual components
npm run deploy:server-config
npm run deploy:third-party-bots
npm run deploy:instagram
npm run deploy:monitoring
```

**✅ Validation**: All scripts complete without errors

---

## 🔧 Manual Deployment

### Step 1: Start Discord Bot
```bash
# Development mode
npm run dev

# Production mode
npm start
```

**✅ Validation**: Console shows "Bot is ready!" message

### Step 2: Deploy Server Configuration
```bash
node scripts/deploy-server-config.js
```

**Expected Output**:
- 10 categories created
- 25+ channels created
- Role hierarchy established
- Permissions configured

**✅ Validation**: Server matches structure in [SERVER_STRUCTURE.md](docs/SERVER_STRUCTURE.md)

### Step 3: Configure Third-Party Bots
```bash
node scripts/deploy-third-party-bots.js
```

**Bot Configuration**:
- **Carl-bot**: Moderation and automod
- **Sesh**: Event scheduling
- **Statbot**: Analytics and insights
- **Xenon**: Backup and templates

**✅ Validation**: All bots respond to test commands

### Step 4: Setup Instagram Integration
```bash
node scripts/deploy-instagram-integration.js
```

**Integration Components**:
- RSS.app webhook configuration
- Instagram post parsing
- Auto-posting to #instagram-feed
- Content moderation filters

**✅ Validation**: Test post appears in Discord channel

### Step 5: Deploy Monitoring System
```bash
node scripts/deploy-monitoring.js
```

**Monitoring Features**:
- Health checks every 5 minutes
- Performance metrics collection
- Error alerting system
- Daily status reports

**✅ Validation**: Monitoring dashboard accessible

---

## ✅ Post-Deployment Validation

### Automated Testing
```bash
# Run comprehensive test suite
npm test

# Run specific test categories
npm run test:bot
npm run test:integrations
npm run test:compliance
```

### Manual Testing Checklist

#### Bot Functionality
- [ ] Bot responds to `/ping` command
- [ ] Slash commands auto-complete
- [ ] Age verification flow works
- [ ] Role assignment functions
- [ ] Channel permissions correct

#### Server Structure
- [ ] All 10 categories present
- [ ] Channel hierarchy correct
- [ ] Role permissions appropriate
- [ ] Age-restricted content protected

#### Third-Party Integrations
- [ ] Carl-bot automod active
- [ ] Sesh events schedulable
- [ ] Statbot collecting data
- [ ] Xenon backups configured

#### Instagram Integration
- [ ] RSS webhook receiving posts
- [ ] Posts formatted correctly
- [ ] Content filters working
- [ ] Compliance checks active

#### Monitoring System
- [ ] Health status reporting
- [ ] Error alerts functioning
- [ ] Performance metrics collected
- [ ] Daily reports generated

### Performance Validation
- **Response Time**: Commands respond within 2 seconds
- **Memory Usage**: Below 256MB under normal load
- **CPU Usage**: Below 50% during peak activity
- **Uptime**: 99.5% availability target

---

## 🔧 Configuration Files

### config.json Structure
```json
{
  "server": {
    "guildId": "your_server_id",
    "ownerId": "your_user_id",
    "prefix": "!"
  },
  "channels": {
    "welcome": "channel_id",
    "rules": "channel_id",
    "ageVerification": "channel_id",
    "general": "channel_id",
    "instagramFeed": "channel_id",
    "complianceLog": "channel_id",
    "modLog": "channel_id"
  },
  "roles": {
    "admin": "role_id",
    "moderator": "role_id",
    "grower": "role_id",
    "verified21": "role_id",
    "member": "role_id"
  },
  "features": {
    "ageVerification": true,
    "instagramIntegration": true,
    "monitoring": true,
    "compliance": true
  }
}
```

---

## 🚨 Troubleshooting

### Common Issues

#### Bot Won't Start
- **Check**: `.env` file exists and populated
- **Verify**: Discord token is valid
- **Confirm**: Node.js version compatibility
- **Review**: Console error messages

#### Commands Not Working
- **Verify**: Bot has required permissions
- **Check**: Slash commands registered
- **Confirm**: Guild ID correct
- **Test**: Bot online status

#### Integration Failures
- **Instagram**: Verify RSS.app webhook URL
- **Third-party bots**: Check invite permissions
- **Monitoring**: Validate webhook endpoints
- **Database**: Test connection string

**📖 For detailed troubleshooting**: See [TROUBLESHOOTING_GUIDE.md](docs/TROUBLESHOOTING_GUIDE.md)

---

## 📚 Related Documentation

| Document | Purpose | Target Audience |
|----------|---------|----------------|
| [TESTING_PROCEDURES.md](docs/TESTING_PROCEDURES.md) | Comprehensive testing guide | DevOps, QA |
| [INSTAGRAM_INTEGRATION.md](docs/INSTAGRAM_INTEGRATION.md) | Instagram setup details | Social media managers |
| [THIRD_PARTY_BOTS.md](docs/THIRD_PARTY_BOTS.md) | Bot configuration guide | Server administrators |
| [SECURITY_COMPLIANCE.md](docs/SECURITY_COMPLIANCE.md) | Cannabis law compliance | Legal, compliance teams |
| [MAINTENANCE_MONITORING.md](docs/MAINTENANCE_MONITORING.md) | System maintenance | System administrators |
| [USER_GUIDE.md](docs/USER_GUIDE.md) | Member instructions | Discord server members |
| [ADMIN_GUIDE.md](docs/ADMIN_GUIDE.md) | Admin procedures | Server administrators |
| [BACKUP_RECOVERY.md](docs/BACKUP_RECOVERY.md) | Disaster recovery | DevOps, system admins |

---

## 📞 Support

### Technical Support
- **GitHub Issues**: Report bugs and feature requests
- **Discord Server**: Community support and discussions
- **Documentation**: Comprehensive guides and troubleshooting

### Compliance Support
- **Legal Review**: Cannabis law compliance verification
- **Age Verification**: 21+ verification system guidance
- **Content Moderation**: Community guidelines enforcement

### Emergency Contacts
- **System Administrator**: [Contact Information]
- **Legal Compliance**: [Contact Information]
- **Community Manager**: [Contact Information]

---

**🌱 Welcome to the Growmies NJ community!**

*This deployment guide ensures your Discord automation system is configured correctly, compliant with New Jersey cannabis regulations, and ready to serve the cannabis growing community.*

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Growmies NJ Development Team