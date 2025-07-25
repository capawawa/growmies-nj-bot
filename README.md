# 🌿 Growmies NJ Discord Bot

A comprehensive Discord automation bot designed specifically for the Growmies NJ cannabis community. Built with Discord.js v14, this bot provides age verification, community management, and cannabis-focused features while ensuring full compliance with New Jersey state laws.

## 🚀 Features

### ✅ **Phase 1 - Core Functionality (ACTIVE)**
- **🔞 Age Verification System**: 21+ verification with NJ cannabis law compliance
- **🤖 Discord.js v14 Integration**: Modern slash commands and interactions
- **⚡ Real-time Health Monitoring**: Bot status and latency tracking
- **🛡️ Security Framework**: Role-based permissions and rate limiting
- **📝 Comprehensive Logging**: Event tracking and audit trails

### 🔄 **Phase 2 - Enhanced Features (PLANNED)**
- **📱 Instagram Integration**: Automated content syncing
- **🤝 Carl-bot Integration**: Enhanced moderation capabilities
- **📅 Event Management**: Community event scheduling and notifications
- **💾 Database Integration**: User data and preference storage

### 🎯 **Phase 3 - Advanced Automation (FUTURE)**
- **🎨 Dynamic Content Generation**: AI-powered content creation
- **📊 Analytics Dashboard**: Community insights and metrics
- **🔗 External API Integrations**: Weather, news, and cannabis data
- **📲 Mobile App Companion**: Cross-platform community access

## 📋 Prerequisites

- **Node.js**: Version 16.11.0 or higher
- **Discord Bot Application**: Created via Discord Developer Portal
- **Discord Server**: Admin permissions required
- **Git**: For repository management

## 🛠️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/your-username/growmies-nj-bot.git
cd growmies-nj-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env
```

### 4. Bot Configuration
```bash
# Copy configuration template
cp config.json.example config.json

# Customize bot settings
nano config.json
```

### 5. Deploy Commands
```bash
# Register slash commands with Discord
npm run deploy
```

### 6. Start Bot
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## ⚙️ Configuration

### Discord Bot Setup

1. **Create Discord Application**
   - Visit [Discord Developer Portal](https://discord.com/developers/applications)
   - Create new application
   - Navigate to "Bot" section
   - Copy bot token

2. **Bot Permissions**
   Required permissions integer: `8` (Administrator) or custom permissions:
   - Send Messages
   - Use Slash Commands
   - Manage Roles
   - Read Message History
   - Add Reactions
   - Attach Files

3. **Server Setup**
   - Invite bot to server using OAuth2 URL
   - Create required roles: "Verified Member", "Unverified"
   - Create required channels: "#age-verification", "#welcome", "#mod-logs"

### Environment Variables

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `DISCORD_TOKEN` | Bot token from Discord Developer Portal | ✅ | `your_bot_token_here` |
| `DISCORD_CLIENT_ID` | Application client ID | ✅ | `123456789012345678` |
| `DISCORD_GUILD_ID` | Server guild ID for development | ✅ | `987654321098765432` |
| `MIN_AGE` | Minimum age for verification | ✅ | `21` |
| `NODE_ENV` | Environment mode | ✅ | `development` |

### Cannabis Compliance Settings

- **Minimum Age**: 21 years (New Jersey law requirement)
- **Legal Disclaimers**: Automatically included in verification
- **Privacy Protection**: All verification interactions are ephemeral
- **Law Version Tracking**: NJ cannabis law version 2024

## 🎮 Usage

### Slash Commands

| Command | Description | Permissions | Cooldown |
|---------|-------------|-------------|----------|
| `/verify` | Start age verification process | Everyone | 60s |
| `/ping` | Check bot latency and status | Everyone | 5s |
| `/server` | Display server information | Verified Members | 30s |

### Age Verification Process

1. **User runs `/verify` command**
2. **Bot displays legal disclaimer and requirements**
3. **User confirms 21+ age via button interaction**
4. **Bot assigns "Verified Member" role**
5. **User gains access to cannabis discussion channels**

### Moderation Features

- **Auto-role assignment** upon verification
- **Audit logging** for all verification events
- **Rate limiting** to prevent spam
- **Error handling** with user-friendly messages

## 🏗️ Development

### Project Structure
```
growmies-nj-bot/
├── src/
│   ├── commands/
│   │   ├── age-verification/
│   │   │   └── verify.js
│   │   └── utility/
│   │       └── ping.js
│   ├── events/
│   │   ├── ready.js
│   │   └── interactionCreate.js
│   └── index.js
├── deploy-commands.js
├── package.json
├── .env.example
├── config.json.example
├── .gitignore
└── README.md
```

### Adding New Commands

1. **Create command file** in appropriate category folder
2. **Use SlashCommandBuilder** for command definition
3. **Export command object** with `data` and `execute` properties
4. **Test command** in development environment
5. **Deploy commands** using `npm run deploy`

### Code Standards

- **ES6+ Syntax**: Modern JavaScript features
- **Error Handling**: Comprehensive try-catch blocks
- **Logging**: Structured logging for debugging
- **Documentation**: JSDoc comments for functions
- **Security**: Input validation and sanitization

## 🧪 Testing

### Manual Testing
```bash
# Start bot in development mode
npm run dev

# Test slash commands in Discord server
# Verify age verification workflow
# Check error handling scenarios
```

### Automated Testing (Future)
- Jest test framework integration
- Command interaction testing
- Database operation testing
- API integration testing

## 📊 Monitoring

### Health Checks
- **Bot Status**: Online/offline monitoring
- **Latency Tracking**: API response times
- **Error Rates**: Exception tracking
- **Command Usage**: Interaction statistics

### Logging Levels
- **ERROR**: Critical failures requiring attention
- **WARN**: Non-critical issues and warnings
- **INFO**: General operational information
- **DEBUG**: Detailed debugging information

## 🚀 Deployment

### Development Environment
```bash
npm run dev
```

### Production Environment
```bash
# Set production environment
export NODE_ENV=production

# Start with process manager
npm start

# Or use PM2 for process management
pm2 start ecosystem.config.js
```

### Docker Deployment (Future)
```bash
# Build container
docker build -t growmies-nj-bot .

# Run container
docker run -d --env-file .env growmies-nj-bot
```

## ⚖️ Legal Compliance

### New Jersey Cannabis Laws
- **Age Requirement**: 21+ verification mandatory
- **Legal Disclaimers**: Included in all cannabis discussions
- **Privacy Protection**: User data handled securely
- **Law Updates**: Regular compliance reviews

### Discord Terms of Service
- **Community Guidelines**: Enforced through moderation
- **Content Policies**: Cannabis discussions within legal bounds
- **User Safety**: Age verification and content filtering

### Data Privacy
- **Minimal Data Collection**: Only necessary verification data
- **Secure Storage**: Encrypted database storage
- **User Rights**: Data deletion and access requests
- **GDPR Compliance**: EU user data protection

## 🤝 Contributing

### Development Workflow
1. **Fork repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Code Review Process
- **Automated Testing**: All tests must pass
- **Code Standards**: ESLint and Prettier compliance
- **Security Review**: Vulnerability scanning
- **Cannabis Compliance**: Legal requirement verification

### Issue Reporting
- **Bug Reports**: Use issue template with reproduction steps
- **Feature Requests**: Detailed description with use cases
- **Security Issues**: Private disclosure via email

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Community Support
- **Discord Server**: [Growmies NJ Community](https://discord.gg/growmies-nj)
- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive setup and usage guides

### Developer Contact
- **Project Maintainer**: Growmies NJ Development Team
- **Email**: support@growmies-nj.com
- **GitHub**: @your-username

### Emergency Support
For critical security issues or legal compliance concerns, contact us immediately via email.

## 🙏 Acknowledgments

- **Discord.js Community**: Framework support and documentation
- **Growmies NJ Members**: Feature requests and testing
- **New Jersey Cannabis Community**: Legal guidance and compliance
- **Open Source Contributors**: Dependencies and libraries

---

**⚠️ Legal Notice**: This bot is designed for educational and community purposes within the legal cannabis framework of New Jersey. Users must be 21+ and comply with all applicable local and state laws. Cannabis consumption and cultivation should only occur where legally permitted.

**🌿 Powered by the Growmies NJ Community** - Built with ❤️ for cannabis enthusiasts in New Jersey.
