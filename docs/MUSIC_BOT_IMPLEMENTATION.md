# Music Bot System Implementation - GrowmiesNJ Discord Bot

## Overview

This document provides comprehensive documentation for the Music Bot System implementation within the GrowmiesNJ Discord Bot. The system includes cannabis-specific features, age verification integration, and full Discord voice functionality.

## 🎵 Features Implemented

### Core Music Features
- **Voice Channel Integration**: Full Discord voice connection management
- **YouTube Audio Streaming**: Real-time audio streaming from YouTube
- **Queue Management**: Advanced queue system with position tracking
- **Playback Controls**: Play, pause, stop, skip, volume control
- **Interactive Controls**: Button-based controls for easy interaction

### Cannabis-Specific Features (21+ Only)
- **Meditation Sessions**: Guided cannabis meditation with various types
- **Educational Podcasts**: Cannabis education content library
- **Content Filtering**: Automatic cannabis content detection
- **Age Verification**: Required 21+ verification for cannabis features

### Advanced Features
- **User Preferences**: Volume, genre, and content preferences
- **Session Types**: General, meditation, and educational sessions
- **XP Integration**: Engagement rewards for music activities
- **Progress Tracking**: Session statistics and listening history

## 📁 File Structure

```
src/
├── commands/music/
│   ├── play.js          # Main play command with YouTube search
│   ├── stop.js          # Stop playback and session management
│   ├── queue.js         # Queue display and management
│   ├── skip.js          # Skip with voting system
│   ├── pause.js         # Pause/resume controls
│   ├── volume.js        # Volume control system
│   ├── nowplaying.js    # Current track display
│   ├── meditation.js    # Cannabis meditation sessions (21+)
│   └── podcast.js       # Educational cannabis podcasts (21+)
├── database/models/
│   ├── MusicSession.js  # Session tracking model
│   ├── MusicQueue.js    # Queue management model
│   └── UserMusicPreferences.js # User preference model
├── services/
│   └── musicService.js  # Core music service
├── utils/
│   ├── musicHelpers.js  # YouTube, audio, and search utilities
│   ├── ageVerification.js # 21+ verification system
│   └── musicButtonHandlers.js # Interactive button handlers
└── tests/music/
    └── musicBot.integration.test.js # Comprehensive tests
```

## 🗄️ Database Schema

### MusicSession Model
```sql
CREATE TABLE music_sessions (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    voice_channel_id VARCHAR(20) NOT NULL,
    session_type VARCHAR(20) DEFAULT 'general',
    is_cannabis_content BOOLEAN DEFAULT FALSE,
    started_by_user_id VARCHAR(20) NOT NULL,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    total_duration_seconds INTEGER DEFAULT 0,
    session_metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### MusicQueue Model
```sql
CREATE TABLE music_queues (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES music_sessions(id),
    track_url VARCHAR(500) NOT NULL,
    track_title VARCHAR(200) NOT NULL,
    track_artist VARCHAR(200),
    track_duration_seconds INTEGER,
    track_thumbnail_url VARCHAR(500),
    track_source VARCHAR(50) DEFAULT 'youtube',
    requested_by_user_id VARCHAR(20) NOT NULL,
    position_in_queue INTEGER NOT NULL,
    played_at TIMESTAMP,
    is_cannabis_content BOOLEAN DEFAULT FALSE,
    loop_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### UserMusicPreferences Model
```sql
CREATE TABLE user_music_preferences (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    guild_id VARCHAR(20) NOT NULL,
    preferred_volume INTEGER DEFAULT 50,
    cannabis_music_enabled BOOLEAN DEFAULT FALSE,
    favorite_genres TEXT[],
    auto_queue_enabled BOOLEAN DEFAULT FALSE,
    notification_preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, guild_id)
);
```

## 🎮 Command Usage

### Basic Commands

#### `/play [query] [cannabis_content]`
Plays music from YouTube search or URL.
```
/play query:lo-fi hip hop cannabis_content:false
/play query:https://youtube.com/watch?v=example
```

#### `/stop [reason] [save_queue]`
Stops playback and ends session.
```
/stop reason:break_time save_queue:true
```

#### `/queue show [page]`
Displays current queue with pagination.
```
/queue show page:1
```

#### `/skip [reason] [force]`
Skips current track (voting or force).
```
/skip reason:not_feeling_it
/skip force:true  # Admin only
```

#### `/pause [action]`
Pauses or resumes playback.
```
/pause action:pause
/pause action:resume
/pause action:toggle
```

#### `/volume set [level] [save_preference]`
Controls audio volume.
```
/volume set level:75 save_preference:true
/volume up
/volume down
/volume mute
```

#### `/nowplaying [detailed]`
Shows current track information.
```
/nowplaying detailed:true
```

### Cannabis Features (21+ Only)

#### `/meditation start [type] [duration] [strain_focus]`
Starts guided cannabis meditation.
```
/meditation start type:cannabis_mindfulness duration:15 strain_focus:Blue Dream
/meditation start type:strain_meditation duration:20
```

#### `/podcast play [category] [search] [auto_queue]`
Plays educational cannabis podcasts.
```
/podcast play category:science search:cannabinoids
/podcast play category:medical auto_queue:true
```

## 🛠️ Technical Implementation

### MusicService Core Methods

```javascript
// Voice connection management
async joinVoiceChannel(voiceChannel, options)
async leaveVoiceChannel(guildId)

// Playback control
async playTrack(guildId, trackData)
async pausePlayback(guildId, metadata)
async resumePlayback(guildId, metadata)
async stopPlayback(guildId, metadata)
async skipTrack(guildId, skipData)

// Queue management
async getQueueStatus(guildId)
async addToQueue(sessionId, trackData)
async removeFromQueue(sessionId, position)

// Session management
hasActiveSession(guildId)
async createSession(guildId, sessionData)
async endSession(guildId, endData)
```

### YouTube Integration

```javascript
// URL validation
YouTubeHelper.validateYouTubeURL(url)

// Video information
await YouTubeHelper.getVideoInfo(videoId)

// Search functionality
await YouTubeHelper.searchYouTube(query, options)

// Audio format optimization
await YouTubeHelper.getBestAudioFormat(videoId)
```

### Cannabis Content Detection

```javascript
// Content analysis
CannabisContentFilter.detectCannabisContent(text)
CannabisContentFilter.analyzeVideoForCannabisContent(videoInfo)

// Age verification
await checkAge21Plus(userId, guildId)
requiresAgeVerification(content)
```

## 🔧 Configuration

### Required Environment Variables

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
DISCORD_CLIENT_ID=your_discord_client_id

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/growmies_bot

# Optional: YouTube API (for enhanced features)
YOUTUBE_API_KEY=your_youtube_api_key
```

### Required Dependencies

```json
{
  "dependencies": {
    "@discordjs/voice": "^0.16.1",
    "ytdl-core": "^4.11.5",
    "ytsr": "^3.8.4",
    "ffmpeg-static": "^5.2.0",
    "node-opus": "^0.3.3",
    "libsodium-wrappers": "^0.7.13"
  }
}
```

## 🧪 Testing

### Running Integration Tests

```bash
# Run all music bot tests
npm test -- tests/music/

# Run with coverage
npm run test:coverage -- tests/music/

# Watch mode for development
npm run test:watch -- tests/music/
```

### Test Coverage Areas

- **Database Models**: Session, queue, and preference operations
- **YouTube Integration**: URL validation, search, audio formats
- **Cannabis Content**: Detection algorithms and age verification
- **Command Execution**: All music commands and interactions
- **Button Handlers**: Interactive control functionality
- **Error Handling**: Connection failures, API errors, validation
- **Performance**: Concurrent sessions, large queues
- **Security**: Input sanitization, permission validation

## 🔒 Security & Compliance

### Age Verification (21+ Cannabis Content)
- Required for meditation and podcast features
- Automatic content detection and filtering
- Compliance logging for audit purposes
- Verification expiry and renewal system

### Content Filtering
- Cannabis keyword detection across multiple categories
- Confidence scoring for content classification
- User preference respect and override options
- Safe default settings for unverified users

### Input Validation
- URL sanitization and validation
- Search query cleaning and length limits
- User permission verification
- Rate limiting for API calls

## 🚀 Deployment

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Database**
   ```bash
   npm run migrate
   ```

3. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Deploy Commands**
   ```bash
   npm run deploy
   ```

5. **Start Bot**
   ```bash
   npm start
   ```

### System Requirements

- **Node.js**: 18.0.0 or higher
- **FFmpeg**: Required for audio processing
- **PostgreSQL**: 12.0 or higher
- **Memory**: 512MB minimum, 1GB recommended
- **Network**: Stable internet connection for YouTube streaming

## 📊 Monitoring & Analytics

### Engagement Tracking
- XP rewards for music interactions
- Session duration and frequency tracking
- Popular content and usage patterns
- Cannabis content access analytics (21+ verified)

### Performance Metrics
- Voice connection stability
- Audio streaming quality
- Queue processing efficiency
- Database query performance

### Error Monitoring
- YouTube API failures and fallbacks
- Voice connection issues
- Database transaction failures
- Age verification problems

## 🔮 Future Enhancements

### Planned Features
- **Spotify Integration**: Additional music source
- **Playlist Management**: User-created playlists
- **Voice Commands**: Voice-activated controls
- **AI Recommendations**: Smart music suggestions
- **Advanced Analytics**: Detailed usage insights

### Cannabis-Specific Roadmap
- **Strain-Specific Playlists**: Music matched to strain effects
- **Dosage Timing**: Integration with consumption tracking
- **Medical Cannabis**: Therapeutic music recommendations
- **Community Features**: Shared sessions and reviews

## 🤝 Contributing

### Development Guidelines
1. Follow existing code patterns and structure
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure cannabis compliance features work correctly
5. Test age verification integration thoroughly

### Code Review Checklist
- [ ] Age verification properly implemented
- [ ] Cannabis content detection working
- [ ] Error handling comprehensive
- [ ] Tests cover new functionality
- [ ] Documentation updated
- [ ] Performance considerations addressed

## 📞 Support

For technical support or questions about the music bot implementation:

1. **Check Documentation**: Review this guide and inline code comments
2. **Run Tests**: Execute integration tests to verify functionality
3. **Check Logs**: Review bot logs for error details
4. **Discord Support**: Use bot support channels for user issues

## 📄 License & Legal

This music bot implementation is designed for the GrowmiesNJ cannabis community and includes:

- **Age Verification Compliance**: Meets 21+ requirements for cannabis content
- **Copyright Respect**: Uses YouTube's official APIs and respects content policies
- **Privacy Protection**: Minimal data collection with user consent
- **Legal Compliance**: Adheres to cannabis industry regulations

---

**Implementation Status**: ✅ Complete
**Last Updated**: January 2024
**Version**: 1.0.0