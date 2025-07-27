/**
 * Music Helper Utilities for GrowmiesNJ Discord Bot
 * 
 * Comprehensive utilities for music bot operations including:
 * - YouTube URL validation and processing
 * - Audio format handling and validation
 * - Cannabis content filtering and detection
 * - Duration formatting and parsing
 * - Search result processing
 * - Audio quality optimization
 */

const ytdl = require('ytdl-core');
const ytsr = require('ytsr');
const { URL } = require('url');

/**
 * YouTube and URL validation utilities
 */
class YouTubeHelper {
  /**
   * Validate if a URL is a valid YouTube URL
   * @param {string} url - URL to validate
   * @returns {Object} Validation result with type and video ID
   */
  static validateYouTubeURL(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Check for various YouTube domains
      const youtubeHosts = [
        'youtube.com',
        'www.youtube.com',
        'youtu.be',
        'm.youtube.com',
        'music.youtube.com'
      ];

      if (!youtubeHosts.includes(hostname)) {
        return { valid: false, reason: 'Not a YouTube URL' };
      }

      // Extract video ID
      let videoId = null;
      
      if (hostname === 'youtu.be') {
        // Short URL format: https://youtu.be/VIDEO_ID
        videoId = urlObj.pathname.slice(1);
      } else {
        // Standard URL format: https://youtube.com/watch?v=VIDEO_ID
        videoId = urlObj.searchParams.get('v');
      }

      if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return { valid: false, reason: 'Invalid YouTube video ID' };
      }

      return {
        valid: true,
        videoId: videoId,
        originalUrl: url,
        type: 'youtube'
      };

    } catch (error) {
      return { valid: false, reason: 'Invalid URL format' };
    }
  }

  /**
   * Get YouTube video information
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Video information object
   */
  static async getVideoInfo(videoId) {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await ytdl.getInfo(url);
      
      const videoDetails = info.videoDetails;
      
      return {
        success: true,
        video: {
          id: videoId,
          title: videoDetails.title,
          description: videoDetails.description,
          duration: parseInt(videoDetails.lengthSeconds),
          thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url,
          author: videoDetails.author.name,
          viewCount: parseInt(videoDetails.viewCount),
          uploadDate: videoDetails.uploadDate,
          keywords: videoDetails.keywords || [],
          category: videoDetails.category,
          url: url,
          isLiveContent: videoDetails.isLiveContent,
          ageRestricted: videoDetails.age_restricted
        }
      };
    } catch (error) {
      console.error('Error getting YouTube video info:', error);
      return {
        success: false,
        error: 'Failed to retrieve video information'
      };
    }
  }

  /**
   * Search YouTube for videos
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} Search results
   */
  static async searchYouTube(query, options = {}) {
    try {
      const searchOptions = {
        limit: options.limit || 10,
        safeSearch: options.safeSearch !== false, // Default to safe search on
        ...options
      };

      const searchResults = await ytsr(query, searchOptions);
      
      // Filter only video results
      const videos = searchResults.items
        .filter(item => item.type === 'video')
        .map(video => ({
          id: video.id,
          title: video.title,
          description: video.description,
          duration: this.parseDuration(video.duration),
          thumbnail: video.bestThumbnail?.url,
          author: video.author?.name,
          views: video.views,
          uploadedAt: video.uploadedAt,
          url: video.url,
          isLive: video.isLive
        }));

      return {
        success: true,
        results: videos,
        query: query,
        totalResults: searchResults.estimatedResults
      };

    } catch (error) {
      console.error('Error searching YouTube:', error);
      return {
        success: false,
        error: 'YouTube search failed'
      };
    }
  }

  /**
   * Parse YouTube duration string to seconds
   * @param {string} duration - Duration string (e.g., "3:45" or "1:23:45")
   * @returns {number} Duration in seconds
   */
  static parseDuration(duration) {
    if (!duration || typeof duration !== 'string') return 0;
    
    const parts = duration.split(':').reverse();
    let seconds = 0;
    
    for (let i = 0; i < parts.length; i++) {
      const value = parseInt(parts[i]) || 0;
      seconds += value * Math.pow(60, i);
    }
    
    return seconds;
  }

  /**
   * Get best audio format for streaming
   * @param {string} videoId - YouTube video ID
   * @returns {Promise<Object>} Best audio format info
   */
  static async getBestAudioFormat(videoId) {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await ytdl.getInfo(url);
      
      // Get audio-only formats
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      
      if (audioFormats.length === 0) {
        return {
          success: false,
          error: 'No audio formats available'
        };
      }

      // Sort by quality (bitrate) and prefer opus codec
      const bestFormat = audioFormats.sort((a, b) => {
        // Prefer opus codec
        if (a.codecs === 'opus' && b.codecs !== 'opus') return -1;
        if (b.codecs === 'opus' && a.codecs !== 'opus') return 1;
        
        // Then by bitrate
        return (b.audioBitrate || 0) - (a.audioBitrate || 0);
      })[0];

      return {
        success: true,
        format: {
          itag: bestFormat.itag,
          url: bestFormat.url,
          codec: bestFormat.codecs,
          bitrate: bestFormat.audioBitrate,
          sampleRate: bestFormat.audioSampleRate,
          container: bestFormat.container
        }
      };

    } catch (error) {
      console.error('Error getting audio format:', error);
      return {
        success: false,
        error: 'Failed to get audio format'
      };
    }
  }
}

/**
 * Cannabis content detection and filtering utilities
 */
class CannabisContentFilter {
  /**
   * Cannabis-related keywords for content detection
   */
  static get CANNABIS_KEYWORDS() {
    return {
      // Primary cannabis terms
      primary: [
        'cannabis', 'marijuana', 'weed', 'ganja', 'herb', 'mary jane',
        'pot', 'dope', 'grass', 'chronic', 'bud', 'flower', 'nug'
      ],
      
      // Consumption methods
      consumption: [
        'smoking', 'vaping', 'edibles', 'dabs', 'concentrate', 'hash',
        'joint', 'blunt', 'pipe', 'bong', 'vaporizer', 'dabbing'
      ],
      
      // Strains and products
      strains: [
        'indica', 'sativa', 'hybrid', 'kush', 'haze', 'diesel',
        'og', 'purple', 'white widow', 'blue dream', 'girl scout cookies'
      ],
      
      // Cannabis compounds
      compounds: [
        'thc', 'cbd', 'cbg', 'cbn', 'terpenes', 'cannabinoids',
        'delta-9', 'delta-8', 'full spectrum', 'isolate'
      ],
      
      // Industry terms
      industry: [
        'dispensary', 'budtender', 'cultivation', 'grow', 'harvest',
        'trim', 'cure', 'medical marijuana', 'recreational cannabis'
      ]
    };
  }

  /**
   * Detect cannabis content in text
   * @param {string} text - Text to analyze
   * @param {Object} options - Detection options
   * @returns {Object} Detection result
   */
  static detectCannabisContent(text, options = {}) {
    if (!text || typeof text !== 'string') {
      return {
        isCannabisContent: false,
        confidence: 0,
        matchedTerms: [],
        categories: []
      };
    }

    const normalizedText = text.toLowerCase();
    const allKeywords = this.CANNABIS_KEYWORDS;
    const matchedTerms = [];
    const categories = [];
    
    // Check each category
    Object.entries(allKeywords).forEach(([category, keywords]) => {
      const categoryMatches = keywords.filter(keyword => 
        normalizedText.includes(keyword.toLowerCase())
      );
      
      if (categoryMatches.length > 0) {
        matchedTerms.push(...categoryMatches);
        categories.push(category);
      }
    });

    // Calculate confidence based on matches
    const uniqueMatches = [...new Set(matchedTerms)];
    const confidence = Math.min(uniqueMatches.length * 0.2, 1.0);
    const isCannabisContent = confidence >= (options.threshold || 0.3);

    return {
      isCannabisContent,
      confidence,
      matchedTerms: uniqueMatches,
      categories,
      requiresAgeVerification: isCannabisContent
    };
  }

  /**
   * Analyze YouTube video for cannabis content
   * @param {Object} videoInfo - Video information object
   * @returns {Object} Cannabis content analysis
   */
  static analyzeVideoForCannabisContent(videoInfo) {
    if (!videoInfo) {
      return {
        isCannabisContent: false,
        confidence: 0,
        analysis: 'No video information provided'
      };
    }

    // Analyze title
    const titleAnalysis = this.detectCannabisContent(videoInfo.title);
    
    // Analyze description (first 500 chars to avoid false positives)
    const descriptionSnippet = videoInfo.description?.substring(0, 500) || '';
    const descriptionAnalysis = this.detectCannabisContent(descriptionSnippet);
    
    // Analyze keywords/tags
    const keywordsText = (videoInfo.keywords || []).join(' ');
    const keywordsAnalysis = this.detectCannabisContent(keywordsText);
    
    // Analyze channel name
    const channelAnalysis = this.detectCannabisContent(videoInfo.author || '');

    // Combine all analyses with weighted importance
    const weights = {
      title: 0.4,
      description: 0.3,
      keywords: 0.2,
      channel: 0.1
    };

    const overallConfidence = 
      (titleAnalysis.confidence * weights.title) +
      (descriptionAnalysis.confidence * weights.description) +
      (keywordsAnalysis.confidence * weights.keywords) +
      (channelAnalysis.confidence * weights.channel);

    const allMatchedTerms = [
      ...titleAnalysis.matchedTerms,
      ...descriptionAnalysis.matchedTerms,
      ...keywordsAnalysis.matchedTerms,
      ...channelAnalysis.matchedTerms
    ];

    const uniqueTerms = [...new Set(allMatchedTerms)];
    const isCannabisContent = overallConfidence >= 0.25;

    return {
      isCannabisContent,
      confidence: overallConfidence,
      matchedTerms: uniqueTerms,
      requiresAgeVerification: isCannabisContent,
      analysis: {
        title: titleAnalysis,
        description: descriptionAnalysis,
        keywords: keywordsAnalysis,
        channel: channelAnalysis
      },
      recommendation: isCannabisContent ? 
        'Age verification required (21+)' : 
        'No age restrictions needed'
    };
  }
}

/**
 * Audio format and quality utilities
 */
class AudioHelper {
  /**
   * Get supported audio formats
   */
  static get SUPPORTED_FORMATS() {
    return {
      preferred: ['opus', 'aac', 'mp3'],
      supported: ['opus', 'aac', 'mp3', 'ogg', 'webm', 'm4a'],
      streaming: ['opus', 'webm', 'ogg'] // Best for real-time streaming
    };
  }

  /**
   * Validate audio format
   * @param {string} format - Audio format to validate
   * @returns {Object} Validation result
   */
  static validateAudioFormat(format) {
    if (!format || typeof format !== 'string') {
      return { valid: false, reason: 'No format specified' };
    }

    const normalizedFormat = format.toLowerCase();
    const supported = this.SUPPORTED_FORMATS.supported;

    if (!supported.includes(normalizedFormat)) {
      return {
        valid: false,
        reason: `Unsupported format: ${format}`,
        supportedFormats: supported
      };
    }

    return {
      valid: true,
      format: normalizedFormat,
      isPreferred: this.SUPPORTED_FORMATS.preferred.includes(normalizedFormat),
      isStreamingOptimized: this.SUPPORTED_FORMATS.streaming.includes(normalizedFormat)
    };
  }

  /**
   * Get optimal audio settings for Discord
   * @param {Object} options - Audio options
   * @returns {Object} Optimal audio settings
   */
  static getOptimalAudioSettings(options = {}) {
    return {
      codec: 'opus', // Discord's preferred codec
      bitrate: options.bitrate || 128, // kbps
      sampleRate: 48000, // Discord's preferred sample rate
      channels: 2, // Stereo
      frameSize: 20, // ms
      packetLoss: 0.01, // 1% expected packet loss
      buffering: {
        initial: 2000, // 2 seconds initial buffer
        target: 5000,  // 5 seconds target buffer
        max: 10000     // 10 seconds max buffer
      }
    };
  }

  /**
   * Estimate audio quality score
   * @param {Object} format - Audio format object
   * @returns {number} Quality score (0-100)
   */
  static calculateQualityScore(format) {
    if (!format) return 0;

    let score = 0;

    // Codec quality (40% weight)
    const codecScores = {
      'opus': 40,
      'aac': 35,
      'mp3': 30,
      'ogg': 25,
      'webm': 20,
      'm4a': 30
    };
    score += codecScores[format.codec] || 10;

    // Bitrate quality (35% weight)
    const bitrate = format.bitrate || 128;
    if (bitrate >= 320) score += 35;
    else if (bitrate >= 256) score += 30;
    else if (bitrate >= 192) score += 25;
    else if (bitrate >= 128) score += 20;
    else score += 10;

    // Sample rate quality (15% weight)
    const sampleRate = format.sampleRate || 44100;
    if (sampleRate >= 48000) score += 15;
    else if (sampleRate >= 44100) score += 12;
    else score += 5;

    // Container/format bonus (10% weight)
    if (format.container === 'webm' || format.container === 'ogg') {
      score += 10; // Better for streaming
    } else if (format.container === 'm4a' || format.container === 'mp4') {
      score += 8;
    } else {
      score += 5;
    }

    return Math.min(score, 100);
  }
}

/**
 * Duration and time formatting utilities
 */
class TimeHelper {
  /**
   * Format seconds to human-readable duration
   * @param {number} seconds - Duration in seconds
   * @param {Object} options - Formatting options
   * @returns {string} Formatted duration
   */
  static formatDuration(seconds, options = {}) {
    if (!seconds || seconds < 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Parse duration string to seconds
   * @param {string} duration - Duration string
   * @returns {number} Duration in seconds
   */
  static parseDuration(duration) {
    if (!duration || typeof duration !== 'string') return 0;

    // Handle various formats
    const timeRegex = /^(?:(\d+):)?(\d+):(\d+)$/; // HH:MM:SS or MM:SS
    const match = duration.match(timeRegex);

    if (match) {
      const [, hours, minutes, seconds] = match;
      return (parseInt(hours) || 0) * 3600 + 
             parseInt(minutes) * 60 + 
             parseInt(seconds);
    }

    // Handle simple number (assume seconds)
    const numericValue = parseFloat(duration);
    if (!isNaN(numericValue)) {
      return Math.floor(numericValue);
    }

    return 0;
  }

  /**
   * Get relative time string
   * @param {Date|string} timestamp - Timestamp to compare
   * @returns {string} Relative time string
   */
  static getRelativeTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  }

  /**
   * Calculate estimated playback time for queue
   * @param {Array} tracks - Array of track objects with duration
   * @returns {Object} Playback time estimation
   */
  static calculateQueuePlaytime(tracks) {
    if (!Array.isArray(tracks) || tracks.length === 0) {
      return {
        totalSeconds: 0,
        totalMinutes: 0,
        totalHours: 0,
        formatted: '0:00',
        estimatedEnd: new Date()
      };
    }

    const totalSeconds = tracks.reduce((sum, track) => {
      return sum + (track.duration || track.track_duration_seconds || 0);
    }, 0);

    const totalMinutes = Math.floor(totalSeconds / 60);
    const totalHours = Math.floor(totalMinutes / 60);
    const estimatedEnd = new Date(Date.now() + (totalSeconds * 1000));

    return {
      totalSeconds,
      totalMinutes,
      totalHours,
      formatted: this.formatDuration(totalSeconds),
      estimatedEnd,
      trackCount: tracks.length
    };
  }
}

/**
 * Search and recommendation utilities
 */
class SearchHelper {
  /**
   * Clean and normalize search query
   * @param {string} query - Raw search query
   * @returns {string} Cleaned query
   */
  static cleanSearchQuery(query) {
    if (!query || typeof query !== 'string') return '';

    return query
      .trim()
      .replace(/[^\w\s-]/g, ' ') // Remove special characters except hyphens
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 200); // Limit length
  }

  /**
   * Generate search suggestions
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Array} Search suggestions
   */
  static generateSearchSuggestions(query, options = {}) {
    const cleanQuery = this.cleanSearchQuery(query);
    if (!cleanQuery) return [];

    const suggestions = [];
    
    // Add variations
    suggestions.push(`${cleanQuery} official audio`);
    suggestions.push(`${cleanQuery} lyrics`);
    suggestions.push(`${cleanQuery} live`);
    suggestions.push(`${cleanQuery} remix`);
    suggestions.push(`${cleanQuery} acoustic`);

    // Add cannabis-specific suggestions if appropriate
    if (options.cannabisContent) {
      suggestions.push(`${cleanQuery} cannabis music`);
      suggestions.push(`${cleanQuery} stoner rock`);
      suggestions.push(`${cleanQuery} meditation music`);
    }

    return suggestions.slice(0, options.limit || 5);
  }

  /**
   * Score search results for relevance
   * @param {Array} results - Search results
   * @param {string} query - Original query
   * @returns {Array} Scored and sorted results
   */
  static scoreSearchResults(results, query) {
    if (!Array.isArray(results) || !query) return results;

    const queryWords = query.toLowerCase().split(' ');
    
    return results.map(result => {
      let score = 0;
      const title = (result.title || '').toLowerCase();
      const description = (result.description || '').toLowerCase();
      const author = (result.author || '').toLowerCase();

      // Title matching (highest weight)
      queryWords.forEach(word => {
        if (title.includes(word)) score += 10;
        if (title.startsWith(word)) score += 5;
      });

      // Author matching
      queryWords.forEach(word => {
        if (author.includes(word)) score += 5;
      });

      // Description matching (lower weight)
      queryWords.forEach(word => {
        if (description.includes(word)) score += 2;
      });

      // Boost for exact title match
      if (title === query.toLowerCase()) score += 20;

      // Duration preference (3-8 minutes ideal for music)
      const duration = result.duration || 0;
      if (duration >= 180 && duration <= 480) score += 3;

      // View count consideration (logarithmic)
      if (result.views) {
        score += Math.log10(result.views) * 0.5;
      }

      return { ...result, relevanceScore: score };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

// Export all helper classes
module.exports = {
  YouTubeHelper,
  CannabisContentFilter,
  AudioHelper,
  TimeHelper,
  SearchHelper
};