const express = require('express');
const crypto = require('crypto');
const instagramRssService = require('../services/instagramRss');

const router = express.Router();

/**
 * Verify RSS.app webhook signature for security
 * Prevents unauthorized webhook calls
 */
function verifyWebhookSignature(req, res, next) {
    const signature = req.headers['x-webhook-signature'];
    const webhookSecret = process.env.INSTAGRAM_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
        console.error('INSTAGRAM_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook not properly configured' });
    }
    
    if (!signature) {
        console.warn('Missing webhook signature header');
        return res.status(401).json({ error: 'Missing signature' });
    }
    
    try {
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(req.body))
            .digest('hex');
        
        const providedSignature = signature.replace('sha256=', '');
        
        if (!crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        )) {
            console.warn('Invalid webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }
        
        next();
    } catch (error) {
        console.error('Webhook signature verification failed:', error);
        return res.status(401).json({ error: 'Signature verification failed' });
    }
}

/**
 * Validate RSS.app webhook payload structure
 * Ensures required fields are present
 */
function validateWebhookPayload(req, res, next) {
    const { body } = req;
    
    if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Invalid payload format' });
    }
    
    // RSS.app webhook payload validation
    if (!body.items || !Array.isArray(body.items)) {
        return res.status(400).json({ error: 'Missing or invalid items array' });
    }
    
    // Validate each RSS item has required fields
    for (const item of body.items) {
        if (!item.title || !item.link || !item.guid) {
            return res.status(400).json({ 
                error: 'RSS item missing required fields (title, link, guid)' 
            });
        }
    }
    
    next();
}

/**
 * Rate limiting middleware for webhook endpoints
 * Prevents spam and abuse
 */
const rateLimitStore = new Map();
function rateLimitWebhook(req, res, next) {
    const clientIp = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 30; // Max 30 requests per minute
    
    // Clean old entries
    for (const [ip, data] of rateLimitStore.entries()) {
        if (now - data.resetTime > windowMs) {
            rateLimitStore.delete(ip);
        }
    }
    
    const clientData = rateLimitStore.get(clientIp) || { count: 0, resetTime: now };
    
    if (now - clientData.resetTime > windowMs) {
        clientData.count = 1;
        clientData.resetTime = now;
    } else {
        clientData.count++;
    }
    
    rateLimitStore.set(clientIp, clientData);
    
    if (clientData.count > maxRequests) {
        return res.status(429).json({ 
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((windowMs - (now - clientData.resetTime)) / 1000)
        });
    }
    
    next();
}

/**
 * POST /webhook/instagram
 * Main webhook endpoint for RSS.app Instagram feed updates
 * Processes new Instagram posts and forwards to Discord
 */
router.post('/instagram', 
    rateLimitWebhook,
    verifyWebhookSignature,
    validateWebhookPayload,
    async (req, res) => {
        try {
            const { items, feed } = req.body;
            const processedCount = { success: 0, filtered: 0, failed: 0 };
            
            console.log(`Processing ${items.length} Instagram RSS items from feed: ${feed?.title || 'Unknown'}`);
            
            // Process each RSS feed item
            for (const item of items) {
                try {
                    const result = await instagramRssService.processInstagramPost(item);
                    
                    if (result.filtered) {
                        processedCount.filtered++;
                        console.log(`Filtered post: ${item.title} - Reason: ${result.reason}`);
                    } else if (result.success) {
                        processedCount.success++;
                        console.log(`Successfully processed post: ${item.title}`);
                    } else {
                        processedCount.failed++;
                        console.error(`Failed to process post: ${item.title} - Error: ${result.error}`);
                    }
                } catch (itemError) {
                    processedCount.failed++;
                    console.error(`Error processing item ${item.guid}:`, itemError);
                }
            }
            
            // Log processing summary
            console.log(`Instagram webhook processing complete:`, {
                total: items.length,
                ...processedCount,
                feed: feed?.title
            });
            
            // Return success response to RSS.app
            res.status(200).json({
                success: true,
                processed: processedCount,
                message: `Processed ${items.length} items: ${processedCount.success} posted, ${processedCount.filtered} filtered, ${processedCount.failed} failed`
            });
            
        } catch (error) {
            console.error('Instagram webhook processing error:', error);
            
            // Return 500 to trigger RSS.app retry
            res.status(500).json({
                success: false,
                error: 'Internal processing error',
                retryable: true
            });
        }
    }
);

/**
 * GET /webhook/instagram/health
 * Health check endpoint for monitoring
 */
router.get('/instagram/health', (req, res) => {
    res.status(200).json({
        service: 'Instagram RSS Webhook',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

/**
 * GET /webhook/instagram/stats
 * Basic statistics endpoint (could be expanded for monitoring)
 */
router.get('/instagram/stats', async (req, res) => {
    try {
        const stats = await instagramRssService.getProcessingStats();
        res.status(200).json({
            service: 'Instagram RSS Processing',
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching Instagram stats:', error);
        res.status(500).json({
            error: 'Failed to fetch statistics'
        });
    }
});

/**
 * POST /manual
 * Manual Instagram posting endpoint for free integration
 * Processes Instagram posts manually when RSS feeds are not available
 */
router.post('/manual', rateLimitWebhook, async (req, res) => {
    const {
        instagram_url,
        caption,
        image_url,
        video_url,
        post_type = 'image',
        guild_id
    } = req.body;

    // Validate required fields
    if (!instagram_url || !caption) {
        return res.status(400).json({
            error: 'Missing required fields',
            required: ['instagram_url', 'caption'],
            received: Object.keys(req.body)
        });
    }

    // Validate Instagram URL format
    const instagramUrlPattern = /^https:\/\/(www\.)?instagram\.com\/p\/[\w-]+\/?/;
    if (!instagramUrlPattern.test(instagram_url)) {
        return res.status(400).json({
            error: 'Invalid Instagram URL format',
            expected: 'https://www.instagram.com/p/POST_ID/',
            received: instagram_url
        });
    }

    try {
        // Extract post ID from URL
        const postIdMatch = instagram_url.match(/\/p\/([\w-]+)/);
        const post_id = postIdMatch ? postIdMatch[1] : null;

        if (!post_id) {
            return res.status(400).json({
                error: 'Could not extract post ID from Instagram URL',
                url: instagram_url
            });
        }

        // Create RSS-like item structure for existing pipeline
        const rssItem = {
            guid: post_id,
            id: post_id,
            link: instagram_url,
            title: caption.substring(0, 100) + (caption.length > 100 ? '...' : ''),
            description: caption,
            content: caption,
            author: 'growmiesnj',
            pubDate: new Date().toISOString(),
            enclosures: []
        };

        // Add media enclosures
        if (image_url) {
            rssItem.enclosures.push({
                url: image_url,
                type: 'image/jpeg'
            });
        }

        if (video_url) {
            rssItem.enclosures.push({
                url: video_url,
                type: 'video/mp4'
            });
        }

        // Process through existing Instagram RSS pipeline
        const result = await instagramRssService.processInstagramPost(rssItem, {
            source: 'manual',
            guild_id: guild_id || null
        });

        if (result.success) {
            res.json({
                success: true,
                message: 'Instagram post processed successfully',
                post_id: post_id,
                processed_at: new Date().toISOString(),
                result: result
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error || 'Processing failed',
                filtered: result.filtered,
                reason: result.reason,
                post_id: post_id
            });
        }

    } catch (error) {
        console.error('Manual Instagram posting error:', error);
        res.status(500).json({
            error: 'Failed to process Instagram post',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /manual
 * Simple web interface for manual Instagram posting
 * Provides a form for easy manual post submission
 */
router.get('/manual', (req, res) => {
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GrowmiesNJ Instagram Manual Posting</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }
            .container {
                background: white;
                padding: 30px;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            }
            h1 {
                color: #e1306c;
                text-align: center;
                margin-bottom: 30px;
                font-size: 2em;
            }
            .subtitle {
                text-align: center;
                color: #666;
                margin-bottom: 30px;
                font-size: 1.1em;
            }
            .form-group {
                margin-bottom: 20px;
            }
            label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
                color: #333;
            }
            input, textarea, select {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 16px;
                transition: border-color 0.3s;
                box-sizing: border-box;
            }
            input:focus, textarea:focus, select:focus {
                outline: none;
                border-color: #e1306c;
            }
            textarea {
                min-height: 120px;
                resize: vertical;
            }
            button {
                background: linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%);
                color: white;
                padding: 15px 30px;
                border: none;
                border-radius: 8px;
                font-size: 18px;
                font-weight: 600;
                cursor: pointer;
                width: 100%;
                transition: transform 0.2s;
            }
            button:hover {
                transform: translateY(-2px);
            }
            button:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }
            .help-text {
                font-size: 14px;
                color: #666;
                margin-top: 5px;
            }
            .instagram-icon {
                color: #e1306c;
                font-size: 1.2em;
                margin-right: 8px;
            }
            .result {
                margin-top: 20px;
                padding: 15px;
                border-radius: 8px;
                display: none;
            }
            .success {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }
            .error {
                background: #f8d7da;
                border: 1px solid #f5c6cb;
                color: #721c24;
            }
            .loading {
                text-align: center;
                color: #666;
                margin-top: 20px;
                display: none;
            }
            .features {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin-bottom: 30px;
                border-left: 4px solid #e1306c;
            }
            .features h3 {
                margin: 0 0 15px 0;
                color: #333;
            }
            .features ul {
                margin: 0;
                padding-left: 20px;
            }
            .features li {
                margin-bottom: 8px;
                color: #555;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1><span class="instagram-icon">📸</span>GrowmiesNJ Instagram Manual Posting</h1>
            <p class="subtitle">Free solution for posting Instagram content to Discord</p>
            
            <div class="features">
                <h3>🌟 Features</h3>
                <ul>
                    <li>✅ Completely free - no paid RSS services required</li>
                    <li>✅ Full content moderation and age verification</li>
                    <li>✅ Instagram-styled Discord embeds</li>
                    <li>✅ Support for images, videos, and carousels</li>
                    <li>✅ Hashtag filtering for cannabis compliance</li>
                </ul>
            </div>
            
            <form id="postForm">
                <div class="form-group">
                    <label for="instagram_url">📱 Instagram Post URL *</label>
                    <input type="url" id="instagram_url" name="instagram_url" required
                           placeholder="https://www.instagram.com/p/POST_ID/">
                    <div class="help-text">Copy the URL from your @growmiesnj Instagram post</div>
                </div>

                <div class="form-group">
                    <label for="caption">📝 Caption *</label>
                    <textarea id="caption" name="caption" required
                              placeholder="Enter your Instagram caption here..."></textarea>
                    <div class="help-text">The full caption text from your Instagram post</div>
                </div>

                <div class="form-group">
                    <label for="image_url">🖼️ Image URL (optional)</label>
                    <input type="url" id="image_url" name="image_url"
                           placeholder="https://example.com/image.jpg">
                    <div class="help-text">Direct link to the image file (right-click on Instagram image → Copy Image Address)</div>
                </div>

                <div class="form-group">
                    <label for="video_url">🎥 Video URL (optional)</label>
                    <input type="url" id="video_url" name="video_url"
                           placeholder="https://example.com/video.mp4">
                    <div class="help-text">Direct link to the video file</div>
                </div>

                <div class="form-group">
                    <label for="post_type">📂 Post Type</label>
                    <select id="post_type" name="post_type">
                        <option value="image">📸 Image</option>
                        <option value="video">🎬 Video</option>
                        <option value="carousel">🎠 Carousel</option>
                    </select>
                </div>

                <button type="submit" id="submitBtn">🚀 Post to Discord</button>
            </form>

            <div id="loading" class="loading">
                <p>⏳ Processing your Instagram post...</p>
            </div>

            <div id="result" class="result"></div>
        </div>

        <script>
            document.getElementById('postForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                
                const resultDiv = document.getElementById('result');
                const loadingDiv = document.getElementById('loading');
                const submitBtn = document.getElementById('submitBtn');
                
                // Hide result and show loading
                resultDiv.style.display = 'none';
                loadingDiv.style.display = 'block';
                submitBtn.disabled = true;
                
                try {
                    const response = await fetch('/instagram/manual', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(data)
                    });
                    
                    const result = await response.json();
                    
                    loadingDiv.style.display = 'none';
                    
                    if (response.ok && result.success) {
                        resultDiv.className = 'result success';
                        resultDiv.innerHTML = '✅ <strong>Success!</strong> Your Instagram post has been sent to Discord. Check your server channels!';
                        
                        // Clear form on success
                        document.getElementById('postForm').reset();
                    } else {
                        resultDiv.className = 'result error';
                        let errorMsg = '❌ <strong>Error:</strong> ';
                        if (result.filtered) {
                            errorMsg += 'Post was filtered: ' + (result.reason || 'Content moderation applied');
                        } else {
                            errorMsg += (result.error || result.message || 'Unknown error occurred');
                        }
                        resultDiv.innerHTML = errorMsg;
                    }
                } catch (error) {
                    loadingDiv.style.display = 'none';
                    resultDiv.className = 'result error';
                    resultDiv.innerHTML = '❌ <strong>Network error:</strong> ' + error.message;
                }
                
                resultDiv.style.display = 'block';
                submitBtn.disabled = false;
            });
        </script>
    </body>
    </html>
    `;
    
    res.send(html);
});

module.exports = router;