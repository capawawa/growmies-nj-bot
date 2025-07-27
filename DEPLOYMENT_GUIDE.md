# Deployment Guide - GrowmiesNJ Discord Bot

## 🚀 Overview

This guide provides step-by-step instructions for deploying the GrowmiesNJ Discord Bot in various environments, from local development to production deployment with full advanced features support including Music Bot, AI Chat Integration, and Economy System.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: For repository management
- **Discord Bot Application**: Created through Discord Developer Portal
- **Databases**: PostgreSQL (required) + MongoDB (for advanced features)

### External Services & API Keys
- **Discord Bot Token**: From Discord Developer Portal
- **OpenAI API Key**: For AI Chat features (optional but recommended)
- **YouTube Data API Key**: For Music Bot features (optional but recommended)
- **Railway Account**: For production deployment (recommended)

## 🔧 Environment Setup

### 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/your-org/growmiesnj-bot.git
cd growmiesnj-bot

# Install core dependencies
npm install

# Install advanced features dependencies (optional)
npm install @discordjs/voice openai mongoose youtube-sr ffmpeg-static
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```env
# ===== CORE CONFIGURATION =====
NODE_ENV=development
LOG_LEVEL=info

# Discord Bot Configuration
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_application_id
DISCORD_GUILD_ID=your_discord_server_id

# PostgreSQL Database (Required)
DATABASE_URL=postgresql://username:password@localhost:5432/growmiesnj
# OR for Railway:
# DATABASE_URL=postgresql://postgres:password@host:port/railway

# ===== ADVANCED FEATURES CONFIGURATION =====

# MongoDB (for advanced features)
MONGODB_URI=mongodb://localhost:27017/growmiesnj
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/growmiesnj

# OpenAI Configuration (AI Chat System)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.7

# YouTube API Configuration (Music Bot)
YOUTUBE_API_KEY=your_youtube_data_api_key_here

# ===== FEATURE TOGGLES =====
ENABLE_MUSIC_BOT=true
ENABLE_AI_CHAT=true
ENABLE_ECONOMY=true
AGE_VERIFICATION_REQUIRED=true

# ===== CANNABIS COMPLIANCE =====
CANNABIS_CONTENT_FILTERING=strict
REQUIRE_21_PLUS_VERIFICATION=true
COMPLIANCE_AUDIT_LOGGING=true

# ===== SECURITY CONFIGURATION =====
ENCRYPTION_KEY=your_32_character_encryption_key_here
JWT_SECRET=your_jwt_secret_for_sessions
```

## 🗄️ Database Setup

### PostgreSQL Setup (Required)

#### Local PostgreSQL Installation

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

#### Database Creation and Configuration

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE growmiesnj;
CREATE USER growmiesbot WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE growmiesnj TO growmiesbot;

# Exit PostgreSQL
\q
```

#### Run Database Migrations

```bash
# Run PostgreSQL migrations (server automation scripts)
node scripts/setup-production-database.js

# Verify database connection
npm run db:test
```

### MongoDB Setup (For Advanced Features)

#### Local MongoDB Installation

**Ubuntu/Debian:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
Download and install from [mongodb.com](https://www.mongodb.com/try/download/community)

#### MongoDB Atlas Setup (Cloud Alternative)

1. **Create Account**: Sign up at [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Create Cluster**: Choose appropriate tier (free tier available)
3. **Configure Access**: Add your IP address and create database user
4. **Get Connection String**: Use in `MONGODB_URI` environment variable

#### Initialize Advanced Features Database

```bash
# Setup MongoDB collections and indexes
npm run setup:advanced-features

# Verify MongoDB connection
npm run mongo:test
```

## 🔑 API Keys Configuration

### Discord Bot Setup

1. **Visit Discord Developer Portal**: [discord.com/developers/applications](https://discord.com/developers/applications)

2. **Create New Application**:
   - Click "New Application"
   - Enter name: "GrowmiesNJ Bot"
   - Save the Application ID as `DISCORD_CLIENT_ID`

3. **Create Bot**:
   - Go to "Bot" section
   - Click "Add Bot"
   - Save the Bot Token as `DISCORD_TOKEN`
   - **Keep this token secure and never share it**

4. **Configure Bot Permissions**:
   - Enable required intents:
     - ✅ Presence Intent
     - ✅ Server Members Intent
     - ✅ Message Content Intent
   - Set bot permissions:
     - ✅ Administrator (for full functionality)
     - Or specific permissions: Send Messages, Use Slash Commands, Connect, Speak, etc.

5. **Invite Bot to Server**:
   - Go to "OAuth2" > "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select permissions as configured above
   - Copy generated URL and visit it to invite bot to your server

### OpenAI API Setup

1. **Create OpenAI Account**: Visit [platform.openai.com](https://platform.openai.com)

2. **Generate API Key**:
   - Go to "API Keys" section
   - Click "Create new secret key"
   - Copy and save as `OPENAI_API_KEY`
   - **Keep this key secure and never commit it to version control**

3. **Set Usage Limits**:
   - Configure monthly spending limits
   - Set up usage alerts
   - Monitor usage through OpenAI dashboard

### YouTube Data API Setup

1. **Google Cloud Console**: Visit [console.cloud.google.com](https://console.cloud.google.com)

2. **Create/Select Project**:
   - Create new project or select existing
   - Enable "YouTube Data API v3"

3. **Create Credentials**:
   - Go to "Credentials" section
   - Click "Create Credentials" > "API Key"
   - Restrict key to YouTube Data API (recommended)
   - Copy and save as `YOUTUBE_API_KEY`

## 🏃‍♂️ Local Development Deployment

### Basic Local Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your configuration

# Setup databases
npm run db:setup

# Register Discord slash commands
npm run deploy:commands

# Start development server
npm run dev
```

### Advanced Features Local Setup

```bash
# Install advanced features dependencies
npm install @discordjs/voice openai mongoose youtube-sr ffmpeg-static

# Install FFmpeg (required for music bot)
# Ubuntu/Debian:
sudo apt install ffmpeg

# macOS:
brew install ffmpeg

# Windows: Download from https://ffmpeg.org/download.html

# Setup advanced features database
npm run setup:advanced-features

# Start with all features enabled
ENABLE_MUSIC_BOT=true ENABLE_AI_CHAT=true ENABLE_ECONOMY=true npm run dev
```

### Verification Steps

```bash
# Test database connections
npm run test:db

# Test Discord bot connection
npm run test:discord

# Test advanced features (if enabled)
npm run test:openai    # Test OpenAI API
npm run test:youtube   # Test YouTube API
npm run test:mongodb   # Test MongoDB connection

# Run full health check
npm run health:check
```

## 🌐 Production Deployment

### Railway Deployment (Recommended)

#### Railway Setup

1. **Create Railway Account**: Visit [railway.app](https://railway.app)

2. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

3. **Initialize Railway Project**:
   ```bash
   railway init
   railway link [your-project-id]
   ```

#### Environment Variables Setup

```bash
# Set environment variables via Railway CLI
railway variables set DISCORD_TOKEN=your_discord_token
railway variables set OPENAI_API_KEY=your_openai_key
railway variables set YOUTUBE_API_KEY=your_youtube_key

# Set database URLs (Railway provides PostgreSQL)
railway variables set DATABASE_URL=$(railway variables get DATABASE_URL)

# Set MongoDB URI (if using external MongoDB)
railway variables set MONGODB_URI=your_mongodb_uri

# Enable features
railway variables set ENABLE_MUSIC_BOT=true
railway variables set ENABLE_AI_CHAT=true
railway variables set ENABLE_ECONOMY=true
```

#### Deploy to Railway

```bash
# Using Railway CLI
railway up

# Or using the automation script
node scripts/deploy-complete-system.js --environment=production

# Monitor deployment
railway logs
```

#### Database Setup on Railway

```bash
# Run database migrations on Railway
railway run node scripts/setup-production-database.js

# Setup advanced features
railway run npm run setup:advanced-features

# Deploy and register commands
railway run npm run deploy:commands
```

### Docker Deployment

#### Create Dockerfile

```dockerfile
FROM node:18-alpine

# Install FFmpeg for music bot
RUN apk add --no-cache ffmpeg

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Expose port (if needed for health checks)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Start the bot
CMD ["npm", "start"]
```

#### Create docker-compose.yml

```yaml
version: '3.8'

services:
  growmiesnj-bot:
    build: .
    environment:
      - NODE_ENV=production
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    depends_on:
      - postgres
      - mongodb

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: growmiesnj
      POSTGRES_USER: growmiesbot
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  mongodb:
    image: mongo:6-alpine
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    restart: unless-stopped

volumes:
  postgres_data:
  mongodb_data:
```

#### Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# Run database setup
docker-compose exec growmiesnj-bot npm run db:setup
docker-compose exec growmiesnj-bot npm run setup:advanced-features

# Register Discord commands
docker-compose exec growmiesnj-bot npm run deploy:commands

# View logs
docker-compose logs -f growmiesnj-bot
```

### Alternative Cloud Providers

#### Heroku Deployment

```bash
# Install Heroku CLI
npm install -g heroku

# Login and create app
heroku login
heroku create growmiesnj-bot

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Add MongoDB addon (Atlas)
heroku addons:create mongolab:sandbox

# Set environment variables
heroku config:set DISCORD_TOKEN=your_token
heroku config:set OPENAI_API_KEY=your_key
heroku config:set YOUTUBE_API_KEY=your_key

# Deploy
git push heroku main

# Run database setup
heroku run npm run db:setup
heroku run npm run setup:advanced-features
```

#### DigitalOcean App Platform

1. **Create App**: Connect your GitHub repository
2. **Configure Environment**: Add all required environment variables
3. **Add Database**: Attach PostgreSQL and MongoDB databases
4. **Deploy**: Platform handles deployment automatically

## 🔍 Monitoring & Maintenance

### Health Monitoring Setup

#### Create Health Check Endpoint

```javascript
// healthcheck.js
const { Client } = require('discord.js');
const mongoose = require('mongoose');

async function healthCheck() {
  try {
    // Check Discord bot status
    const client = new Client({ intents: [] });
    await client.login(process.env.DISCORD_TOKEN);
    await client.destroy();

    // Check MongoDB connection (if enabled)
    if (process.env.ENABLE_ECONOMY === 'true') {
      await mongoose.connect(process.env.MONGODB_URI);
      await mongoose.connection.close();
    }

    console.log('✅ Health check passed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    process.exit(1);
  }
}

healthCheck();
```

#### Logging Configuration

```javascript
// Add to your main bot file
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});
```

### Monitoring Commands

```bash
# Monitor bot status
npm run status

# Check system health
npm run health:detailed

# View real-time logs
npm run logs:follow

# Monitor API usage
npm run monitor:apis

# Check compliance status
npm run compliance:check
```

### Backup Strategies

#### Database Backups

```bash
# PostgreSQL backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# MongoDB backup
mongodump --uri=$MONGODB_URI --out=./backup_$(date +%Y%m%d_%H%M%S)

# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p ./backups/$DATE

# Backup PostgreSQL
pg_dump $DATABASE_URL > ./backups/$DATE/postgres_backup.sql

# Backup MongoDB
mongodump --uri=$MONGODB_URI --out=./backups/$DATE/mongodb_backup

# Compress backups
tar -czf ./backups/backup_$DATE.tar.gz ./backups/$DATE
rm -rf ./backups/$DATE

echo "Backup completed: backup_$DATE.tar.gz"
```

#### Configuration Backups

```bash
# Backup environment configuration
cp .env ./backups/env_backup_$(date +%Y%m%d_%H%M%S).env

# Export Railway environment variables
railway variables > ./backups/railway_vars_$(date +%Y%m%d_%H%M%S).txt
```

## 🚨 Troubleshooting

### Common Deployment Issues

#### Bot Not Starting

```bash
# Check environment variables
echo $DISCORD_TOKEN | wc -c  # Should be around 70 characters
echo $DISCORD_CLIENT_ID | wc -c  # Should be around 18 characters

# Test Discord token validity
npm run test:discord

# Check Node.js version
node --version  # Should be 18.0.0 or higher

# Verify dependencies
npm audit
npm list --depth=0
```

#### Database Connection Issues

```bash
# Test PostgreSQL connection
psql $DATABASE_URL -c "SELECT version();"

# Test MongoDB connection
mongosh $MONGODB_URI --eval "db.adminCommand('ping')"

# Check database migrations
npm run db:status

# Reset databases (caution!)
npm run db:reset
npm run db:setup
```

#### API Key Issues

```bash
# Test OpenAI API key
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Test YouTube API key
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&key=$YOUTUBE_API_KEY"

# Check API quotas
npm run check:quotas
```

#### Discord Permission Issues

```bash
# Test bot permissions in server
npm run test:permissions

# Re-invite bot with updated permissions
npm run generate:invite-url

# Check slash command registration
npm run commands:list
npm run deploy:commands --force
```

### Performance Issues

#### Memory Usage

```bash
# Monitor memory usage
node --max-old-space-size=2048 src/index.js

# Enable garbage collection logging
node --expose-gc --trace-gc src/index.js

# Memory profiling
npm install -g clinic
clinic doctor -- node src/index.js
```

#### Database Performance

```bash
# PostgreSQL performance check
psql $DATABASE_URL -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# MongoDB performance check
mongosh $MONGODB_URI --eval "db.runCommand({serverStatus: 1})"

# Check slow queries
npm run db:slow-queries
```

#### API Rate Limiting

```bash
# Check Discord API rate limits
npm run monitor:discord-limits

# Check OpenAI API usage
npm run monitor:openai-usage

# Check YouTube API quota
npm run monitor:youtube-quota
```

### Recovery Procedures

#### Emergency Rollback

```bash
# Stop current deployment
railway down  # For Railway
# or
docker-compose down  # For Docker

# Rollback to previous version
git checkout previous-working-commit
railway up  # Deploy previous version

# Restore database from backup
psql $DATABASE_URL < backup_file.sql
mongorestore --uri=$MONGODB_URI backup_directory/
```

#### Service Recovery

```bash
# Restart specific services
railway restart  # For Railway
docker-compose restart growmiesnj-bot  # For Docker

# Clear caches and restart
npm run cache:clear
npm run restart

# Emergency maintenance mode
npm run maintenance:enable "Emergency maintenance in progress"
```

## 📚 Additional Resources

### Documentation Links
- **[Advanced Features Setup](docs/ADVANCED_FEATURES_SETUP.md)** - Detailed configuration guide
- **[User Guide](USER_GUIDE.md)** - End-user documentation
- **[Admin Commands Reference](docs/ADMIN_COMMANDS_REFERENCE.md)** - Administrative commands

### External Resources
- **[Discord.js Guide](https://discordjs.guide/)** - Discord bot development
- **[Railway Documentation](https://docs.railway.app/)** - Railway deployment platform
- **[Docker Documentation](https://docs.docker.com/)** - Container deployment
- **[PostgreSQL Documentation](https://www.postgresql.org/docs/)** - Database management
- **[MongoDB Documentation](https://docs.mongodb.com/)** - MongoDB database

### Support Channels
- **GitHub Issues**: [repository-url/issues](https://github.com/your-org/growmiesnj-bot/issues)
- **Discord Support Server**: Join for technical assistance
- **Email Support**: contact@growmiesnj.com

---

**Version**: 2.0.0 (Advanced Features)  
**Last Updated**: January 2024  
**Deployment Platforms**: Railway, Docker, Heroku, DigitalOcean  
**Cannabis Compliance**: 100% New Jersey Regulation Compliant

This deployment guide ensures secure, scalable, and compliant deployment of the GrowmiesNJ Discord Bot with all advanced features properly configured and monitored.