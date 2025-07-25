# Instagram RSS Integration Documentation

## Overview

The Instagram RSS Integration is a comprehensive webhook processing system that automatically posts Instagram content to Discord channels for the GrowmiesNJ community. This system processes RSS.app webhooks, performs content moderation appropriate for cannabis communities, and posts approved content to designated Discord channels.

## 🚨 FREE SOLUTION: Manual Instagram Posting

**UPDATE (January 2025)**: Most free Instagram RSS services are no longer viable due to recent changes:

- ❌ **IFTTT**: Removed webhook support for free users (February 2024)
- ❌ **FetchRSS**: Only 5 free posts, Instagram API changes broke functionality
- ❌ **RSSground**: Limited functionality, unreliable due to Instagram API changes
- ❌ **RSS.app**: Requires paid subscription

### ✅ Free Manual Posting Solution

We've implemented a **Manual Posting Interface** that provides immediate free functionality while leveraging all existing Instagram RSS infrastructure:

#### Features
- 🆓 **Completely free** - no paid RSS services required
- ✅ **Full content moderation** and age verification
- 🎨 **Instagram-styled Discord embeds**
- 📸 **Support for images, videos, and carousels**
- 🌿 **Hashtag filtering** for cannabis compliance
- 🔒 **All existing security features** (rate limiting, validation, etc.)

#### How to Use

1. **Access the Interface**: Navigate to `https://your-domain.com/instagram/manual`
2. **Fill the Form**:
   - Instagram Post URL (required)
   - Caption text (required)
   - Image URL (optional)
   - Video URL (optional)
   - Post type selection
3. **Submit**: Click "Post to Discord" to process through existing pipeline

#### Manual Posting Endpoints

**GET** `/instagram/manual` - Web interface for manual posting
**POST** `/instagram/manual` - API endpoint for programmatic posting

**Example API Usage:**
```bash
curl -X POST https://your-domain.com/instagram/manual \
  -H "Content-Type: application/json" \
  -d '{
    "instagram_url": "https://www.instagram.com/p/POST_ID/",
    "caption": "Your Instagram caption here...",
    "image_url": "https://example.com/image.jpg",
    "post_type": "image"
  }'
```

**API Response:**
```json
{
  "success": true,
  "message": "Instagram post processed successfully",
  "post_id": "POST_ID",
  "processed_at": "2025-01-23T23:55:00.000Z"
}
```

#### Migration Path

When you're ready to upgrade to automated RSS posting:
1. The manual interface continues to work alongside RSS automation
2. All existing infrastructure supports both manual and automated posting
3. Instagram Basic Display API setup guide provided below for future automation

---

## Architecture

### Core Components

1. **Webhook Routes** (`src/routes/instagram.js`)
   - Secure webhook endpoint with HMAC-SHA256 signature verification
   - Rate limiting (30 requests/minute)
   - Health and statistics endpoints

2. **RSS Service Layer** (`src/services/instagramRss.js`)
   - Business logic for Instagram RSS processing
   - Content moderation with cannabis-appropriate filters
   - Discord posting automation with Instagram-branded embeds
   - Database integration with InstagramPost model

3. **Express Server Integration** (`src/health.js`)
   - Instagram routes mounted at `/instagram/*`
   - Middleware for JSON parsing and request handling
   - Error handling and logging integration

### Data Flow

```
RSS.app Webhook → Express Server → Signature Verification → Rate Limiting → 
Content Moderation → Database Processing → Discord Posting → Response
```

## Installation & Configuration

### 1. Dependencies

The system requires the following dependencies (already added to package.json):

```json
{
  "axios": "^1.6.2",
  "express": "^4.18.2",
  "discord.js": "^14.14.1",
  "sequelize": "^6.37.7"
}
```

### 2. Environment Variables

Add the following environment variables to your `.env` file:

```env
# Instagram RSS Integration
INSTAGRAM_WEBHOOK_SECRET=your_rss_app_webhook_secret_here
INSTAGRAM_CHANNEL_ID=your_discord_channel_id_here
INSTAGRAM_RSS_URL=your_rss_app_webhook_url_here

# Optional: Rate limiting configuration
INSTAGRAM_RATE_LIMIT_REQUESTS=30
INSTAGRAM_RATE_LIMIT_WINDOW_MS=60000

# Optional: Content moderation settings
INSTAGRAM_MAX_POSTS_PER_HOUR=10
INSTAGRAM_ENABLE_CONTENT_MODERATION=true
```

### 3. RSS.app Configuration

1. **Create RSS Feed**: Set up an RSS feed in RSS.app for your Instagram account
2. **Configure Webhook**: Set up a webhook pointing to: `https://your-domain.com/instagram/webhook/instagram`
3. **Add Secret**: Configure the webhook secret in RSS.app (use same value as `INSTAGRAM_WEBHOOK_SECRET`)
4. **Test Connection**: Use the health endpoint to verify configuration

## API Endpoints

### Webhook Endpoint

**POST** `/instagram/webhook/instagram`

Processes incoming Instagram RSS webhooks from RSS.app.

**Headers Required:**
- `Content-Type: application/json`
- `X-RSS-Signature: sha256=<signature>` (HMAC-SHA256 signature)

**Example Payload:**
```json
{
  "feed": {
    "title": "Instagram Posts",
    "url": "https://www.instagram.com/username"
  },
  "items": [
    {
      "title": "New Instagram Post",
      "description": "Post description with hashtags",
      "link": "https://www.instagram.com/p/POST_ID/",
      "pubDate": "2025-01-23T21:54:00.000Z",
      "guid": "POST_ID"
    }
  ]
}
```

### Health Check Endpoint

**GET** `/instagram/health`

Returns the health status of the Instagram RSS system.

**Response:**
```json
{
  "status": "healthy",
  "webhook_configured": true,
  "channel_accessible": true,
  "database_connected": true,
  "last_processed": "2025-01-23T21:54:00.000Z",
  "timestamp": "2025-01-23T21:55:00.000Z"
}
```

### Statistics Endpoint

**GET** `/instagram/stats`

Returns processing statistics for the Instagram RSS system.

**Response:**
```json
{
  "total_processed": 150,
  "posts_approved": 142,
  "posts_rejected": 8,
  "posts_today": 5,
  "average_processing_time_ms": 245,
  "last_24_hours": {
    "processed": 12,
    "approved": 11,
    "rejected": 1
  },
  "content_moderation": {
    "spam_filtered": 3,
    "hashtag_filtered": 2,
    "manual_review": 3
  }
}
```

## Content Moderation

### Cannabis Community Guidelines

The system implements strict content moderation appropriate for cannabis communities:

#### Allowed Content
- Educational cannabis content
- Product reviews and information
- Growing tips and techniques
- Community discussions
- Legal compliance information

#### Content Filtering

1. **Hashtag Allowlist**
   - `#cannabis`, `#weed`, `#marijuana`
   - `#growing`, `#cultivation`, `#hydroponics`
   - `#medical`, `#legal`, `#education`
   - `#community`, `#review`, `#strain`

2. **Hashtag Blocklist**
   - `#sale`, `#buy`, `#selling`
   - `#illegal`, `#black market`
   - `#minor`, `#underage`
   - Spam and promotional tags

3. **Spam Detection**
   - Excessive hashtag usage (>15 hashtags)
   - Repetitive content patterns
   - Promotional language detection
   - External link filtering

### Moderation Workflow

1. **Automatic Filtering**: Posts are automatically screened for prohibited content
2. **Rate Limiting**: Maximum 10 posts per hour to prevent spam
3. **Manual Review Queue**: Suspicious content is flagged for manual review
4. **Database Logging**: All moderation decisions are logged for audit

## Database Integration

### InstagramPost Model

The system uses the existing `InstagramPost` model for data persistence:

```javascript
// Key fields used by the RSS integration:
{
  platform_post_id: String,    // Instagram post ID
  content: Text,                // Post description
  media_url: String,           // Instagram post URL
  posted_to_discord: Boolean,   // Discord posting status
  moderation_status: Enum,      // approved/rejected/pending
  moderation_reason: String,    // Reason for moderation decision
  rss_data: JSON               // Full RSS payload
}
```

### Database Operations

- **Duplicate Prevention**: Checks existing posts by `platform_post_id`
- **Batch Processing**: Handles multiple posts in a single webhook
- **Transaction Support**: Ensures data consistency during processing
- **Audit Trail**: Maintains complete processing history

## Discord Integration

### Embed Format

Posts are formatted as rich embeds with Instagram branding:

```javascript
{
  color: 0xE1306C,              // Instagram brand color
  title: "📷 New Instagram Post",
  description: "Post content with hashtags",
  url: "https://instagram.com/p/POST_ID/",
  thumbnail: { url: "Instagram profile picture" },
  footer: { 
    text: "Instagram RSS Feed", 
    icon_url: "Instagram icon" 
  },
  timestamp: "2025-01-23T21:54:00.000Z"
}
```

### Channel Configuration

- Posts are sent to the channel specified in `INSTAGRAM_CHANNEL_ID`
- Channel permissions are verified before posting
- Error handling for channel access issues

## Deployment

### Railway.app Configuration

The system is designed for Railway.app deployment with the following considerations:

1. **Environment Variables**: Set all required environment variables in Railway dashboard
2. **Health Monitoring**: Use the health endpoints for uptime monitoring
3. **Logging**: Comprehensive logging for debugging and monitoring
4. **Error Handling**: Graceful error handling with detailed error messages

### DNS Configuration

Configure your RSS.app webhook to point to:
```
https://your-railway-app.railway.app/instagram/webhook/instagram
```

### SSL/TLS

- Railway.app provides automatic SSL certificates
- Webhook signature verification ensures request authenticity
- All communications are encrypted in transit

## Monitoring & Troubleshooting

### Health Monitoring

1. **Application Health**: Check `/health` endpoint for overall system status
2. **Instagram RSS Health**: Check `/instagram/health` for RSS-specific status
3. **Processing Statistics**: Monitor `/instagram/stats` for performance metrics

### Common Issues

#### Webhook Not Receiving Data
- Verify `INSTAGRAM_WEBHOOK_SECRET` matches RSS.app configuration
- Check RSS.app webhook URL is correct
- Verify webhook is active in RSS.app dashboard

#### Content Not Posting to Discord
- Verify `INSTAGRAM_CHANNEL_ID` is correct
- Check bot permissions in Discord channel
- Review content moderation logs for rejection reasons

#### High Rejection Rate
- Review hashtag allowlist/blocklist configuration
- Check content moderation thresholds
- Analyze rejection reasons in statistics endpoint

### Logging

The system provides comprehensive logging:

```javascript
// Success logs
console.log('📷 Instagram webhook processed successfully');
console.log('✅ Posted to Discord:', postTitle);

// Error logs
console.error('❌ Webhook signature verification failed');
console.error('❌ Content moderation rejected:', reason);
```

## Security Considerations

### Webhook Security
- HMAC-SHA256 signature verification for all incoming webhooks
- Rate limiting to prevent abuse (30 requests/minute)
- Request size limits to prevent memory attacks

### Content Security
- Input sanitization for all user-generated content
- SQL injection prevention through Sequelize ORM
- XSS protection for any content displayed

### Access Control
- Environment variable protection for sensitive configuration
- Discord channel permission verification
- Database access through established connection patterns

## Performance Optimization

### Rate Limiting
- Webhook processing: 30 requests/minute
- Discord posting: 10 posts/hour maximum
- Database queries optimized with indexing

### Caching
- Content moderation results cached for duplicate content
- Discord channel information cached for performance
- RSS feed metadata cached to reduce processing overhead

### Error Recovery
- Retry logic for temporary Discord API failures
- Graceful degradation when database is unavailable
- Circuit breaker pattern for external API calls

## Development & Testing

### Local Development Setup

1. Clone repository and install dependencies
2. Copy `.env.example` to `.env` and configure variables
3. Start development server: `npm run dev`
4. Use ngrok or similar tool to expose local webhook endpoint
5. Configure RSS.app webhook to point to local endpoint

### Testing Webhooks

Use the provided test script or curl to test webhook processing:

```bash
curl -X POST http://localhost:3000/instagram/webhook/instagram \
  -H "Content-Type: application/json" \
  -H "X-RSS-Signature: sha256=test_signature" \
  -d '{"feed":{"title":"Test"},"items":[{"title":"Test Post"}]}'
```

## Future Enhancements

### Planned Features
- Machine learning-based content classification
- Advanced spam detection algorithms
- Multi-language content support
- Custom content filtering rules per Discord server

### Integration Opportunities
- Twitter/X RSS integration
- TikTok content processing
- YouTube channel integration
- Custom RSS feed support

## Support & Maintenance

### Regular Maintenance Tasks
- Monitor processing statistics for anomalies
- Review content moderation accuracy
- Update hashtag allowlist/blocklist as needed
- Monitor Discord API rate limits

### Troubleshooting Resources
- Application logs in Railway.app dashboard
- Database query logs for performance issues
- Discord API status page for service disruptions
- RSS.app service status and documentation

---

**Last Updated**: January 23, 2025  
**Version**: 1.0.0  
**Author**: GrowmiesNJ Development Team