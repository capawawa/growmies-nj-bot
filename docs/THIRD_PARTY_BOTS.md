# Growmies NJ Discord Bot - Third-Party Bots Configuration

## 🤖 Complete Integration Guide for Carl-bot, Sesh, Statbot, and Xenon

**Target Audience**: Server administrators, community managers, and technical staff  
**Estimated Time**: 45-60 minutes for complete setup  
**Prerequisites**: Discord server admin access, basic understanding of bot permissions

---

## 📋 Table of Contents

1. [Third-Party Bots Overview](#third-party-bots-overview)
2. [Carl-bot Configuration (Moderation & Automod)](#carl-bot-configuration)
3. [Sesh Bot Setup (Event Scheduling)](#sesh-bot-setup)
4. [Statbot Configuration (Analytics)](#statbot-configuration)
5. [Xenon Setup (Backup & Templates)](#xenon-setup)
6. [Integration Testing](#integration-testing)
7. [Maintenance and Updates](#maintenance-and-updates)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Third-Party Bots Overview

### Why These Specific Bots?

#### Carl-bot 🛡️
- **Primary Function**: Advanced moderation and automod
- **Key Features**: Automod rules, custom commands, reaction roles
- **Cannabis Compliance**: Content filtering for legal compliance
- **Community Benefit**: Automated moderation reduces manual oversight

#### Sesh 📅
- **Primary Function**: Event scheduling and management
- **Key Features**: Calendar integration, RSVP tracking, timezone support
- **Cannabis Compliance**: 21+ event verification and age-gated activities
- **Community Benefit**: Streamlined community events and meetups

#### Statbot 📊
- **Primary Function**: Server analytics and insights
- **Key Features**: Member activity tracking, engagement metrics, growth analytics
- **Cannabis Compliance**: Privacy-compliant data collection
- **Community Benefit**: Data-driven community growth strategies

#### Xenon 💾
- **Primary Function**: Server backup and templates
- **Key Features**: Complete server backups, restoration capabilities, template sharing
- **Cannabis Compliance**: Secure backup of compliance data
- **Community Benefit**: Disaster recovery and server migration support

### Integration Architecture

```
Discord Server
├── Growmies NJ Bot (Primary)
├── Carl-bot (Moderation)
├── Sesh (Events)
├── Statbot (Analytics)
└── Xenon (Backup)
```

### Bot Hierarchy and Permissions

**Critical**: Role hierarchy must be configured correctly:
1. **Growmies NJ Bot** (Highest - Administrator)
2. **Carl-bot** (Moderation permissions)
3. **Xenon** (Backup permissions)
4. **Sesh** (Event management permissions)
5. **Statbot** (Read-only analytics permissions)
6. **@everyone** (Lowest)

---

## 🛡️ Carl-bot Configuration

### Step 1: Invite Carl-bot

1. **Invitation Link**: https://carl-bot.com/invite
2. **Required Permissions**:
   - Manage Messages
   - Manage Roles
   - Ban Members
   - Kick Members
   - Manage Nicknames
   - Read Message History
   - Send Messages
   - Embed Links
   - Attach Files
   - Use External Emojis
   - Add Reactions

3. **Role Position**: Place Carl-bot role below Growmies NJ Bot but above regular member roles

**✅ Validation**: Carl-bot appears online and responds to `/help`

### Step 2: Basic Carl-bot Configuration

#### Set Prefix and Basic Settings
```
/set prefix !carl
/set automod on
/set modlog #mod-log
/set mutedRole @Muted
```

#### Configure Moderation Channels
```
/channel set modlog #mod-log
/channel set automod #automod-log
/channel set reports #report-channel
```

### Step 3: Cannabis-Specific Automod Rules

#### Age Verification Automod
```
/automod create name:"Age Verification" 
triggers:"underage,under 21,fake id,minor"
action:"warn,delete"
punishment:"timeout 1h"
message:"⚠️ This server requires 21+ verification for cannabis content access."
```

#### Sales/Commerce Prevention
```
/automod create name:"No Sales" 
triggers:"selling,buying,$,price,venmo,cashapp,paypal,for sale"
action:"delete,warn"
punishment:"timeout 24h"
message:"🚫 Cannabis sales/transactions prohibited. Educational content only."
```

#### Medical Claims Prevention
```
/automod create name:"No Medical Claims" 
triggers:"medical,medicine,doctor,prescription,treatment,cure,heal"
action:"delete,warn"
punishment:"mute 1h"
message:"⚖️ No medical claims allowed. Consult healthcare professionals for medical advice."
```

#### Spam and Self-Promotion
```
/automod create name:"Anti-Spam" 
triggers:"discord.gg,@everyone,@here"
action:"delete"
punishment:"timeout 10m"
message:"🛑 Spam and unsolicited invites are not allowed."
```

### Step 4: Reaction Roles for Age Verification

#### Create Age Verification System
```
/rr create
Channel: #age-verification
Message: "React with ✅ to verify you are 21+ and can legally access cannabis content in New Jersey"
Emoji: ✅
Role: @Verified 21+
```

#### Create Interest-Based Roles
```
/rr create
Channel: #roles
Message: "Select your interests:"
🌱 = @Growing Enthusiast
🎮 = @Gaming
🎵 = @Music Lover
📚 = @Learning
🎨 = @Creative
```

### Step 5: Custom Commands for Cannabis Compliance

#### Legal Disclaimer Command
```
/cc create legal
"⚖️ **Legal Disclaimer**

This server provides educational content about cannabis cultivation in New Jersey. 
- Must be 21+ to access cannabis-related content
- Follow all state and local laws
- No sales or transactions permitted
- Educational purposes only

For legal questions, consult an attorney."
```

#### New Jersey Cannabis Laws
```
/cc create njlaws
"🏛️ **New Jersey Cannabis Laws**

**Legal for 21+:**
- Personal possession up to 6oz
- Home cultivation (6 plants max)
- Consumption in private spaces

**Prohibited:**
- Public consumption
- Driving under influence
- Sales without license
- Providing to minors

📖 Full info: https://www.nj.gov/cannabis/"
```

#### Growing Resources
```
/cc create resources
"🌱 **Growing Resources**

**Educational Channels:**
- #growing-basics
- #advanced-techniques  
- #harvest-help
- #strain-discussion

**Guidelines:**
- Educational content only
- No sales/trading
- Respect cultivation limits
- Ask questions freely

🎓 New grower? Start with #growing-basics!"
```

### Step 6: Advanced Automod Configuration

#### Content Analysis Settings
```json
{
  "automod": {
    "enabled": true,
    "strictness": "medium",
    "logChannel": "automod-log",
    "filters": {
      "spam": {
        "enabled": true,
        "duplicateMessages": 3,
        "timeframe": "30s",
        "action": "timeout"
      },
      "links": {
        "enabled": true,
        "whitelist": ["youtube.com", "reddit.com", "growweedeasy.com"],
        "requirePermission": "Verified 21+"
      },
      "mentions": {
        "enabled": true,
        "maxMentions": 3,
        "action": "warn"
      },
      "capsLock": {
        "enabled": true,
        "percentage": 70,
        "action": "warn"
      }
    }
  }
}
```

**✅ Validation**: Test automod rules with sample prohibited content

---

## 📅 Sesh Bot Setup

### Step 1: Invite Sesh Bot

1. **Invitation Link**: https://sesh.fyi/invite
2. **Required Permissions**:
   - Send Messages
   - Embed Links
   - Read Message History
   - Add Reactions
   - Manage Messages (for event updates)
   - Use External Emojis

**✅ Validation**: Sesh responds to `/sesh help`

### Step 2: Basic Sesh Configuration

#### Set Timezone and Locale
```
/sesh timezone America/New_York
/sesh locale en-US
/sesh dateformat MM/DD/YYYY
/sesh timeformat 12h
```

#### Configure Event Channels
```
/sesh channel events #events
/sesh channel calendar #calendar
/sesh channel announcements #announcements
```

### Step 3: Create Event Templates for Cannabis Community

#### Growing Workshop Template
```
/sesh template create
Name: "Growing Workshop"
Description: "Educational growing session - 21+ only"
Duration: 2h
Category: Education
RequiredRole: @Verified 21+
DefaultChannel: #events-voice
Tags: growing, education, workshop
```

#### Community Meetup Template
```
/sesh template create
Name: "Community Meetup" 
Description: "In-person community gathering"
Duration: 3h
Category: Social
RequiredRole: @Verified 21+
DefaultChannel: #meetups
Tags: community, social, meetup
```

#### Q&A Session Template
```
/sesh template create
Name: "Growing Q&A"
Description: "Ask questions about cultivation"
Duration: 1h
Category: Discussion
RequiredRole: @Verified 21+
DefaultChannel: #growing-help
Tags: qa, help, growing
```

### Step 4: Event Automation Rules

#### Age Verification for Cannabis Events
```json
{
  "eventRules": {
    "ageVerification": {
      "enabled": true,
      "requiredRole": "Verified 21+",
      "cannabisKeywords": ["growing", "cultivation", "harvest", "strain", "cannabis"],
      "enforcementAction": "block_rsvp",
      "warningMessage": "This event requires 21+ age verification."
    }
  }
}
```

#### Event Moderation
```json
{
  "eventModeration": {
    "autoModerate": true,
    "prohibitedKeywords": ["sale", "selling", "buy", "trade"],
    "requireApproval": true,
    "moderatorRole": "@Moderator"
  }
}
```

### Step 5: Calendar Integration

#### Setup Google Calendar Integration
```
/sesh calendar connect
Provider: Google Calendar
Calendar: "Growmies NJ Events"
Sync: bidirectional
Timezone: America/New_York
```

#### Configure Event Notifications
```
/sesh notifications setup
ReminderTimes: [24h, 1h, 15m]
NotificationChannel: #event-reminders
MentionRole: @Event Subscribers
```

**✅ Validation**: Create test event and verify notifications work

---

## 📊 Statbot Configuration

### Step 1: Invite Statbot

1. **Invitation Link**: https://statbot.net/invite
2. **Required Permissions**:
   - Read Messages
   - Send Messages
   - Embed Links
   - Read Message History
   - View Channels

**✅ Validation**: Statbot responds to `/stats`

### Step 2: Configure Analytics Settings

#### Basic Statistics Configuration
```
/statbot setup
Language: en
Timezone: America/New_York
AutoDeleteCommands: true
PrivacyMode: true
DataRetention: 90d
```

#### Channel Tracking Configuration
```
/statbot channel add #general
/statbot channel add #growing-basics
/statbot channel add #advanced-techniques
/statbot channel add #strain-discussion
/statbot channel add #harvest-help
/statbot channel exclude #staff-only
/statbot channel exclude #age-verification
```

### Step 3: Privacy-Compliant Analytics

#### GDPR/CCPA Compliance Settings
```json
{
  "privacy": {
    "anonymizeData": true,
    "dataRetention": "90 days",
    "allowOptOut": true,
    "encryptSensitiveData": true,
    "excludePersonalMessages": true
  }
}
```

#### Cannabis Community Specific Metrics
```
/statbot custom metric "Growing Discussions"
Channels: #growing-basics, #advanced-techniques
Keywords: growing, cultivation, harvest, plant
TimeFrame: weekly

/statbot custom metric "Community Engagement"
Channels: #general, #community
Metrics: messages, reactions, active_users
TimeFrame: daily

/statbot custom metric "Educational Content"
Channels: #learning, #resources
Keywords: education, learn, tutorial, guide
TimeFrame: monthly
```

### Step 4: Dashboard Configuration

#### Create Custom Dashboard
```
/statbot dashboard create "Community Health"
Widgets:
- Active Members (24h)
- Message Count (7d)
- Channel Activity
- Growing Discussions Trend
- Event Participation
- Age Verification Rate
```

#### Setup Automated Reports
```
/statbot report setup
Name: "Weekly Community Report"
Schedule: "Every Monday 9:00 AM"
Channel: #staff-reports
Include: member_growth, activity_trends, top_channels
Format: embed
```

**✅ Validation**: Verify analytics dashboard shows accurate data

---

## 💾 Xenon Setup

### Step 1: Invite Xenon

1. **Invitation Link**: https://xenon.bot/invite
2. **Required Permissions**:
   - Administrator (for complete backups)
   - Or specific permissions:
     - Manage Server
     - Manage Roles
     - Manage Channels
     - Manage Messages
     - Read Message History

**✅ Validation**: Xenon responds to `/backup info`

### Step 2: Configure Backup Settings

#### Create Complete Server Backup
```
/backup create
Name: "GrowmiesNJ_Full_Backup"
Include: channels, roles, settings, messages
Compression: high
Encryption: enabled
Description: "Complete server backup for disaster recovery"
```

#### Setup Automated Backups
```
/backup schedule
Frequency: daily
Time: 03:00 AM EST
RetentionPeriod: 30 days
BackupType: incremental
NotificationChannel: #backup-logs
```

### Step 3: Cannabis Compliance Backup Configuration

#### Compliance Data Backup
```json
{
  "complianceBackup": {
    "ageVerificationLogs": true,
    "moderationActions": true,
    "contentFilters": true,
    "userVerificationStatus": true,
    "encryptSensitiveData": true,
    "legalHoldCompliance": true
  }
}
```

#### Backup Verification
```
/backup verify latest
CheckIntegrity: true
ValidateStructure: true
TestRestoreability: true
GenerateReport: true
```

### Step 4: Disaster Recovery Templates

#### Emergency Restore Template
```
/template create "Emergency_Recovery"
Include: 
- Essential channels only
- Basic role structure
- Age verification system
- Moderation setup
- Critical bots
Description: "Minimal viable server for emergency restoration"
```

#### Full Restore Template
```
/template create "Complete_Restoration"
Include:
- All channels and categories
- Complete role hierarchy
- All bot integrations
- Custom emojis and stickers
- Server settings and permissions
Description: "Complete server restoration template"
```

**✅ Validation**: Test backup creation and verify file integrity

---

## ✅ Integration Testing

### Step 1: Test Carl-bot Integration

#### Automod Testing
```bash
# Test age verification filter
# Post message with "underage" keyword
# Expected: Message deleted, warning issued

# Test sales filter  
# Post message with "selling weed $50"
# Expected: Message deleted, timeout applied

# Test reaction roles
# React to age verification message
# Expected: Role assigned correctly
```

#### Custom Commands Testing
```bash
# Test legal disclaimer
!carl legal
# Expected: Legal disclaimer embed posted

# Test NJ laws command
!carl njlaws  
# Expected: NJ cannabis laws information
```

### Step 2: Test Sesh Integration

#### Event Creation Testing
```bash
# Create test event
/sesh create
Title: "Test Growing Workshop"
Date: Tomorrow 7PM
Duration: 2h
# Expected: Event created with age verification

# Test RSVP system
# React to event with specified emoji
# Expected: User added to attendee list
```

#### Calendar Integration Testing
```bash
# Verify Google Calendar sync
# Check if event appears in connected calendar
# Expected: Event synchronized with external calendar
```

### Step 3: Test Statbot Integration

#### Analytics Verification
```bash
# Check basic stats
/stats
# Expected: Current server statistics displayed

# Check custom metrics
/stats custom growing
# Expected: Growing discussion metrics shown
```

### Step 4: Test Xenon Integration

#### Backup Testing
```bash
# Create test backup
/backup create test_backup
# Expected: Backup created successfully

# Verify backup integrity
/backup verify test_backup
# Expected: Backup integrity confirmed
```

### Step 5: Cross-Bot Integration Testing

#### Test Bot Hierarchy
```bash
# Verify role positions
# Carl-bot should be able to moderate users
# Statbot should collect Carl-bot moderation data
# Sesh events should respect Carl-bot roles
# Xenon should backup all bot configurations
```

#### Test Conflict Resolution
```bash
# Test overlapping permissions
# Ensure no bot conflicts with Growmies NJ Bot
# Verify proper command precedence
```

**✅ Expected Results**: All bots function without conflicts, proper hierarchy maintained

---

## 🔧 Maintenance and Updates

### Regular Maintenance Tasks

#### Weekly Maintenance
```bash
# Check bot status
/health carl
/health sesh  
/health statbot
/health xenon

# Review automod effectiveness
/carl automod stats

# Check backup integrity
/backup status

# Review analytics reports
/stats weekly
```

#### Monthly Maintenance
```bash
# Update automod rules based on new patterns
/carl automod review

# Archive old events
/sesh cleanup

# Generate comprehensive analytics report
/stats monthly comprehensive

# Test backup restoration
/backup test-restore
```

### Bot Updates and Version Management

#### Update Notification Setup
```json
{
  "updateNotifications": {
    "channel": "#bot-updates",
    "checkFrequency": "daily",
    "autoApprove": "minor updates",
    "requireApproval": "major updates",
    "testingRequired": true
  }
}
```

#### Update Procedure
1. **Announcement**: Notify staff of pending updates
2. **Backup**: Create pre-update backup
3. **Testing**: Test updates in development environment
4. **Deployment**: Apply updates during low-activity hours
5. **Verification**: Confirm all functions work correctly
6. **Documentation**: Update configuration documentation

---

## 🚨 Troubleshooting

### Common Carl-bot Issues

#### Issue: Automod Not Working
**Symptoms**: Prohibited content not being filtered
**Solutions**:
```bash
# Check automod status
/automod status

# Verify permissions
/carl permissions check

# Test automod rules
/automod test "prohibited content example"

# Reset automod if needed
/automod reset
/automod configure
```

#### Issue: Reaction Roles Not Working
**Symptoms**: Users not getting roles when reacting
**Solutions**:
```bash
# Check reaction role setup
/rr list

# Verify bot permissions
/permissions check "Manage Roles"

# Check role hierarchy
/roles hierarchy

# Recreate reaction role if needed
/rr remove [message_id]
/rr create [new_setup]
```

### Common Sesh Issues

#### Issue: Events Not Creating
**Symptoms**: `/sesh create` command fails
**Solutions**:
```bash
# Check Sesh permissions
/sesh permissions

# Verify timezone settings
/sesh settings

# Test with minimal event
/sesh create "Test Event" tomorrow 1h

# Check integration status
/sesh status
```

#### Issue: Calendar Sync Problems
**Symptoms**: Events not appearing in external calendar
**Solutions**:
```bash
# Reconnect calendar
/sesh calendar disconnect
/sesh calendar connect

# Check sync status
/sesh calendar status

# Force manual sync
/sesh calendar sync
```

### Common Statbot Issues

#### Issue: No Statistics Data
**Symptoms**: `/stats` shows no data or errors
**Solutions**:
```bash
# Check data collection status
/statbot status

# Verify channel tracking
/statbot channels

# Reset data collection
/statbot reset
/statbot setup

# Check permissions
/statbot permissions
```

### Common Xenon Issues

#### Issue: Backup Failures
**Symptoms**: Backups fail to create or are corrupted
**Solutions**:
```bash
# Check backup status
/backup status

# Verify permissions
/backup permissions

# Clear failed backups
/backup cleanup

# Test with minimal backup
/backup create test --minimal
```

#### Issue: Restore Problems
**Symptoms**: Cannot restore from backup
**Solutions**:
```bash
# Verify backup integrity
/backup verify [backup_id]

# Check restore permissions
/backup restore --dry-run [backup_id]

# Use emergency template
/template load Emergency_Recovery
```

### Emergency Bot Recovery

#### Complete Bot Failure Recovery
```bash
# 1. Check bot status
curl -I https://discord.com/api/v10/applications/@me

# 2. Reinvite bots with correct permissions
# Use stored invitation links

# 3. Restore configurations from backup
/backup restore latest

# 4. Verify all integrations
npm run test:third-party-bots

# 5. Update documentation
# Document any configuration changes
```

---

## 📚 Configuration Backup

### Carl-bot Configuration Export
```json
{
  "carl-bot": {
    "prefix": "!carl",
    "automod": {
      "enabled": true,
      "rules": [
        {
          "name": "Age Verification",
          "triggers": ["underage", "under 21", "fake id", "minor"],
          "action": "warn,delete",
          "punishment": "timeout 1h"
        },
        {
          "name": "No Sales",
          "triggers": ["selling", "buying", "$", "price", "venmo"],
          "action": "delete,warn", 
          "punishment": "timeout 24h"
        }
      ]
    },
    "reactionRoles": [
      {
        "messageId": "123456789",
        "emoji": "✅",
        "roleId": "987654321",
        "description": "Age Verification"
      }
    ],
    "customCommands": [
      {
        "name": "legal",
        "response": "Legal disclaimer content..."
      },
      {
        "name": "njlaws", 
        "response": "NJ cannabis laws content..."
      }
    ]
  }
}
```

### Complete Third-Party Bot Settings Backup Script
```bash
#!/bin/bash
# backup-bot-configs.sh

echo "=== Third-Party Bot Configuration Backup ==="

# Create backup directory
mkdir -p backups/bot-configs/$(date +%Y%m%d)
BACKUP_DIR="backups/bot-configs/$(date +%Y%m%d)"

# Export Carl-bot configuration
echo "Backing up Carl-bot configuration..."
carl export > $BACKUP_DIR/carl-bot-config.json

# Export Sesh configuration  
echo "Backing up Sesh configuration..."
sesh export > $BACKUP_DIR/sesh-config.json

# Export Statbot configuration
echo "Backing up Statbot configuration..."
statbot export > $BACKUP_DIR/statbot-config.json

# Export Xenon configuration
echo "Backing up Xenon configuration..."
xenon export > $BACKUP_DIR/xenon-config.json

# Create summary
echo "Backup completed at $(date)" > $BACKUP_DIR/backup-summary.txt
echo "Files backed up:" >> $BACKUP_DIR/backup-summary.txt
ls -la $BACKUP_DIR >> $BACKUP_DIR/backup-summary.txt

echo "✅ Bot configuration backup completed in $BACKUP_DIR"
```

---

## 📞 Support Resources

### Bot-Specific Support

#### Carl-bot Support
- **Website**: https://carl-bot.com
- **Documentation**: https://docs.carl-bot.com
- **Support Server**: https://discord.gg/carl-bot
- **Status Page**: https://status.carl-bot.com

#### Sesh Support
- **Website**: https://sesh.fyi
- **Documentation**: https://docs.sesh.fyi
- **Support Server**: https://discord.gg/sesh
- **Feature Requests**: https://feedback.sesh.fyi

#### Statbot Support
- **Website**: https://statbot.net
- **Documentation**: https://docs.statbot.net
- **Support Server**: https://discord.gg/statbot
- **Privacy Policy**: https://statbot.net/privacy

#### Xenon Support
- **Website**: https://xenon.bot
- **Documentation**: https://docs.xenon.bot
- **Support Server**: https://discord.gg/xenon
- **Status**: https://status.xenon.bot

### Community Resources
- **Cannabis Discord Best Practices**: [Internal documentation]
- **Bot Integration Guidelines**: [Team knowledge base]
- **Compliance Checklists**: [Legal team resources]

---

**🤖 These third-party bot integrations enhance the Growmies NJ Discord community with powerful moderation, event management, analytics, and backup capabilities while maintaining strict cannabis law compliance.**

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Growmies NJ Technical Team