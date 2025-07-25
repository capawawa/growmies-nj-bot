# 🌱 Growmies NJ Bot - Deployment Automation Scripts

Complete deployment automation suite for the Growmies NJ Discord bot with comprehensive cannabis community features and 21+ age verification compliance.

## 📋 Overview

This deployment automation system provides a complete solution for setting up and maintaining the Growmies NJ Discord bot, including:

- **Complete Discord server configuration** with 10-category cannabis community structure
- **Third-party bot integrations** (Carl-bot, Sesh, Statbot, Xenon)
- **Instagram automation** for @growmiesNJ content sharing
- **Health monitoring system** with real-time alerts and dashboard
- **GitHub Actions CI/CD pipeline** with automated testing and deployment

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and npm installed
2. **Discord bot token** and guild ID
3. **GitHub repository** with secrets configured
4. **Discord server** with admin permissions
5. **Instagram account** (@growmiesNJ) for content automation

### Environment Setup

1. Copy environment template:
```bash
cp .env.example .env
```

2. Configure required environment variables:
```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_GUILD_ID=your_guild_id_here
DISCORD_CLIENT_ID=your_client_id_here
MONITORING_WEBHOOK=your_monitoring_webhook_url
```

3. Install dependencies:
```bash
npm install
```

### Initial Setup - GitHub Secrets Configuration

Before running any deployment scripts, configure GitHub Secrets:

```powershell
# For Windows users - automated GitHub Secrets setup
.\scripts\setup-github-secrets.ps1
```

This PowerShell script automatically:
- Reads credentials from `CREDENTIALS_COLLECTION.txt`
- Authenticates with GitHub CLI
- Sets all required GitHub Secrets
- Verifies configuration

### Deployment Sequence

Run deployment scripts in this order:

```bash
# 1. Deploy Discord server configuration
node scripts/deploy-server-config.js

# 2. Setup third-party bot integrations
node scripts/deploy-third-party-bots.js

# 3. Configure Instagram integration
node scripts/deploy-instagram-integration.js

# 4. Start health monitoring system
node scripts/deploy-monitoring.js
```

## 📁 Script Documentation

### 1. `deploy-server-config.js` - Discord Server Setup

**Purpose:** Automated Discord server configuration with cannabis community structure.

**Features:**
- 10-category channel layout optimized for cannabis growing community
- Role hierarchy with progressive expertise levels (Admin → Grower → Verified 21+)
- Age verification integration with 21+ compliance
- Permission matrices for cannabis content protection
- Welcome screen and system channel configuration

**Cannabis Compliance:**
- All cannabis discussions restricted to 21+ verified members
- Age verification required for accessing cannabis-related channels
- Compliance with New Jersey cannabis laws and Discord ToS

**Usage:**
```bash
node scripts/deploy-server-config.js
```

**Output:**
- Configured Discord server with full channel structure
- Role hierarchy with appropriate permissions
- Configuration saved to `config/server-configuration.json`

### 2. `deploy-third-party-bots.js` - Bot Integration

**Purpose:** Automated setup of essential third-party Discord bots.

**Integrated Bots:**
- **Carl-bot**: Reaction roles, automod, custom commands, welcome messages
- **Sesh**: Event management, cannabis competitions, community meetups
- **Statbot**: Analytics, engagement tracking, activity-based roles
- **Xenon**: Automated server backups and restoration capabilities

**Features:**
- Automated bot invitation and permission setup
- Custom configuration for cannabis community needs
- Integration with age verification system
- Event management for cannabis competitions and educational workshops

**Usage:**
```bash
node scripts/deploy-third-party-bots.js
```

**Manual Steps Required:**
1. Invite bots using generated invitation links
2. Configure Carl-bot reaction roles via dashboard
3. Set up Sesh events for community activities
4. Configure Statbot analytics and activity roles

### 3. `deploy-instagram-integration.js` - Social Media Automation

**Purpose:** Automated Instagram content sharing from @growmiesNJ to Discord.

**Features:**
- RSS.app webhook integration for real-time Instagram posts
- Content moderation with cannabis compliance checking
- Age-restricted content routing to 21+ channels only
- Discord embed formatting with engagement metrics
- Hashtag filtering and content scheduling

**Content Moderation:**
- Banned keyword filtering for compliance
- Required hashtag verification (#growmiesNJ)
- Age restriction enforcement for cannabis content
- Manual post approval system for sensitive content

**Usage:**
```bash
node scripts/deploy-instagram-integration.js
```

**Manual Setup Required:**
1. Visit [RSS.app](https://rss.app) and create account
2. Add Instagram feed for @growmiesNJ
3. Configure webhook URL from Discord
4. Set up hashtag filtering and content moderation
5. Test integration with sample Instagram post

### 4. `deploy-monitoring.js` - Health Monitoring

**Purpose:** Comprehensive health monitoring and alerting system.

**Features:**
- Real-time system monitoring (memory, CPU, response times)
- Discord bot connection health tracking
- Third-party bot presence monitoring
- Interactive status dashboard with auto-refresh
- Alert system with Discord webhook notifications

**Monitoring Endpoints:**
- `http://localhost:3000/health` - Basic health check (JSON)
- `http://localhost:3000/metrics` - Detailed system metrics
- `http://localhost:3000/status` - Interactive dashboard

**Alert Thresholds:**
- Memory usage > 85%
- CPU usage > 80%
- Response time > 5 seconds
- Error rate > 10%

**Usage:**
```bash
node scripts/deploy-monitoring.js
```

**External Monitoring Integration:**
- UptimeRobot health check configuration
- Pingdom monitoring setup
- CloudWatch/Papertrail log aggregation

## 🔧 Configuration Files

### Generated Configuration Files

Each script generates configuration files in the `config/` directory:

- `config/server-configuration.json` - Discord server structure and settings
- `config/third-party-bots.json` - Bot integration settings and commands
- `config/instagram-integration.json` - Social media automation configuration
- `config/monitoring.json` - Health monitoring system settings

### Backup and Rollback

All scripts create backup configurations before making changes:

```bash
# Restore previous server configuration
node scripts/deploy-server-config.js --restore

# Rollback bot integrations
node scripts/deploy-third-party-bots.js --rollback
```

## 📊 Monitoring and Analytics

### Health Dashboard

Access the monitoring dashboard at `http://localhost:3000/status` for real-time system status including:

- Discord bot connection status and ping
- System resource usage (memory, CPU)
- Third-party bot presence monitoring
- Instagram integration health
- Error rates and performance metrics

### Alert System

Automated alerts are sent via Discord webhook for:

- **Critical**: Bot disconnections, system failures
- **Warning**: High resource usage, degraded performance
- **Info**: Successful deployments, system updates

### Analytics Tracking

Comprehensive analytics tracking includes:

- Server growth and member engagement
- Command usage and interaction metrics
- Instagram content performance
- Event participation and community activity

## 🛡️ Security and Compliance

### Cannabis Compliance

- **Age Verification**: 21+ verification required for all cannabis content
- **Content Moderation**: Automated filtering of prohibited content
- **Legal Compliance**: Adherence to New Jersey cannabis laws
- **Privacy Protection**: Secure handling of verification data

### Security Features

- **Environment Variable Protection**: Sensitive data in .env files
- **Permission Matrices**: Role-based access control
- **Audit Logging**: Comprehensive logging of all actions
- **Backup Systems**: Automated configuration backups

### Data Protection

- **GDPR Compliance**: User data handling and deletion rights
- **Encryption**: Secure storage of sensitive information
- **Access Controls**: Limited access to administrative functions
- **Regular Audits**: Periodic security and compliance reviews

## 🚨 Troubleshooting

### Common Issues

1. **Bot Token Invalid**
   - Verify token in Discord Developer Portal
   - Check environment variable configuration
   - Ensure bot has necessary permissions

2. **Permission Errors**
   - Verify bot role hierarchy position
   - Check channel-specific permissions
   - Ensure bot has Administrator permissions for setup

3. **Instagram Integration Failed**
   - Verify RSS.app account and configuration
   - Check webhook URL accessibility
   - Test with manual Instagram post

4. **Health Monitoring Not Working**
   - Check port availability (default: 3000)
   - Verify webhook configuration
   - Test endpoints manually

### Debug Mode

Enable debug logging for detailed troubleshooting:

```bash
DEBUG=true node scripts/deploy-server-config.js
```

### Support and Resources

- **Discord.js Documentation**: [discord.js.org](https://discord.js.org/)
- **New Jersey Cannabis Laws**: [nj.gov/cannabis](https://www.nj.gov/cannabis/)
- **RSS.app Support**: [rss.app/help](https://rss.app/help)
- **GitHub Issues**: Report bugs and request features

## 📈 Future Enhancements

### Planned Features

- **Advanced Analytics**: Machine learning for engagement prediction
- **Automated Events**: AI-powered event scheduling and management
- **Mobile App Integration**: Custom mobile app for community members
- **Legal Updates**: Automated tracking of cannabis law changes

### Integration Roadmap

- **Twitch Integration**: Live streaming support for growing tutorials
- **YouTube Integration**: Educational content automation
- **Reddit Integration**: Cross-platform community building
- **Calendar Integration**: Google Calendar sync for events

## 📞 Support

For technical support or questions about the deployment automation:

1. **Check Documentation**: Review this README and script comments
2. **GitHub Issues**: Submit detailed bug reports or feature requests
3. **Discord Community**: Join the Growmies NJ Discord for community support
4. **Direct Contact**: Reach out to the development team for urgent issues

---

**🌱 Growmies NJ - Building New Jersey's Premier Cannabis Growing Community**

*This deployment automation system ensures reliable, scalable, and compliant operation of the Growmies NJ Discord bot while maintaining the highest standards of security and user experience.*