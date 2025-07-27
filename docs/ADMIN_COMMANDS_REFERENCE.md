# Admin Commands Reference - GrowmiesNJ Discord Bot

## 🛡️ Overview

This reference guide documents all administrative commands available for managing the GrowmiesNJ Discord Bot's advanced features. These commands are restricted to users with appropriate permissions and are essential for system administration, user management, and compliance oversight.

## 🔐 Permission Requirements

### Administrator Roles
- **Server Owner**: Full access to all admin commands
- **Administrator**: Access to most admin commands
- **Moderator**: Access to user management and basic admin commands
- **Age Verifier**: Access to age verification commands only

### Permission Levels
- **Level 1**: Basic moderation (timeout, warn)
- **Level 2**: Advanced moderation (ban, economy management)
- **Level 3**: System administration (configuration, service management)
- **Level 4**: Owner-only commands (critical system changes)

## 🎵 Music Bot Administration

### Queue Management

#### `/admin music queue-clear`
**Purpose**: Clear the current music queue and stop playback  
**Permission**: Moderator+  
**Usage**:
```
/admin music queue-clear
/admin music queue-clear guild:target_server_id
```

**Parameters**:
- `guild` (optional): Target guild ID (for cross-server management)

**Examples**:
```
/admin music queue-clear
/admin music queue-clear guild:123456789012345678
```

#### `/admin music force-disconnect`
**Purpose**: Force disconnect bot from voice channel  
**Permission**: Moderator+  
**Usage**:
```
/admin music force-disconnect
/admin music force-disconnect reason:Emergency maintenance
```

**Parameters**:
- `reason` (optional): Reason for forced disconnection
- `notify_users` (optional): Notify users in voice channel

### Music System Configuration

#### `/admin music settings`
**Purpose**: View or modify music bot settings  
**Permission**: Administrator+  
**Usage**:
```
/admin music settings
/admin music settings max_queue_size:100
/admin music settings default_volume:75 cannabis_features:true
```

**Parameters**:
- `max_queue_size` (optional): Maximum songs in queue (10-200)
- `default_volume` (optional): Default playback volume (1-100)
- `timeout_minutes` (optional): Auto-disconnect timeout (5-60)
- `cannabis_features` (optional): Enable cannabis-specific features
- `age_restricted_content` (optional): Allow age-restricted content

**Settings Overview**:
- **Max Queue Size**: Prevent queue spam and memory issues
- **Default Volume**: Starting volume for new sessions
- **Timeout**: Auto-disconnect after inactivity
- **Cannabis Features**: Enable meditation/podcast features
- **Age Restricted**: Allow adult content (21+ verification required)

#### `/admin music stats`
**Purpose**: View comprehensive music bot statistics  
**Permission**: Moderator+  
**Usage**:
```
/admin music stats
/admin music stats period:weekly detailed:true
```

**Parameters**:
- `period` (optional): Statistics period (daily/weekly/monthly/all_time)
- `detailed` (optional): Include detailed usage analytics

**Statistics Included**:
- Total songs played
- Most popular songs and artists
- Average session length
- Voice channel usage
- Cannabis content usage (21+ verified users)
- API quota usage

### Music Content Management

#### `/admin music blacklist`
**Purpose**: Manage blacklisted songs or channels  
**Permission**: Administrator+  
**Usage**:
```
/admin music blacklist action:add type:song query:inappropriate_song_title
/admin music blacklist action:remove type:channel query:UCxxxxxxxxxxxxx
/admin music blacklist action:list
```

**Parameters**:
- `action` (required): add/remove/list
- `type` (required): song/artist/channel/playlist
- `query` (required for add/remove): Search query or ID
- `reason` (optional): Reason for blacklisting

## 🤖 AI Chat Administration

### User Management

#### `/admin ai user-stats`
**Purpose**: View AI usage statistics for specific users  
**Permission**: Moderator+  
**Usage**:
```
/admin ai user-stats user:@username
/admin ai user-stats user:@username period:monthly
```

**Parameters**:
- `user` (required): Target user
- `period` (optional): Statistics period (daily/weekly/monthly)
- `include_content` (optional): Include conversation topics (privacy-conscious)

**Statistics Shown**:
- Total AI interactions
- Cannabis-related conversations (21+ users)
- Token usage and costs
- Most active conversation types
- Recent activity patterns

#### `/admin ai clear-context`
**Purpose**: Clear AI conversation context for users  
**Permission**: Moderator+  
**Usage**:
```
/admin ai clear-context user:@username
/admin ai clear-context user:@username reason:Reset requested by user
```

**Parameters**:
- `user` (required): Target user
- `reason` (optional): Reason for context clearing
- `notify_user` (optional): Send notification to user

### AI System Configuration

#### `/admin ai settings`
**Purpose**: Configure AI system parameters  
**Permission**: Administrator+  
**Usage**:
```
/admin ai settings
/admin ai settings max_tokens:3000 temperature:0.8
/admin ai settings content_filter:strict cannabis_mode:educational
```

**Parameters**:
- `max_tokens` (optional): Maximum response length (500-4000)
- `temperature` (optional): AI creativity level (0.1-1.0)
- `content_filter` (optional): Content filtering level (strict/standard/minimal)
- `cannabis_mode` (optional): Cannabis content mode (educational/general/restricted)
- `rate_limit` (optional): Requests per hour per user (10-100)

**Configuration Details**:
- **Max Tokens**: Balance response quality vs. cost
- **Temperature**: Lower = more focused, Higher = more creative
- **Content Filter**: Compliance and safety levels
- **Cannabis Mode**: How cannabis content is handled
- **Rate Limit**: Prevent API abuse

#### `/admin ai system-status`
**Purpose**: Check AI system health and status  
**Permission**: Moderator+  
**Usage**:
```
/admin ai system-status
/admin ai system-status detailed:true
```

**Parameters**:
- `detailed` (optional): Include detailed system metrics

**Status Information**:
- OpenAI API connectivity
- Current API usage and limits
- Active conversations count
- System response times
- Error rates and recent issues

### Content Moderation

#### `/admin ai content-review`
**Purpose**: Review flagged AI conversations  
**Permission**: Administrator+  
**Usage**:
```
/admin ai content-review
/admin ai content-review user:@username period:today
/admin ai content-review flagged_only:true
```

**Parameters**:
- `user` (optional): Specific user to review
- `period` (optional): Time period to review
- `flagged_only` (optional): Only show flagged content
- `cannabis_content` (optional): Focus on cannabis-related content

## 💰 Economy System Administration

### User Account Management

#### `/admin economy balance`
**Purpose**: View or modify user economy balances  
**Permission**: Administrator+  
**Usage**:
```
/admin economy balance user:@username
/admin economy balance user:@username action:set growcoins:5000
/admin economy balance user:@username action:add premium_seeds:100 reason:Event reward
```

**Parameters**:
- `user` (required): Target user
- `action` (optional): view/set/add/subtract
- `growcoins` (optional): GrowCoins amount
- `premium_seeds` (optional): Premium Seeds amount (21+ verification required)
- `reason` (required for modifications): Reason for balance change

**Balance Actions**:
- **View**: Check current balances and statistics
- **Set**: Set specific balance amounts
- **Add**: Add currency to user account
- **Subtract**: Remove currency from user account

#### `/admin economy reset-user`
**Purpose**: Reset user's entire economy profile  
**Permission**: Administrator+  
**Usage**:
```
/admin economy reset-user user:@username confirm:true
/admin economy reset-user user:@username confirm:true reason:User request
```

**Parameters**:
- `user` (required): Target user
- `confirm` (required): Confirmation flag (must be true)
- `reason` (optional): Reason for reset
- `backup` (optional): Create backup before reset

### Economy System Configuration

#### `/admin economy settings`
**Purpose**: Configure economy system parameters  
**Permission**: Administrator+  
**Usage**:
```
/admin economy settings
/admin economy settings daily_reward:150 work_cooldown:6
/admin economy settings gift_limit:2000 tax_rate:0.03
```

**Parameters**:
- `daily_reward` (optional): Base daily reward amount (50-500)
- `work_cooldown` (optional): Hours between work sessions (2-12)
- `gift_limit` (optional): Maximum daily gift amount (500-5000)
- `tax_rate` (optional): Transaction tax rate (0.0-0.1)
- `starting_balance` (optional): New user starting balance (100-1000)
- `exchange_rate` (optional): GrowCoins to Premium Seeds ratio (50-200)

#### `/admin economy shop-management`
**Purpose**: Manage shop items and inventory  
**Permission**: Administrator+  
**Usage**:
```
/admin economy shop-management action:list
/admin economy shop-management action:add item_name:New Tool price:500 category:tools
/admin economy shop-management action:restock item_id:123 quantity:50
```

**Parameters**:
- `action` (required): list/add/remove/restock/modify
- `item_name` (optional): Name of item (for add)
- `item_id` (optional): Item ID (for modify/restock/remove)
- `price` (optional): Item price
- `category` (optional): Item category
- `quantity` (optional): Stock quantity
- `age_restricted` (optional): Requires 21+ verification

### Economy Statistics

#### `/admin economy server-stats`
**Purpose**: View comprehensive economy statistics  
**Permission**: Moderator+  
**Usage**:
```
/admin economy server-stats
/admin economy server-stats period:monthly detailed:true
```

**Parameters**:
- `period` (optional): Statistics period (daily/weekly/monthly/all_time)
- `detailed` (optional): Include detailed analytics

**Statistics Include**:
- Total currency in circulation
- Most active users and transactions
- Popular shop items and categories
- Gift exchange volumes
- Work activity patterns
- Economy health indicators

## 🔞 Age Verification Administration

### Verification Management

#### `/admin verify user`
**Purpose**: Manually verify user's age (21+)  
**Permission**: Age Verifier+  
**Usage**:
```
/admin verify user:@username method:manual
/admin verify user:@username method:manual notes:ID verified in person
```

**Parameters**:
- `user` (required): User to verify
- `method` (required): Verification method (manual/document/in_person)
- `notes` (optional): Verification notes (private)
- `notify_user` (optional): Send confirmation to user

**Verification Methods**:
- **Manual**: Admin verification based on documentation
- **Document**: Digital document verification
- **In Person**: Physical ID verification at events

#### `/admin verify revoke`
**Purpose**: Revoke user's age verification  
**Permission**: Administrator+  
**Usage**:
```
/admin verify revoke user:@username reason:Invalid documentation
/admin verify revoke user:@username reason:User request confirm:true
```

**Parameters**:
- `user` (required): User to revoke verification
- `reason` (required): Reason for revocation
- `confirm` (required): Confirmation flag
- `notify_user` (optional): Notify user of revocation

#### `/admin verify status`
**Purpose**: Check verification status and statistics  
**Permission**: Moderator+  
**Usage**:
```
/admin verify status
/admin verify status user:@username
/admin verify status pending_only:true
```

**Parameters**:
- `user` (optional): Check specific user
- `pending_only` (optional): Show only pending verifications
- `detailed` (optional): Include verification history

**Status Information**:
- Total verified users
- Pending verification requests
- Recent verification activity
- Verification method breakdown

### Verification System Settings

#### `/admin verify settings`
**Purpose**: Configure age verification system  
**Permission**: Administrator+  
**Usage**:
```
/admin verify settings
/admin verify settings require_photo_id:true verification_channel:123456789
/admin verify settings auto_role:true verified_role:987654321
```

**Parameters**:
- `require_photo_id` (optional): Require photo ID for verification
- `verification_channel` (optional): Channel ID for verification requests
- `auto_role` (optional): Automatically assign verified role
- `verified_role` (optional): Role ID for verified users
- `pending_role` (optional): Role ID for pending verification

## 🛠️ System Administration

### Bot Configuration

#### `/admin system status`
**Purpose**: Check overall bot system status  
**Permission**: Administrator+  
**Usage**:
```
/admin system status
/admin system status detailed:true include_apis:true
```

**Parameters**:
- `detailed` (optional): Include detailed system metrics
- `include_apis` (optional): Check external API status

**Status Checks**:
- Bot uptime and performance
- Database connectivity
- External API status (OpenAI, YouTube)
- Memory and CPU usage
- Active features status

#### `/admin system logs`
**Purpose**: Access system logs and error reports  
**Permission**: Administrator+  
**Usage**:
```
/admin system logs level:error count:50
/admin system logs level:info since:24h feature:ai
```

**Parameters**:
- `level` (optional): Log level (debug/info/warn/error)
- `count` (optional): Number of log entries (10-100)
- `since` (optional): Time period (1h/6h/24h/7d)
- `feature` (optional): Filter by feature (music/ai/economy)

#### `/admin system restart`
**Purpose**: Restart bot services or features  
**Permission**: Owner only  
**Usage**:
```
/admin system restart feature:music confirm:true
/admin system restart feature:all confirm:true reason:Configuration update
```

**Parameters**:
- `feature` (required): Feature to restart (music/ai/economy/all)
- `confirm` (required): Confirmation flag (must be true)
- `reason` (optional): Reason for restart
- `notify_users` (optional): Notify affected users

### Maintenance Commands

#### `/admin maintenance mode`
**Purpose**: Enable or disable maintenance mode  
**Permission**: Administrator+  
**Usage**:
```
/admin maintenance mode:enable reason:Database update
/admin maintenance mode:disable
```

**Parameters**:
- `mode` (required): enable/disable
- `reason` (optional): Reason for maintenance
- `duration` (optional): Expected maintenance duration
- `features` (optional): Specific features to disable

#### `/admin maintenance backup`
**Purpose**: Create system backups  
**Permission**: Administrator+  
**Usage**:
```
/admin maintenance backup type:database
/admin maintenance backup type:full include_logs:true
```

**Parameters**:
- `type` (required): database/configuration/full
- `include_logs` (optional): Include log files in backup
- `compress` (optional): Compress backup files

## 🔒 Security & Compliance

### Audit Commands

#### `/admin audit user-activity`
**Purpose**: Audit user activity across all systems  
**Permission**: Administrator+  
**Usage**:
```
/admin audit user-activity user:@username period:30d
/admin audit user-activity user:@username include_cannabis:true
```

**Parameters**:
- `user` (required): User to audit
- `period` (optional): Audit period (7d/30d/90d)
- `include_cannabis` (optional): Include cannabis-related activities
- `export` (optional): Export audit report

#### `/admin audit system-access`
**Purpose**: Review system access and admin command usage  
**Permission**: Owner only  
**Usage**:
```
/admin audit system-access period:7d
/admin audit system-access admin:@moderator detailed:true
```

**Parameters**:
- `period` (optional): Audit period
- `admin` (optional): Specific admin to audit
- `detailed` (optional): Include detailed command logs

### Compliance Management

#### `/admin compliance report`
**Purpose**: Generate compliance reports for cannabis content  
**Permission**: Administrator+  
**Usage**:
```
/admin compliance report type:age_verification period:monthly
/admin compliance report type:cannabis_content export:true
```

**Parameters**:
- `type` (required): age_verification/cannabis_content/user_data
- `period` (optional): Report period
- `export` (optional): Export report to file
- `anonymize` (optional): Anonymize user data

## 📊 Analytics & Reporting

### Usage Analytics

#### `/admin analytics overview`
**Purpose**: View comprehensive bot usage analytics  
**Permission**: Moderator+  
**Usage**:
```
/admin analytics overview period:weekly
/admin analytics overview feature:economy detailed:true
```

**Parameters**:
- `period` (optional): Analytics period
- `feature` (optional): Specific feature analytics
- `detailed` (optional): Include detailed metrics

#### `/admin analytics export`
**Purpose**: Export analytics data for external analysis  
**Permission**: Administrator+  
**Usage**:
```
/admin analytics export format:csv period:monthly
/admin analytics export format:json features:music,ai,economy
```

**Parameters**:
- `format` (required): csv/json/xlsx
- `period` (optional): Export period
- `features` (optional): Specific features to include
- `anonymize` (optional): Remove personally identifiable information

## 🚨 Emergency Commands

### Crisis Management

#### `/admin emergency shutdown`
**Purpose**: Emergency shutdown of bot services  
**Permission**: Owner only  
**Usage**:
```
/admin emergency shutdown feature:all reason:Security incident
/admin emergency shutdown feature:ai reason:API compromise confirm:EMERGENCY
```

**Parameters**:
- `feature` (required): Feature to shutdown (music/ai/economy/all)
- `reason` (required): Emergency reason
- `confirm` (required): Must type "EMERGENCY" exactly
- `broadcast` (optional): Send emergency notice to all users

#### `/admin emergency lockdown`
**Purpose**: Lock down age-restricted features immediately  
**Permission**: Administrator+  
**Usage**:
```
/admin emergency lockdown reason:Compliance review
/admin emergency lockdown duration:24h reason:Legal investigation
```

**Parameters**:
- `reason` (required): Lockdown reason
- `duration` (optional): Lockdown duration (1h-7d)
- `notify_verified` (optional): Notify all 21+ verified users

## 📝 Command Logging & Audit Trail

All administrative commands are automatically logged with:
- **Command**: Exact command used
- **Admin User**: Who executed the command
- **Timestamp**: When the command was executed
- **Parameters**: All parameters provided
- **Result**: Success/failure and details
- **IP Address**: Admin's IP address (if available)
- **Reason**: Provided reason for the action

### Audit Log Access
```
/admin logs audit period:7d admin:@username
/admin logs audit feature:economy action:balance_modification
```

## ⚠️ Important Warnings

### Cannabis Compliance
- **Always verify 21+ status** before granting cannabis-related permissions
- **Document all age verifications** with proper reasoning
- **Regular compliance audits** are required for legal compliance
- **Immediately report** any underage access to cannabis content

### Data Protection
- **User privacy**: Minimize data collection and access
- **Secure storage**: Ensure all user data is properly protected
- **Audit trails**: Maintain logs for compliance and security
- **Data retention**: Follow data retention policies

### System Security
- **Regular backups**: Create backups before major changes
- **Access control**: Limit admin permissions to necessary personnel
- **Monitor usage**: Watch for unusual admin command patterns
- **Emergency procedures**: Know emergency shutdown procedures

## 📚 Related Documentation

- **[Advanced Features Setup](ADVANCED_FEATURES_SETUP.md)** - Initial system configuration
- **[User Guides](USER_GUIDES/)** - End-user feature documentation
- **[Music Bot Implementation](MUSIC_BOT_IMPLEMENTATION.md)** - Technical implementation details

---

**Last Updated**: January 2024  
**Documentation Version**: 1.0.0  
**Bot Version**: 2.0.0 (Advanced Features)

For emergency support or critical issues with administrative commands, contact the development team immediately through the designated emergency channels.