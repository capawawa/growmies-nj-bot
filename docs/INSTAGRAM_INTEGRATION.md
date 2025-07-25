# Growmies NJ Discord Bot - Instagram Integration

## 📸 Complete Instagram to Discord Automation Setup Guide

**Target Audience**: Social media managers, community administrators, and technical staff  
**Estimated Time**: 20-30 minutes for complete setup  
**Prerequisites**: Instagram Business Account, RSS.app account, Discord server admin access

---

## 📋 Table of Contents

1. [Integration Overview](#integration-overview)
2. [Prerequisites and Requirements](#prerequisites-and-requirements)
3. [RSS.app Configuration](#rssapp-configuration)
4. [Discord Webhook Setup](#discord-webhook-setup)
5. [Content Filtering and Moderation](#content-filtering-and-moderation)
6. [Compliance and Legal Requirements](#compliance-and-legal-requirements)
7. [Testing and Validation](#testing-and-validation)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

---

## 🎯 Integration Overview

### What This Integration Does
- **Automatic Posting**: Instagram posts from @growmiesNJ automatically appear in Discord
- **Real-time Sync**: New posts appear within 5-15 minutes
- **Content Filtering**: Cannabis compliance and community guidelines enforcement
- **Rich Formatting**: Images, captions, and hashtags properly formatted for Discord
- **Engagement Tracking**: Monitor community response to Instagram content

### Technical Architecture
```
Instagram (@growmiesNJ) → RSS.app → Webhook → Discord Bot → #instagram-feed
```

### Key Features
- ✅ **Automated Content Sharing**: No manual posting required
- ✅ **Cannabis Compliance**: 21+ age verification for content access
- ✅ **Content Moderation**: Automatic filtering of inappropriate content
- ✅ **Rich Media Support**: Images, videos, and carousel posts
- ✅ **Hashtag Processing**: Automatic hashtag formatting and linking
- ✅ **Engagement Analytics**: Track likes, comments, and Discord reactions

---

## 📋 Prerequisites and Requirements

### Required Accounts
- **Instagram Business Account**: @growmiesNJ (must be business account for RSS access)
- **RSS.app Account**: Professional plan recommended for reliability
- **Discord Server**: Admin permissions required
- **Growmies NJ Bot**: Deployed and operational

### Technical Requirements
- **Webhook Endpoint**: HTTPS-enabled server for receiving RSS.app webhooks
- **SSL Certificate**: Required for secure webhook communication
- **Port Access**: Incoming HTTPS traffic on port 443
- **Domain Name**: For webhook URL (e.g., `https://your-domain.com/webhook/instagram`)

### Legal Requirements
- ⚠️ **New Jersey Cannabis Law Compliance**: Content must follow state regulations
- ⚠️ **Age Verification**: All cannabis content restricted to 21+ verified users
- ⚠️ **Content Guidelines**: No sales, no medical advice, educational content only
- ⚠️ **Privacy Protection**: User data handling per GDPR/CCPA requirements

---

## 🔧 RSS.app Configuration

### Step 1: Create RSS.app Account

1. **Sign Up**: Go to https://rss.app
2. **Choose Plan**: Select Professional plan ($29/month) for:
   - Instagram business account support
   - Webhook notifications
   - Higher refresh rates
   - Priority support

### Step 2: Connect Instagram Account

1. **Add Feed Source**:
   - Click "Add New Feed"
   - Select "Instagram"
   - Enter: `@growmiesNJ`

2. **Authenticate Account**:
   - Log in with Instagram business account credentials
   - Grant necessary permissions:
     - Read basic profile info
     - Access media
     - Read public content

3. **Configure Feed Settings**:
   ```json
   {
     "feedName": "GrowmiesNJ_Instagram",
     "refreshInterval": "5 minutes",
     "includeImages": true,
     "includeVideos": true,
     "includeCarousels": true,
     "maxItems": 50
   }
   ```

**✅ Validation**: RSS feed should be accessible at provided URL

### Step 3: Setup Webhook Notifications

1. **Enable Webhooks**:
   - Navigate to Feed Settings
   - Enable "Webhook Notifications"
   - Set webhook URL: `https://your-domain.com/webhook/instagram`

2. **Configure Webhook Payload**:
   ```json
   {
     "format": "json",
     "includeMetadata": true,
     "includeImages": true,
     "includeHashtags": true,
     "includeCaptions": true,
     "customFields": {
       "source": "instagram",
       "account": "growmiesNJ",
       "compliance": "21+"
     }
   }
   ```

3. **Set Security Headers**:
   ```
   Content-Type: application/json
   User-Agent: RSS.app/1.0
   X-RSS-Source: instagram
   X-RSS-Account: growmiesNJ
   ```

**✅ Validation**: Test webhook should receive sample payload

### Step 4: Advanced RSS.app Settings

#### Content Filtering Rules
```json
{
  "filters": {
    "exclude_keywords": ["sale", "buy", "purchase", "medical", "doctor"],
    "exclude_hashtags": ["#forsale", "#medicine", "#prescription"],
    "include_only": ["#education", "#growing", "#cannabis", "#newjersey"]
  }
}
```

#### Rate Limiting
```json
{
  "rateLimiting": {
    "maxPostsPerHour": 5,
    "maxPostsPerDay": 20,
    "delayBetweenPosts": "2 minutes"
  }
}
```

---

## 🔗 Discord Webhook Setup

### Step 1: Configure Discord Channel

1. **Create Channel**: Create `#instagram-feed` channel if not exists
2. **Set Permissions**:
   - **@everyone**: No access (age verification required)
   - **Verified 21+**: Read messages, add reactions
   - **Growmies NJ Bot**: Manage messages, embed links
   - **Moderators**: Manage messages, delete messages

### Step 2: Bot Webhook Handler

Create webhook endpoint in your Discord bot:

```javascript
// webhook-handler.js
const express = require('express');
const crypto = require('crypto');
const { EmbedBuilder } = require('discord.js');

const app = express();
app.use(express.json({ limit: '10mb' }));

// Webhook signature verification
function verifyWebhookSignature(payload, signature, secret) {
    const computedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return `sha256=${computedSignature}` === signature;
}

// Instagram webhook endpoint
app.post('/webhook/instagram', async (req, res) => {
    try {
        // Verify webhook signature
        const signature = req.headers['x-rss-signature'];
        const isValid = verifyWebhookSignature(
            JSON.stringify(req.body), 
            signature, 
            process.env.RSS_WEBHOOK_SECRET
        );
        
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid signature' });
        }

        // Process Instagram post
        const post = req.body;
        await processInstagramPost(post);
        
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Processing failed' });
    }
});

async function processInstagramPost(post) {
    // Content moderation check
    if (!await passesContentModeration(post)) {
        await logRejectedContent(post, 'Failed content moderation');
        return;
    }

    // Age verification check
    if (!await requiresAgeVerification(post)) {
        await logRejectedContent(post, 'Cannabis content without age gate');
        return;
    }

    // Create Discord embed
    const embed = await createInstagramEmbed(post);
    
    // Post to Discord
    const channel = await client.channels.fetch(INSTAGRAM_CHANNEL_ID);
    await channel.send({ embeds: [embed] });
    
    // Log successful post
    await logSuccessfulPost(post);
}
```

### Step 3: Environment Configuration

Add to `.env` file:
```env
# Instagram Integration
INSTAGRAM_RSS_WEBHOOK=https://your-domain.com/webhook/instagram
RSS_WEBHOOK_SECRET=your_webhook_secret_key
INSTAGRAM_CHANNEL_ID=your_instagram_channel_id
INSTAGRAM_LOG_CHANNEL_ID=your_log_channel_id

# Content Moderation
CONTENT_FILTER_STRICT=true
AGE_VERIFICATION_REQUIRED=true
CANNABIS_KEYWORDS_FILTER=true
```

---

## 🛡️ Content Filtering and Moderation

### Automated Content Filters

#### Cannabis Compliance Filter
```javascript
// content-filters.js
const CANNABIS_KEYWORDS = [
    'grow', 'growing', 'cultivation', 'harvest', 'strain',
    'indica', 'sativa', 'hybrid', 'terpenes', 'THC', 'CBD'
];

const PROHIBITED_KEYWORDS = [
    'sale', 'sell', 'buy', 'purchase', 'for sale',
    'medical', 'doctor', 'prescription', 'treatment',
    'delivery', 'dispensary', 'dealer'
];

async function passesContentModeration(post) {
    const content = `${post.caption} ${post.hashtags.join(' ')}`.toLowerCase();
    
    // Check for prohibited content
    const hasProhibited = PROHIBITED_KEYWORDS.some(keyword => 
        content.includes(keyword)
    );
    
    if (hasProhibited) {
        return false;
    }
    
    // Check for cannabis content (requires age verification)
    const hasCannabis = CANNABIS_KEYWORDS.some(keyword => 
        content.includes(keyword)
    );
    
    if (hasCannabis) {
        // Mark for age-restricted channel
        post.ageRestricted = true;
    }
    
    return true;
}
```

#### Image Content Analysis
```javascript
// image-analysis.js
const vision = require('@google-cloud/vision');

async function analyzeImage(imageUrl) {
    const client = new vision.ImageAnnotatorClient();
    
    const [result] = await client.safeSearchDetection(imageUrl);
    const safeSearch = result.safeSearchAnnotation;
    
    // Check for inappropriate content
    if (safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY') {
        return { safe: false, reason: 'Adult content detected' };
    }
    
    if (safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY') {
        return { safe: false, reason: 'Violence detected' };
    }
    
    return { safe: true };
}
```

### Manual Moderation Queue

```javascript
// moderation-queue.js
async function queueForManualReview(post, reason) {
    const moderationEmbed = new EmbedBuilder()
        .setTitle('🔍 Content Pending Review')
        .setDescription(`**Reason**: ${reason}`)
        .addFields(
            { name: 'Instagram URL', value: post.url },
            { name: 'Caption', value: post.caption.substring(0, 1000) },
            { name: 'Hashtags', value: post.hashtags.join(', ') }
        )
        .setImage(post.imageUrl)
        .setTimestamp()
        .setColor(0xFFA500);

    const moderationChannel = await client.channels.fetch(MODERATION_CHANNEL_ID);
    const message = await moderationChannel.send({ 
        embeds: [moderationEmbed],
        components: [
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`approve_${post.id}`)
                        .setLabel('Approve')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`reject_${post.id}`)
                        .setLabel('Reject')
                        .setStyle(ButtonStyle.Danger)
                )
        ]
    });
    
    // Store for moderation tracking
    await storeForModeration(post.id, message.id, reason);
}
```

---

## ⚖️ Compliance and Legal Requirements

### New Jersey Cannabis Law Compliance

#### Age Verification Requirements
```javascript
// age-verification.js
async function requiresAgeVerification(post) {
    const content = `${post.caption} ${post.hashtags.join(' ')}`.toLowerCase();
    
    const cannabisKeywords = [
        'cannabis', 'marijuana', 'weed', 'grow', 'strain',
        'thc', 'cbd', 'cultivation', 'harvest'
    ];
    
    return cannabisKeywords.some(keyword => content.includes(keyword));
}

async function enforceAgeRestriction(channel, post) {
    // Set channel permissions for 21+ only
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: false,
        SendMessages: false
    });
    
    await channel.permissionOverwrites.edit(verifiedRole, {
        ViewChannel: true,
        SendMessages: false,
        AddReactions: true
    });
}
```

#### Content Disclaimer
```javascript
// compliance-disclaimers.js
function addComplianceDisclaimer(embed, post) {
    if (post.ageRestricted) {
        embed.setFooter({
            text: '⚠️ 21+ Content | Educational Purpose Only | NJ Cannabis Laws Apply',
            iconURL: 'https://example.com/warning-icon.png'
        });
        
        embed.addFields({
            name: '⚖️ Legal Notice',
            value: 'This content is for educational purposes only. Cannabis use is restricted to adults 21+ in New Jersey. Follow all state and local laws.',
            inline: false
        });
    }
    
    return embed;
}
```

### Privacy and Data Protection

#### GDPR/CCPA Compliance
```javascript
// privacy-protection.js
async function handleDataPrivacy(post) {
    // Remove personal information
    post.caption = removePersonalInfo(post.caption);
    
    // Log data processing
    await logDataProcessing({
        action: 'instagram_post_processed',
        data: {
            post_id: post.id,
            processing_date: new Date(),
            data_retention: '30 days'
        }
    });
    
    // Set data retention policy
    setTimeout(async () => {
        await deleteProcessedData(post.id);
    }, 30 * 24 * 60 * 60 * 1000); // 30 days
}
```

---

## ✅ Testing and Validation

### Step 1: Test RSS.app Connection

```bash
# Test RSS feed accessibility
curl -I "https://rss.app/feeds/[feed-id].xml"

# Expected response: 200 OK with XML content-type
```

### Step 2: Test Webhook Endpoint

```bash
# Test webhook endpoint
curl -X POST https://your-domain.com/webhook/instagram \
  -H "Content-Type: application/json" \
  -H "X-RSS-Signature: sha256=test" \
  -d '{
    "title": "Test Instagram Post",
    "description": "Testing webhook integration",
    "link": "https://instagram.com/p/test",
    "pubDate": "2025-01-08T12:00:00Z",
    "guid": "test-guid",
    "media": {
      "url": "https://instagram.com/test-image.jpg",
      "type": "image/jpeg"
    }
  }'
```

**✅ Expected Result**: 200 OK response, test post appears in Discord

### Step 3: Test Content Filtering

Create test posts with various content types:

1. **Clean Educational Content**: Should pass all filters
2. **Cannabis Growing Content**: Should require age verification
3. **Prohibited Sales Content**: Should be rejected
4. **Mixed Content**: Should be queued for manual review

### Step 4: Test Age Verification

1. Test with unverified user account
2. Verify access denied to #instagram-feed
3. Test with verified 21+ account
4. Confirm full access granted

**✅ Expected Result**: Proper access control based on verification status

---

## 📊 Monitoring and Maintenance

### Performance Monitoring

```javascript
// monitoring.js
const metrics = {
    postsProcessed: 0,
    postsApproved: 0,
    postsRejected: 0,
    averageProcessingTime: 0,
    errors: 0
};

async function trackPerformance() {
    setInterval(async () => {
        // Log performance metrics
        console.log('Instagram Integration Metrics:', metrics);
        
        // Send to monitoring system
        await sendMetrics('instagram_integration', metrics);
        
        // Reset counters
        Object.keys(metrics).forEach(key => {
            if (typeof metrics[key] === 'number') {
                metrics[key] = 0;
            }
        });
    }, 300000); // Every 5 minutes
}
```

### Health Checks

```bash
#!/bin/bash
# instagram-health-check.sh

echo "=== Instagram Integration Health Check ==="

# Check RSS feed accessibility
if curl -s -f "https://rss.app/feeds/[feed-id].xml" > /dev/null; then
    echo "✅ RSS feed accessible"
else
    echo "❌ RSS feed inaccessible"
fi

# Check webhook endpoint
if curl -s -f "https://your-domain.com/webhook/instagram/health" > /dev/null; then
    echo "✅ Webhook endpoint responding"
else
    echo "❌ Webhook endpoint down"
fi

# Check recent posts
RECENT_POSTS=$(grep "instagram_post_processed" logs/app.log | tail -10 | wc -l)
if [ $RECENT_POSTS -gt 0 ]; then
    echo "✅ Recent posts processed: $RECENT_POSTS"
else
    echo "⚠️ No recent posts processed"
fi
```

### Automated Maintenance Tasks

```javascript
// maintenance.js
const cron = require('node-cron');

// Clean up old processed data (daily at 2 AM)
cron.schedule('0 2 * * *', async () => {
    await cleanupOldData();
    await optimizeDatabase();
    await generateDailyReport();
});

// Refresh RSS feed cache (every hour)
cron.schedule('0 * * * *', async () => {
    await refreshRSSCache();
});

// Check for stuck webhooks (every 15 minutes)
cron.schedule('*/15 * * * *', async () => {
    await checkStuckWebhooks();
});
```

---

## 🚨 Troubleshooting

### Common Issues and Solutions

#### Issue: Posts Not Appearing in Discord

**Diagnosis**:
```bash
# Check RSS.app feed status
curl -I "https://rss.app/feeds/[feed-id].xml"

# Check webhook logs
tail -f logs/webhook.log | grep "instagram"

# Verify bot permissions
npm run discord:check-bot-permissions
```

**Solutions**:
1. **RSS.app Issues**: Check account status, verify Instagram connection
2. **Webhook Problems**: Verify endpoint URL, check SSL certificate
3. **Bot Permissions**: Ensure bot can send messages to #instagram-feed
4. **Content Filtering**: Check if posts are being filtered out

#### Issue: Content Moderation False Positives

**Diagnosis**:
```bash
# Review moderation logs
grep "content_rejected" logs/moderation.log | tail -20

# Check filter configuration
npm run moderation:check-filters
```

**Solutions**:
1. **Adjust Keyword Filters**: Remove overly strict keywords
2. **Whitelist Educational Content**: Add educational hashtags to whitelist
3. **Manual Override**: Process false positives manually

#### Issue: Age Verification Not Working

**Diagnosis**:
```bash
# Check role configuration
npm run roles:verify-age-verification

# Test permission matrix
npm run permissions:test-matrix
```

**Solutions**:
1. **Role Assignment**: Verify "Verified 21+" role exists and is assigned correctly
2. **Channel Permissions**: Check channel permission overrides
3. **Bot Hierarchy**: Ensure bot role is above user roles

### Emergency Procedures

#### Content Compliance Violation

```bash
# Emergency: Remove all Instagram content
npm run emergency:purge-instagram-content

# Disable integration
npm run instagram:disable-integration

# Notify compliance team
npm run compliance:emergency-alert
```

#### RSS.app Service Outage

```bash
# Switch to backup RSS service
npm run instagram:switch-to-backup

# Enable manual posting mode
npm run instagram:enable-manual-mode

# Notify social media team
npm run alerts:notify-social-team
```

---

## 📚 Configuration Examples

### Complete RSS.app Webhook Payload

```json
{
  "feed": {
    "title": "GrowmiesNJ Instagram Feed",
    "link": "https://instagram.com/growmiesnj",
    "description": "Latest posts from @growmiesNJ"
  },
  "item": {
    "title": "New Growing Technique Tutorial 🌱",
    "description": "Check out our latest video on advanced LST techniques for maximizing yields. Perfect for intermediate growers looking to step up their game! #cannabis #growing #LST #education #newjersey",
    "link": "https://instagram.com/p/ABC123DEF456",
    "guid": "instagram_post_ABC123DEF456",
    "pubDate": "2025-01-08T15:30:00Z",
    "author": "growmiesnj",
    "media": {
      "url": "https://scontent.cdninstagram.com/v/image.jpg",
      "type": "image/jpeg",
      "width": 1080,
      "height": 1080
    },
    "hashtags": ["#cannabis", "#growing", "#LST", "#education", "#newjersey"],
    "mentions": ["@growmiesnj"],
    "location": "New Jersey, USA",
    "engagement": {
      "likes": 247,
      "comments": 18,
      "shares": 12
    }
  }
}
```

### Discord Embed Template

```javascript
// embed-template.js
function createInstagramEmbed(post) {
    const embed = new EmbedBuilder()
        .setAuthor({
            name: '@growmiesNJ',
            iconURL: 'https://instagram.com/growmiesnj/profile-picture.jpg',
            url: 'https://instagram.com/growmiesnj'
        })
        .setTitle('📸 New Instagram Post')
        .setDescription(formatCaption(post.description))
        .setImage(post.media.url)
        .addFields(
            {
                name: '📊 Engagement',
                value: `❤️ ${post.engagement.likes} | 💬 ${post.engagement.comments} | 🔄 ${post.engagement.shares}`,
                inline: true
            },
            {
                name: '🏷️ Hashtags',
                value: post.hashtags.slice(0, 10).join(' '),
                inline: false
            }
        )
        .setFooter({
            text: 'Growmies NJ Community | 21+ Educational Content Only',
            iconURL: 'https://your-domain.com/logo.png'
        })
        .setTimestamp(new Date(post.pubDate))
        .setColor(0x E4405F); // Instagram brand color

    // Add compliance disclaimer for cannabis content
    if (requiresAgeVerification(post)) {
        embed = addComplianceDisclaimer(embed, post);
    }

    return embed;
}
```

---

## 📞 Support and Resources

### Technical Support
- **RSS.app Support**: support@rss.app
- **Instagram Business Help**: https://business.help.instagram.com
- **Discord Developer Support**: https://discord.com/developers/docs

### Legal and Compliance
- **NJ Cannabis Regulatory Commission**: https://www.nj.gov/cannabis/
- **Cannabis Law Updates**: [Legal team contact]
- **Compliance Questions**: legal@growmiesnj.com

### Community Resources
- **Instagram Best Practices**: [Link to guide]
- **Cannabis Content Guidelines**: [Link to guidelines]
- **Community Engagement Tips**: [Link to tips]

---

**📸 This Instagram integration ensures seamless, compliant, and engaging content sharing from @growmiesNJ to the Discord community while maintaining strict adherence to New Jersey cannabis regulations.**

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: Growmies NJ Social Media Team