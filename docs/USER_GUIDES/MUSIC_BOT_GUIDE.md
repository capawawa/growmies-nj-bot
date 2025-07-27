# Music Bot User Guide - GrowmiesNJ Discord Bot

## 🎵 Overview

The GrowmiesNJ Music Bot provides a comprehensive audio streaming experience with special cannabis-focused features for age-verified users. Stream music from YouTube, enjoy guided meditation sessions, and listen to educational cannabis podcasts while maintaining full compliance with New Jersey cannabis laws.

## 🚀 Quick Start

### Basic Setup
1. **Join a Voice Channel**: You must be in a voice channel to use music commands
2. **Start Playing Music**: Use [`/play`](../../src/commands/music/play.js:118) with a song name or YouTube URL
3. **For Cannabis Content**: Ensure you're 21+ verified with `/verify` to access meditation and podcasts

### Example First Use
```
/play query:lofi hip hop beats to study to
```

## 🎮 Core Music Commands

### [`/play`](../../src/commands/music/play.js:118) - Play Music
**Purpose**: Stream audio from YouTube search or direct URL

**Basic Usage:**
```
/play query:your search term
/play query:https://youtube.com/watch?v=example
```

**Parameters:**
- `query` (required): Song name, artist, or YouTube URL
- `cannabis_content` (optional): Set to `true` for cannabis-specific content (21+ only)

**Examples:**
```
/play query:Pink Floyd Dark Side of the Moon
/play query:meditation music for relaxation
/play query:https://youtube.com/watch?v=dQw4w9WgXcQ cannabis_content:false
```

**Cannabis Content Examples (21+ Verified Only):**
```
/play query:cannabis growing podcast cannabis_content:true
/play query:strain review blue dream cannabis_content:true
```

### [`/stop`](../../src/commands/music/stop.js:125) - Stop Playback
**Purpose**: Stop current playback and end the music session

**Usage:**
```
/stop
/stop reason:taking a break save_queue:true
```

**Parameters:**
- `reason` (optional): Why you're stopping (for logging)
- `save_queue` (optional): Save current queue for later (future feature)

### [`/queue`](../../src/commands/music/queue.js:131) - View Queue
**Purpose**: Display the current music queue with track information

**Usage:**
```
/queue show
/queue show page:2
```

**Parameters:**
- `page` (optional): View specific page of queue (default: 1)

**Queue Display Includes:**
- Current track with progress
- Upcoming tracks with position
- Track duration and requester
- Queue statistics

### [`/skip`](../../src/commands/music/skip.js:137) - Skip Track
**Purpose**: Skip the current track with optional voting system

**Usage:**
```
/skip
/skip reason:not my vibe
/skip force:true
```

**Parameters:**
- `reason` (optional): Why you're skipping
- `force` (optional): Admin-only force skip without voting

**Skip Voting:**
- Community members vote on skips
- Majority vote required (>50%)
- Admins can force skip without voting

### [`/pause`](../../src/commands/music/pause.js:144) - Pause/Resume
**Purpose**: Pause or resume current playback

**Usage:**
```
/pause action:pause
/pause action:resume
/pause action:toggle
```

**Parameters:**
- `action` (required): `pause`, `resume`, or `toggle`

### [`/volume`](../../src/commands/music/volume.js:152) - Volume Control
**Purpose**: Adjust playback volume and save preferences

**Usage:**
```
/volume set level:75
/volume up
/volume down
/volume mute
```

**Parameters (for `set`):**
- `level` (required): Volume level 0-100
- `save_preference` (optional): Save as your default volume

**Quick Actions:**
- `up`: Increase by 10%
- `down`: Decrease by 10%
- `mute`: Set to 0%

### [`/nowplaying`](../../src/commands/music/nowplaying.js:161) - Current Track
**Purpose**: Display detailed information about the current track

**Usage:**
```
/nowplaying
/nowplaying detailed:true
```

**Parameters:**
- `detailed` (optional): Show extended track information

**Information Displayed:**
- Track title and artist
- Duration and progress
- Requester information
- Queue position
- Cannabis content status (if applicable)

## 🌿 Cannabis Features (21+ Only)

### [`/meditation`](../../src/commands/music/meditation.js:169) - Cannabis Meditation
**Purpose**: Guided meditation sessions with cannabis-specific themes

**🔞 Age Verification Required**: Must be 21+ verified to access

**Usage:**
```
/meditation start type:cannabis_mindfulness duration:15
/meditation start type:strain_meditation duration:20 strain_focus:Blue Dream
```

**Parameters:**
- `type` (required): Type of meditation session
  - `cannabis_mindfulness`: General cannabis mindfulness
  - `strain_meditation`: Strain-specific meditation
  - `anxiety_relief`: Cannabis for anxiety relief
  - `pain_management`: Medical cannabis meditation
  - `sleep_preparation`: Cannabis sleep aid meditation
- `duration` (optional): Session length in minutes (5-60)
- `strain_focus` (optional): Specific strain to focus on

**Meditation Types:**

**Cannabis Mindfulness:**
- General mindfulness with cannabis themes
- Breathing exercises for cannabis users
- Present-moment awareness with cannabis

**Strain Meditation:**
- Meditation tailored to strain effects
- Focus on specific strain characteristics
- Enhanced by strain-specific guidance

**Anxiety Relief:**
- Cannabis-assisted anxiety reduction
- Calming techniques for cannabis users
- Stress relief with cannabis integration

**Pain Management:**
- Medical cannabis meditation
- Pain relief visualization
- Cannabis for chronic pain support

**Sleep Preparation:**
- Cannabis sleep aid meditation
- Evening wind-down sessions
- Sleep hygiene with cannabis

### [`/podcast`](../../src/commands/music/podcast.js:176) - Educational Podcasts
**Purpose**: Educational cannabis podcasts for learning and awareness

**🔞 Age Verification Required**: Must be 21+ verified to access

**Usage:**
```
/podcast play category:science
/podcast play category:medical search:CBD research
/podcast play category:legal auto_queue:true
```

**Parameters:**
- `category` (required): Podcast category
  - `science`: Cannabis science and research
  - `medical`: Medical cannabis information
  - `legal`: Cannabis law and regulations
  - `cultivation`: Growing and cultivation
  - `industry`: Cannabis industry news
  - `history`: Cannabis history and culture
- `search` (optional): Specific topic to search for
- `auto_queue` (optional): Automatically queue related episodes

**Podcast Categories:**

**Science & Research:**
- Cannabinoid research and studies
- Cannabis medical research
- Scientific breakthroughs
- Terpene profiles and effects

**Medical Cannabis:**
- Medical marijuana programs
- Patient experiences and testimonials
- Healthcare provider perspectives
- Treatment protocols and dosing

**Legal & Regulations:**
- New Jersey cannabis laws
- Compliance and licensing
- Legal updates and changes
- Patient rights and protections

**Cultivation & Growing:**
- Growing techniques and tips
- Equipment and setup guides
- Strain development and breeding
- Harvest and processing methods

**Industry News:**
- Cannabis business developments
- Market trends and analysis
- New product launches
- Industry interviews

**History & Culture:**
- Cannabis history and prohibition
- Cultural impact and social justice
- Cannabis activism and reform
- Global cannabis perspectives

## 🎛️ Interactive Controls

### Button Controls
When music is playing, interactive buttons appear for easy control:

- **⏸️ Pause/Resume**: Toggle playback
- **⏭️ Skip**: Skip current track
- **🔇 Mute**: Mute/unmute volume
- **📋 Queue**: View current queue
- **⚙️ Settings**: Access user preferences

### Voice Channel Features
- **Auto-Join**: Bot joins your voice channel when you start music
- **Auto-Leave**: Bot leaves when everyone disconnects
- **Channel Switching**: Move the bot by using commands from different channels
- **Permission Respect**: Bot respects voice channel permissions

## ⚙️ User Preferences

### Volume Preferences
- Set default volume level (0-100%)
- Save per-server volume settings
- Quick volume shortcuts (up/down/mute)

### Cannabis Content Preferences
- Enable/disable cannabis content filtering
- Set default meditation types
- Preferred podcast categories
- Age verification status display

### Notification Settings
- Queue addition notifications
- Track change announcements
- Cannabis content warnings
- Session start/end messages

## 🔧 Troubleshooting

### Common Issues

**"Bot not joining voice channel"**
- Ensure you're in a voice channel
- Check bot has permission to join your channel
- Try disconnecting and reconnecting to voice

**"No audio playing"**
- Check Discord audio settings
- Verify bot has "Speak" permission
- Try adjusting volume with [`/volume`](../../src/commands/music/volume.js:152)

**"Cannabis content blocked"**
- Ensure you're 21+ age verified
- Contact moderators for verification
- Check you're using cannabis_content:true parameter

**"YouTube video unavailable"**
- Try a different search term
- Check if video is region-restricted
- Use direct YouTube URLs when possible

**"Queue not displaying properly"**
- Try [`/queue show page:1`](../../src/commands/music/queue.js:131)
- Check if queue is empty
- Refresh with `/nowplaying`

### Error Messages

**"Age verification required"**
- Cannabis content requires 21+ verification
- Contact server moderators to verify your age
- Use general music features while waiting

**"Voice channel required"**
- Join a voice channel before using music commands
- Ensure bot can see and join your channel

**"Insufficient permissions"**
- Bot needs Voice permissions in your channel
- Contact server admins to fix permissions

### Getting Help
1. Try the [`/nowplaying`](../../src/commands/music/nowplaying.js:161) command to check status
2. Use [`/queue show`](../../src/commands/music/queue.js:131) to see current queue
3. Check voice channel permissions
4. Ask in community channels for help
5. Contact moderators for technical issues

## 🌿 Cannabis Compliance

### Age Verification Requirements
**Why 21+ Verification is Required:**
- New Jersey cannabis laws require 21+ for cannabis content
- Meditation and podcast features include cannabis-specific content
- Compliance protects the community and maintains legal status
- Educational content about cannabis is age-restricted

### What Requires Verification
- Cannabis meditation sessions ([`/meditation`](../../src/commands/music/meditation.js:169))
- Educational cannabis podcasts ([`/podcast`](../../src/commands/music/podcast.js:176))
- Strain-specific audio content
- Cannabis cultivation content

### Getting Verified
1. Contact a server moderator or administrator
2. Provide age verification documentation
3. Receive "21+ Verified" role
4. Access all cannabis music features

### Compliance Features
- Automatic content filtering for unverified users
- Age warnings on cannabis-related content
- Educational disclaimers on all cannabis features
- Legal compliance logging for audit purposes

## 💡 Tips & Best Practices

### Getting the Best Experience
- **Use Specific Search Terms**: "Pink Floyd The Wall" works better than just "Pink Floyd"
- **Try Different Sources**: If one video doesn't work, try different search terms
- **Build Playlists**: Use the queue system to line up multiple songs
- **Explore Cannabis Content**: If 21+, try meditation and podcast features

### Community Etiquette
- **Respect Others**: Don't skip tracks others are enjoying without good reason
- **Share the Queue**: Let others add songs to the queue
- **Use Appropriate Content**: Keep music community-friendly
- **Report Issues**: Help improve the bot by reporting problems

### Cannabis Features Tips
- **Start with Short Sessions**: Try 5-10 minute meditations first
- **Explore Different Types**: Each meditation type offers unique benefits
- **Listen to Podcasts**: Great way to learn about cannabis while relaxing
- **Respect the Content**: Cannabis features are educational, treat them seriously

## 📚 Related Documentation

- **[AI Chat User Guide](AI_CHAT_GUIDE.md)** - Learn about the AI cannabis knowledge system
- **[Economy User Guide](ECONOMY_GUIDE.md)** - Discover the virtual currency system
- **[Advanced Features Guide](../ADVANCED_FEATURES_GUIDE.md)** - Overview of all advanced features
- **[Advanced Features Setup](../ADVANCED_FEATURES_SETUP.md)** - Administrator setup documentation

## ⚠️ Important Legal Information

**Cannabis Compliance Disclaimers:**
- All cannabis content is for educational purposes only
- Follow all New Jersey state and local cannabis laws
- This is not medical advice - consult healthcare professionals
- Cannabis meditation and podcast content requires 21+ verification
- Use cannabis responsibly and legally

**Music Compliance:**
- Respects YouTube Terms of Service
- No music downloading or copyright infringement
- Educational use only
- Community guidelines apply

---

**Last Updated**: January 2024  
**Documentation Version**: 1.0.0  
**Music Bot Version**: Full Implementation

For technical support or questions about the music bot, contact the GrowmiesNJ staff team or ask in the community channels.