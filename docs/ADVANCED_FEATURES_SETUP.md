# Advanced Features Setup Guide - GrowmiesNJ Discord Bot

## 📋 Overview

This guide provides comprehensive setup instructions for administrators to configure and deploy the three advanced feature systems: **Music Bot**, **AI Chat Integration**, and **Economy System**. These features require additional configuration, API keys, and database setup beyond the basic bot deployment.

## 🔧 Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **Database**: MongoDB 5.0+ (required for Economy System)
- **Memory**: Minimum 2GB RAM (4GB+ recommended for full features)
- **Storage**: 1GB+ free space for music cache and logs
- **Network**: Stable internet connection for API calls

### Required Accounts & API Keys
- **Discord Application**: Bot token and application ID
- **OpenAI API**: API key for AI Chat features (GPT-3.5/4 access)
- **YouTube Data API**: API key for music streaming
- **MongoDB Atlas** (optional): Database hosting service
- **Age Verification System**: Admin access for 21+ verification

## 🌍 Environment Configuration

### Core Environment Variables

Create a `.env` file in the project root with the following configuration:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_GUILD_ID=your_server_id

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/growmiesnj
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/growmiesnj

# OpenAI Configuration (AI Chat System)
OPENAI_API_KEY=your_openai_api_key

# OpenAI Assistant Configuration (Recommended)
OPENAI_USE_ASSISTANT=true
OPENAI_ASSISTANT_ID=asst_NEhRP97QthjpqnMiDPZiYd0x
OPENAI_ASSISTANT_MODEL=gpt-4.1-mini

# Fallback Chat Completions Configuration
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_MAX_TOKENS=1000
OPENAI_TEMPERATURE=0.7

# YouTube API Configuration (Music Bot)
YOUTUBE_API_KEY=your_youtube_data_api_key
YOUTUBE_COOKIE=your_youtube_cookie_for_age_restricted_content

# Music Bot Configuration
MUSIC_MAX_QUEUE_SIZE=50
MUSIC_DEFAULT_VOLUME=50
MUSIC_TIMEOUT_MINUTES=15
MUSIC_ENABLE_CANNABIS_FEATURES=true

# Economy System Configuration
ECONOMY_ENABLED=true
ECONOMY_DAILY_REWARD_BASE=100
ECONOMY_WORK_COOLDOWN_HOURS=4
ECONOMY_MAX_GIFT_AMOUNT=1000
ECONOMY_CURRENCY_EXCHANGE_RATE=100

# Security and Compliance
AGE_VERIFICATION_REQUIRED=true
CANNABIS_CONTENT_FILTERING=strict
LOG_LEVEL=info
ENVIRONMENT=production

# Feature Toggles
ENABLE_MUSIC_BOT=true
ENABLE_AI_CHAT=true
ENABLE_ECONOMY=true
```

### Advanced Configuration Options

```env
# AI Chat Advanced Settings
OPENAI_ORGANIZATION_ID=your_openai_org_id
AI_CONVERSATION_TIMEOUT=30
AI_MAX_CONTEXT_LENGTH=8000
AI_CONTENT_FILTER_LEVEL=2
AI_CANNABIS_KNOWLEDGE_MODE=educational

# Music Bot Advanced Settings
MUSIC_SEARCH_LIMIT=10
MUSIC_CACHE_SIZE_MB=500
MUSIC_QUALITY=high
MUSIC_ENABLE_FILTERS=true
MUSIC_AUTO_LEAVE_TIMEOUT=300

# Economy Advanced Settings
ECONOMY_STARTING_BALANCE=500
ECONOMY_PREMIUM_SEEDS_RATIO=0.1
ECONOMY_WORK_SUCCESS_BASE_RATE=0.8
ECONOMY_LEVEL_XP_MULTIPLIER=100
ECONOMY_SHOP_TAX_RATE=0.05

# Monitoring and Logging
ENABLE_ANALYTICS=true
LOG_AI_CONVERSATIONS=true
LOG_MUSIC_ACTIVITY=true
LOG_ECONOMY_TRANSACTIONS=true
ERROR_WEBHOOK_URL=your_discord_webhook_for_errors
```

## 🗄️ Database Setup

### MongoDB Installation & Configuration

**Local MongoDB Setup:**

1. **Install MongoDB Community Edition**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install -y mongodb
   
   # macOS with Homebrew
   brew install mongodb-community
   
   # Windows: Download from MongoDB website
   ```

2. **Start MongoDB Service**
   ```bash
   # Linux
   sudo systemctl start mongod
   sudo systemctl enable mongod
   
   # macOS
   brew services start mongodb-community
   
   # Windows
   net start MongoDB
   ```

3. **Create Database and User**
   ```javascript
   // Connect to MongoDB shell
   mongosh
   
   // Create database
   use growmiesnj
   
   // Create user with permissions
   db.createUser({
     user: "growmiesbot",
     pwd: "secure_password_here",
     roles: [
       { role: "readWrite", db: "growmiesnj" }
     ]
   })
   ```

**MongoDB Atlas Setup (Cloud):**

1. **Create Atlas Account**: Sign up at [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Create Cluster**: Choose free tier or paid tier based on needs
3. **Configure Network Access**: Add your server's IP address
4. **Create Database User**: Add username/password for bot access
5. **Get Connection String**: Use in `MONGODB_URI` environment variable

### Database Collections & Indexes

The bot will automatically create required collections, but you can optimize with indexes:

```javascript
// Connect to your database
use growmiesnj

// Economy System Indexes
db.users.createIndex({ "discordId": 1 }, { unique: true })
db.users.createIndex({ "economy.balance": -1 })
db.users.createIndex({ "economy.level": -1 })

// AI Chat Indexes
db.conversations.createIndex({ "userId": 1, "channelId": 1 })
db.conversations.createIndex({ "lastActivity": 1 })

// Music Bot Indexes
db.playlists.createIndex({ "guildId": 1, "userId": 1 })
db.musicSessions.createIndex({ "guildId": 1 })

// Age Verification Indexes
db.ageVerifications.createIndex({ "discordId": 1 }, { unique: true })
db.ageVerifications.createIndex({ "verifiedAt": 1 })
```

## 🔑 API Keys & External Services

### OpenAI API Setup

1. **Create OpenAI Account**: Visit [platform.openai.com](https://platform.openai.com)
2. **Generate API Key**: 
   - Go to API Keys section
   - Create new secret key
   - Copy and store securely
   - Add to `OPENAI_API_KEY` environment variable

3. **Configure Usage Limits**:
   - Set monthly spending limits
   - Configure rate limits for safety
   - Monitor usage through OpenAI dashboard


### OpenAI Assistant Configuration (Enhanced Cannabis Knowledge)

The bot now supports OpenAI Assistants API for enhanced cannabis knowledge and better conversation context management.

**Benefits of Assistant Mode:**
- **Persistent Conversation Threads**: Maintains context across multiple messages
- **Custom Cannabis Knowledge**: Pre-trained with cannabis-specific information
- **Enhanced Compliance**: Built-in cannabis regulation compliance
- **Better Context Management**: Automatic thread-based conversation handling
- **Fallback Support**: Automatically falls back to Chat Completions if needed

**Setup Steps:**

1. **Create Custom OpenAI Assistant**:
   - Visit [platform.openai.com/assistants](https://platform.openai.com/assistants)
   - Create a new assistant with cannabis knowledge instructions
   - Configure with compliance guidelines and educational focus
   - Note the Assistant ID (format: `asst_xxxxxxxxx`)

2. **Configure Environment Variables**:
   ```env
   # Enable OpenAI Assistant Integration
   OPENAI_USE_ASSISTANT=true
   OPENAI_ASSISTANT_ID=asst_NEhRP97QthjpqnMiDPZiYd0x
   OPENAI_ASSISTANT_MODEL=gpt-4.1-mini
   ```

3. **Assistant Instructions Example**:
   ```
   You are a cannabis education assistant for the GrowmiesNJ Discord community.
   
   Guidelines:
   - Provide educational, accurate cannabis information
   - Always include appropriate disclaimers for medical/legal advice
   - Ensure compliance with New Jersey cannabis regulations
   - Focus on harm reduction and responsible use
   - Verify users are 21+ for cannabis-specific discussions
   
   Response Style:
   - Educational and informative
   - Friendly but professional
   - Include relevant disclaimers
   - Encourage responsible practices
   ```

4. **Thread Management**:
   - The bot automatically creates OpenAI threads for each conversation
   - Threads persist conversation context across multiple interactions
   - Thread IDs are stored in the database for continuity
   - Threads are cleaned up periodically for privacy

**Configuration Options:**

```env
# Assistant API Settings
OPENAI_USE_ASSISTANT=true                    # Enable assistant mode
OPENAI_ASSISTANT_ID=asst_NEhRP97QthjpqnMiDPZiYd0x  # Your assistant ID
OPENAI_ASSISTANT_MODEL=gpt-4.1-mini         # Assistant model preference

# Fallback Settings (when assistant is unavailable)
OPENAI_MODEL=gpt-4-turbo-preview             # Fallback model
OPENAI_MAX_TOKENS=1000                       # Fallback token limit
OPENAI_TEMPERATURE=0.7                       # Fallback temperature

# Advanced Assistant Settings
ASSISTANT_THREAD_CLEANUP_DAYS=7              # Clean up old threads after 7 days
ASSISTANT_MAX_THREAD_MESSAGES=100            # Limit messages per thread
ASSISTANT_FALLBACK_ENABLED=true              # Enable automatic fallback
```

**Testing Assistant Integration:**

```bash
# Test assistant API connection
npm run test:assistant

# Verify thread creation
npm run test:assistant-threads

# Test fallback mechanism
npm run test:assistant-fallback
```

4. **Model Selection**:
   ```env
   # Recommended models by use case:
   OPENAI_MODEL=gpt-3.5-turbo          # Cost-effective, good performance
   # OPENAI_MODEL=gpt-4                # Higher quality, higher cost
   # OPENAI_MODEL=gpt-3.5-turbo-16k    # Longer context for complex conversations
   ```

### YouTube Data API Setup

1. **Google Cloud Console Setup**:
   - Visit [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable YouTube Data API v3

2. **Create API Credentials**:
   - Go to "Credentials" section
   - Create "API Key"
   - Restrict key to YouTube Data API
   - Add to `YOUTUBE_API_KEY` environment variable

3. **Optional: YouTube Cookie for Age-Restricted Content**:
   ```bash
   # Extract cookie from browser (Chrome/Firefox)
   # Look for 'CONSENT' and 'VISITOR_INFO1_LIVE' cookies
   # Format: cookie1=value1; cookie2=value2
   ```

### Discord Application Setup

1. **Discord Developer Portal**:
   - Visit [discord.com/developers/applications](https://discord.com/developers/applications)
   - Create new application or select existing

2. **Bot Configuration**:
   - Go to "Bot" section
   - Create bot token (store as `DISCORD_TOKEN`)
   - Enable required intents:
     - Message Content Intent (for command processing)
     - Server Members Intent (for user verification)
     - Presence Intent (for user status)

3. **OAuth2 & Permissions**:
   - Required bot permissions:
     - Send Messages
     - Use Slash Commands
     - Connect (voice channels)
     - Speak (voice channels)
     - Manage Messages
     - Embed Links
     - Attach Files
     - Read Message History

## 🚀 Deployment Steps

### 1. Clone and Install Dependencies

```bash
# Clone repository
git clone https://github.com/your-org/growmiesnj-bot.git
cd growmiesnj-bot

# Install dependencies
npm install

# Install additional dependencies for advanced features
npm install @discordjs/voice ffmpeg-static youtube-sr openai mongoose
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit environment variables
nano .env  # or your preferred editor

# Validate configuration
npm run config:validate
```

### 3. Database Migration

```bash
# Run database migrations
npm run db:migrate

# Seed initial data (optional)
npm run db:seed

# Verify database connection
npm run db:test
```

### 4. Deploy Bot Commands

```bash
# Register slash commands with Discord
npm run deploy:commands

# Verify commands are registered
npm run commands:list
```

### 5. Start the Bot

```bash
# Development mode
npm run dev

# Production mode
npm start

# With PM2 (recommended for production)
npm install -g pm2
pm2 start ecosystem.config.js
```

## 🛡️ Security Configuration

### Age Verification System

1. **Setup Verification Roles**:
   ```javascript
   // Discord Server Setup
   // Create roles: "21+ Verified", "Age Verification Pending"
   // Configure permissions for cannabis content channels
   ```

2. **Configure Verification Process**:
   ```env
   AGE_VERIFICATION_REQUIRED=true
   AGE_VERIFICATION_ROLE_ID=your_21_plus_role_id
   AGE_VERIFICATION_PENDING_ROLE_ID=your_pending_role_id
   AGE_VERIFICATION_CHANNEL_ID=your_verification_channel_id
   ```

3. **Admin Verification Commands**:
   ```bash
   # Set up admin users who can verify ages
   /admin add-verifier @moderator
   /admin verification-stats
   ```

### Content Filtering

```env
# Content filtering levels
CANNABIS_CONTENT_FILTERING=strict    # Maximum filtering
# CANNABIS_CONTENT_FILTERING=standard # Balanced filtering
# CANNABIS_CONTENT_FILTERING=minimal  # Basic safety only

# Custom filter words (comma-separated)
CUSTOM_FILTER_WORDS=word1,word2,word3

# Filter bypass for educational content
EDUCATIONAL_BYPASS_ENABLED=true
```

### API Security

```env
# Rate limiting
API_RATE_LIMIT_WINDOW_MS=900000     # 15 minutes
API_RATE_LIMIT_MAX_REQUESTS=100

# Request validation
VALIDATE_USER_PERMISSIONS=true
LOG_SECURITY_EVENTS=true

# Webhook security
WEBHOOK_SECRET=your_secure_webhook_secret
```

## 📊 Monitoring & Logging

### Logging Configuration

```env
# Log levels: error, warn, info, debug
LOG_LEVEL=info

# Log destinations
LOG_TO_FILE=true
LOG_TO_CONSOLE=true
LOG_TO_DISCORD=true

# Log file configuration
LOG_FILE_PATH=./logs/bot.log
LOG_MAX_FILE_SIZE=10MB
LOG_MAX_FILES=5

# Discord logging webhook
LOG_WEBHOOK_URL=your_discord_logging_webhook
ERROR_WEBHOOK_URL=your_discord_error_webhook
```

### Health Monitoring

```javascript
// Add to your monitoring system
// Health check endpoints
GET /health          # Basic health check
GET /health/detailed # Detailed system status
GET /health/database # Database connection status
GET /health/apis     # External API status
```

### Performance Monitoring

```env
# Enable performance tracking
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_SAMPLE_RATE=0.1

# Memory usage alerts
MEMORY_ALERT_THRESHOLD_MB=1500
CPU_ALERT_THRESHOLD_PERCENT=80

# Database performance
DB_SLOW_QUERY_THRESHOLD_MS=1000
```

## 🔧 Troubleshooting

### Common Setup Issues

**Database Connection Failed:**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Test connection manually
mongosh "mongodb://localhost:27017/growmiesnj"

# Check network connectivity for Atlas
ping cluster0.mongodb.net
```

**Discord Bot Not Responding:**
```bash
# Verify bot token
npm run verify:token

# Check bot permissions
npm run check:permissions

# Test slash command registration
npm run commands:test
```

**OpenAI API Errors:**
```bash
# Test API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Check usage limits
npm run openai:usage

# Validate configuration
npm run ai:test
```

**YouTube API Issues:**
```bash
# Test YouTube API key
npm run youtube:test

# Check quota usage
npm run youtube:quota

# Validate video access
npm run youtube:search "test query"
```

### Performance Issues

**High Memory Usage:**
```env
# Reduce cache sizes
MUSIC_CACHE_SIZE_MB=100
AI_MAX_CONTEXT_LENGTH=4000

# Enable garbage collection logging
NODE_OPTIONS="--max-old-space-size=2048 --gc-global"
```

**Slow Database Queries:**
```bash
# Analyze slow queries
npm run db:slow-queries

# Check index usage
npm run db:index-stats

# Optimize collections
npm run db:optimize
```

**API Rate Limiting:**
```env
# Implement exponential backoff
API_RETRY_ATTEMPTS=3
API_RETRY_DELAY_MS=1000

# Reduce request frequency
AI_REQUEST_COOLDOWN_MS=2000
YOUTUBE_REQUEST_COOLDOWN_MS=1000
```

### Debug Mode Setup

```env
# Enable debug mode
DEBUG=bot:*,music:*,ai:*,economy:*
LOG_LEVEL=debug

# Additional debug options
DEBUG_SHOW_TIMESTAMPS=true
DEBUG_SHOW_CALLER=true
DEBUG_LOG_API_REQUESTS=true
```

## 📦 Production Deployment

### PM2 Configuration

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'growmiesnj-bot',
    script: 'src/index.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'warn'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '2G',
    restart_delay: 4000
  }]
}
```

### Docker Deployment

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

USER node

EXPOSE 3000

CMD ["npm", "start"]
```

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  bot:
    build: .
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - mongodb

  mongodb:
    image: mongo:5
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  mongodb_data:
```

### Backup Strategy

```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="$MONGODB_URI" --out="./backups/backup_$DATE"
tar -czf "./backups/backup_$DATE.tar.gz" "./backups/backup_$DATE"
rm -rf "./backups/backup_$DATE"

# Schedule with cron
0 2 * * * /path/to/backup-script.sh
```

## 🔄 Updates & Maintenance

### Update Process

```bash
# Backup before update
npm run backup:create

# Update dependencies
npm update

# Run migrations
npm run db:migrate

# Deploy new commands
npm run deploy:commands

# Restart services
pm2 restart growmiesnj-bot
```

### Maintenance Tasks

```bash
# Weekly maintenance
npm run maintenance:weekly

# Database optimization
npm run db:optimize

# Clear old logs
npm run logs:cleanup

# Update API quotas
npm run apis:check-limits
```

## 📚 Additional Resources

### Documentation Links
- **[Music Bot Implementation Guide](MUSIC_BOT_IMPLEMENTATION.md)** - Technical implementation details
- **[User Guides](USER_GUIDES/)** - End-user documentation for all features
- **[Admin Commands Reference](ADMIN_COMMANDS_REFERENCE.md)** - Administrative command documentation

### External Documentation
- **[Discord.js Guide](https://discordjs.guide/)** - Discord bot development
- **[OpenAI API Documentation](https://platform.openai.com/docs)** - AI integration
- **[YouTube Data API](https://developers.google.com/youtube/v3)** - Music streaming
- **[MongoDB Documentation](https://docs.mongodb.com/)** - Database management

### Support & Community
- **Discord Development Server**: Join for technical support
- **GitHub Issues**: Report bugs and feature requests
- **Wiki**: Community-maintained setup guides
- **Stack Overflow**: Tag questions with 'growmiesnj-bot'

---

**Last Updated**: January 2024  
**Documentation Version**: 1.0.0  
**Bot Version**: 2.0.0 (Advanced Features)

For technical support during setup, contact the development team or create an issue in the GitHub repository.