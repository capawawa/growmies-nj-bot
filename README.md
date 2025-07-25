# GrowmiesNJ Discord Server Setup Automation

## 🌱 Cannabis Community Discord Server Automation Suite

A comprehensive automation system for deploying and managing the GrowmiesNJ Discord server, a cannabis community platform with full New Jersey regulation compliance.

## 📋 System Overview

**7 Core Automation Scripts** - 4,118 total lines of code
- Complete Discord server structure creation
- Cannabis compliance integration (18+/21+ age verification)
- Railway deployment with CI/CD integration
- Database setup and migration automation
- Health monitoring and emergency response
- 100% New Jersey cannabis regulation compliance

## 🛠️ Technology Stack

- **Backend**: Node.js 18+, Discord.js v14
- **Database**: PostgreSQL with Sequelize ORM
- **Deployment**: Railway with GitHub Actions CI/CD
- **Process Management**: PM2 for production
- **Security**: Environment variables, secrets management
- **Compliance**: Cannabis age verification (18+/21+), NJ regulations

## 📂 Automation Scripts

### 1. [`setup-production-database.js`](scripts/setup-production-database.js) (604 lines)
**Database Setup & Migration Automation**
- PostgreSQL database initialization
- Cannabis compliance data structures
- Age verification tables and constraints
- Audit logging with 7-year retention
- Migration system with rollback support

### 2. [`setup-discord-server.js`](scripts/setup-discord-server.js) (619 lines)
**Discord Server Structure Creation**
- Age-restricted channels (18+/21+)
- Cannabis community categories
- Educational disclaimer integration
- New Jersey regulation compliance
- Channel permission templates

### 3. [`setup-role-hierarchy.js`](scripts/setup-role-hierarchy.js) (551 lines)
**Role & Permission Management**
- Age-verified roles (18+ General, 21+ Cannabis)
- Compliance officer roles
- Medical patient access roles
- Permission hierarchy management
- Role-based access controls

### 4. [`configure-server-settings.js`](scripts/configure-server-settings.js) (459 lines)
**Server Configuration Automation**
- Cannabis compliance messaging
- Verification level configuration
- Welcome screen with age verification
- Content filtering and moderation
- Server branding with legal disclaimers

### 5. [`setup-monitoring.js`](scripts/setup-monitoring.js) (588 lines)
**Health Monitoring & Maintenance**
- Cannabis compliance monitoring
- Automated maintenance schedules
- Health check systems
- Performance tracking
- Alert and notification systems

### 6. [`deploy-complete-system.js`](scripts/deploy-complete-system.js) (686 lines)
**Complete Bot Deployment**
- Railway deployment automation
- GitHub Actions CI/CD integration
- Service health validation
- Environment configuration
- Command registration and validation

### 7. [`emergency-rollback.js`](scripts/emergency-rollback.js) (611 lines)
**Emergency Response & Recovery**
- Cannabis compliance emergency protocols
- Automated backup and restoration
- Violation response procedures
- System recovery automation
- Emergency notification systems

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Discord Bot Token
- PostgreSQL database
- Railway account
- Git repository

### Installation

1. **Clone and Setup**
```bash
git clone [your-repository]
cd growmiesnj-automation
npm install discord.js sequelize pg dotenv winston fs-extra
```

2. **Environment Configuration**
Create `.env` file:
```env
DISCORD_TOKEN=your_discord_bot_token
DATABASE_URL=postgresql://user:password@host:port/database
GUILD_ID=your_discord_server_id
CLIENT_ID=your_discord_application_id
```

3. **Discord Bot Setup**
- Create Discord application at https://discord.com/developers/applications
- Generate bot token and add to environment
- Enable required intents: Guilds, Guild Messages, Guild Members
- Ensure bot has Administrator permissions

### Deployment

**Recommended Execution Order:**
```bash
# 1. Setup database and migrations
node scripts/setup-production-database.js

# 2. Create Discord server structure
node scripts/setup-discord-server.js

# 3. Setup role hierarchy
node scripts/setup-role-hierarchy.js

# 4. Configure server settings
node scripts/configure-server-settings.js

# 5. Setup monitoring systems
node scripts/setup-monitoring.js

# 6. Deploy complete system
node scripts/deploy-complete-system.js
```

**Railway Deployment:**
```bash
# Deploy to Railway with CI/CD
node scripts/deploy-complete-system.js --environment=production
```

## 🌿 Cannabis Compliance Features

### Age Verification System
- **18+ General Access**: Basic server participation
- **21+ Cannabis Content**: Age-restricted cannabis discussions
- **Real-time Validation**: Continuous age verification monitoring
- **Compliance Auditing**: Complete audit trail with 7-year retention

### New Jersey Regulation Compliance
- Full compliance with New Jersey cannabis laws
- Educational purpose disclaimers for all cannabis content
- Medical patient support with specialized roles
- Jurisdiction-specific legal requirements integration

### Legal Protection
- Comprehensive legal disclaimers
- Educational content marking
- Compliance officer oversight
- Emergency violation response protocols

## 🔧 Usage Instructions

### Individual Script Usage
```bash
# Run any script independently
node scripts/[script-name].js

# Dry-run mode for validation
node scripts/[script-name].js --dry-run

# Verbose logging
node scripts/[script-name].js --verbose
```

### Monitoring and Maintenance
```bash
# Health check
node scripts/setup-monitoring.js --health-check

# Compliance audit
node scripts/setup-monitoring.js --compliance-audit

# Emergency rollback
node scripts/emergency-rollback.js --emergency
```

## 🚨 Emergency Procedures

### Compliance Violations
```bash
# Immediate compliance breach response
node scripts/emergency-rollback.js --compliance-violation

# Age verification breach
node scripts/emergency-rollback.js --age-verification-breach
```

### System Recovery
```bash
# Complete system rollback
node scripts/emergency-rollback.js --full-rollback

# Database restoration
node scripts/emergency-rollback.js --restore-database
```

## 📊 Monitoring and Health Checks

### Automated Monitoring
- **Service Health**: Continuous bot and database monitoring
- **Compliance Tracking**: Real-time cannabis compliance validation
- **Performance Metrics**: Response times and resource usage
- **Audit Logging**: Complete action logging with retention

### Maintenance Schedules
- **Weekly**: Automated optimization and cleanup
- **Monthly**: Compliance audits and security reviews
- **Quarterly**: Backup restoration testing
- **Annually**: Full system security assessment

## 🛡️ Security Features

### Environment Security
- All credentials managed via environment variables
- No hardcoded tokens or secrets in codebase
- Railway secrets management integration
- Secure database connection handling

### Access Controls
- Role-based permission system
- Age-verified access restrictions
- Compliance officer oversight
- Audit trail for all actions

### Cannabis Compliance Security
- Age verification with multiple validation layers
- Legal disclaimer acceptance tracking
- Educational purpose content marking
- Emergency compliance breach protocols

## 🔍 Troubleshooting

### Common Issues

**Database Connection Failures**
```bash
# Check environment variables
echo $DATABASE_URL

# Validate database connectivity
node scripts/setup-production-database.js --test-connection
```

**Discord API Issues**
```bash
# Verify bot permissions
node scripts/setup-discord-server.js --check-permissions

# Test bot token
node scripts/deploy-complete-system.js --validate-token
```

**Cannabis Compliance Errors**
```bash
# Validate compliance systems
node scripts/setup-monitoring.js --compliance-check

# Age verification troubleshooting
node scripts/setup-role-hierarchy.js --age-verification-test
```

### Error Recovery
- All scripts include automatic transaction rollback
- Progress checkpoints for large operations
- Detailed error logging with resolution suggestions
- Emergency rollback procedures for critical failures

## 📈 Performance and Scaling

### Optimization Features
- Database connection pooling
- Discord API rate limiting compliance
- Efficient batch operations
- Resource usage monitoring

### Scaling Considerations
- Horizontal scaling support via Railway
- Database connection management
- Load balancing for high-traffic scenarios
- Performance monitoring and alerting

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Implement changes with cannabis compliance validation
4. Run full test suite including compliance checks
5. Submit pull request with detailed description

### Cannabis Compliance Requirements
- All features MUST include age verification integration
- New Jersey regulation compliance is mandatory
- Legal disclaimers required for cannabis-related content
- Audit logging integration for all cannabis-related operations

## 📄 License and Legal

### Educational Purpose
This Discord server and all cannabis-related content are intended for educational purposes only. Users must be 18+ for general access and 21+ for cannabis content access in compliance with New Jersey state laws.

### Legal Disclaimers
- Cannabis content is educational only
- Medical advice disclaimers included
- New Jersey jurisdiction compliance
- Age verification legally required

### Compliance Auditing
- 7-year audit log retention
- Regular compliance reviews
- Automated violation detection
- Emergency response protocols

## 📞 Support and Maintenance

### System Maintenance
- Automated weekly maintenance windows
- Monthly security updates
- Quarterly compliance audits
- Annual security assessments

### Emergency Support
- 24/7 emergency rollback procedures
- Compliance violation response protocols
- System recovery automation
- Emergency contact procedures

---

## 🏗️ Architecture Overview

### System Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Discord.js    │────│   PostgreSQL     │────│    Railway      │
│   Bot Client    │    │   Database       │    │   Deployment    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌──────────────────┐
                    │   Cannabis       │
                    │   Compliance     │
                    │   System         │
                    └──────────────────┘
```

### Cannabis Compliance Integration
- **Age Verification**: Multi-layer validation system
- **Content Monitoring**: Real-time compliance checking
- **Audit Logging**: Complete action tracking
- **Emergency Response**: Automated violation protocols

### Deployment Pipeline
1. **Code Push** → GitHub Actions trigger
2. **Testing** → Compliance validation
3. **Railway Deploy** → Automated deployment
4. **Health Checks** → System validation
5. **Monitoring** → Continuous operation

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Cannabis Compliance**: 100% New Jersey Regulation Compliant  
**Total Lines of Code**: 4,118 across 7 automation scripts  
**MCP Tools Used**: memory, sequentialthinking, brave-search, context7
