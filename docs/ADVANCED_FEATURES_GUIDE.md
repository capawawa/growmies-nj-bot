# Advanced Features Guide - GrowmiesNJ Discord Bot

## 🚀 Overview

The GrowmiesNJ Discord Bot includes three major advanced feature systems designed to enhance your cannabis community experience while maintaining strict compliance with New Jersey cannabis laws. All features integrate seamlessly with age verification (21+) requirements and provide educational, engaging content for our community.

## 🎵 Music Bot System

### What It Does
A comprehensive audio streaming system with cannabis-specific features, voice channel integration, and interactive controls.

**Key Features:**
- **YouTube Audio Streaming**: Play music, podcasts, and educational content
- **Cannabis Meditation Sessions**: Guided meditation with strain-specific focus (21+ only)
- **Educational Podcasts**: Cannabis science and cultivation content (21+ only)
- **Queue Management**: Advanced queue system with voting and controls
- **Interactive Controls**: Button-based playback management
- **User Preferences**: Personalized volume and content settings

**Age Verification Required For:**
- Cannabis meditation sessions
- Educational cannabis podcasts
- Strain-specific content

### Getting Started
1. Join a voice channel
2. Use [`/play`](src/commands/music/play.js:118) to start streaming music
3. For cannabis content, ensure you're 21+ verified with [`/verify`](src/utils/ageVerificationHelper.js:91)
4. Explore meditation with [`/meditation`](src/commands/music/meditation.js:169) (21+ only)

### Available Commands
- **[`/play`](src/commands/music/play.js:118)** - Play music from YouTube search or URL
- **[`/stop`](src/commands/music/stop.js:125)** - Stop playback and clear queue
- **[`/queue`](src/commands/music/queue.js:131)** - View current music queue
- **[`/skip`](src/commands/music/skip.js:137)** - Skip current track with voting system
- **[`/pause`](src/commands/music/pause.js:144)** - Pause/resume playback
- **[`/volume`](src/commands/music/volume.js:152)** - Control audio volume
- **[`/nowplaying`](src/commands/music/nowplaying.js:161)** - Show current track info
- **[`/meditation`](src/commands/music/meditation.js:169)** - Cannabis meditation sessions (21+ only)
- **[`/podcast`](src/commands/music/podcast.js:176)** - Educational podcasts (21+ only)

## 🤖 LLM Chat Integration

### What It Does
AI-powered cannabis knowledge assistant with OpenAI integration, providing educational information while maintaining compliance with cannabis laws.

**Key Features:**
- **Cannabis Education**: Strain information, growing tips, legal guidance
- **Conversation Memory**: Contextual conversations that remember your discussion
- **Age Verification Integration**: Automatic 21+ verification for cannabis content
- **Content Filtering**: Compliance-filtered responses for legal safety
- **Multiple Interaction Types**: One-off questions, ongoing chats, specialized advice

**Age Verification Required For:**
- Cannabis strain information
- Growing and cultivation advice
- Cannabis legal discussions
- Medical cannabis information

### Getting Started
1. Ensure you're 21+ verified for cannabis content with [`/verify`](src/utils/ageVerificationHelper.js:91)
2. Start with [`/ask`](src/commands/ai/ask.js:46) for quick questions
3. Use [`/chat`](src/commands/ai/chat.js:52) for ongoing conversations
4. Try specialized commands for detailed advice

### Available Commands
- **[`/ask`](src/commands/ai/ask.js:46)** - Ask the AI assistant one-off questions
- **[`/chat`](src/commands/ai/chat.js:52)** - Have conversations with context memory
- **[`/strain-advice`](src/commands/ai/strain-advice.js:53)** - Cannabis strain information (21+ only)
- **[`/grow-tips`](src/commands/ai/grow-tips.js:65)** - Cultivation advice (21+ only)
- **[`/legal-info`](src/commands/ai/legal-info.js)** - Cannabis legal guidance (21+ only)
- **[`/clear-context`](src/commands/ai/clear-context.js)** - Reset conversation memory

## 💰 Economy System

### What It Does
A comprehensive virtual currency system with two currencies: GrowCoins (primary) and Premium Seeds (21+ only), featuring shops, jobs, gifting, and item collection.

**Key Features:**
- **Dual Currency System**: GrowCoins for everyone, Premium Seeds for 21+ verified users
- **Daily Rewards**: Streak-based daily bonuses with increasing rewards
- **Work Activities**: Various jobs including cannabis-themed work (21+ only)
- **Community Shop**: Purchase tools, decorations, collectibles, and more
- **Gift System**: Send currency to other community members
- **Inventory Management**: Collect, equip, and manage virtual items

**Age Verification Required For:**
- Premium Seeds currency
- Cannabis-specific shop items
- Cannabis-themed work activities
- Strain collectibles and premium content

### Getting Started
1. Claim your first reward with [`/daily`](src/commands/economy/daily.js:25)
2. Check your balance with [`/balance`](src/commands/economy/balance.js:25)
3. Earn more with [`/work`](src/commands/economy/work.js:25)
4. Shop for items with [`/shop`](src/commands/economy/shop.js:40)
5. For Premium Seeds, get 21+ verified with [`/verify`](src/utils/ageVerificationHelper.js:91)

### Available Commands
- **[`/balance`](src/commands/economy/balance.js:25)** - Check your GrowCoins and Premium Seeds
- **[`/daily`](src/commands/economy/daily.js:25)** - Claim daily rewards and build streaks
- **[`/work`](src/commands/economy/work.js:25)** - Work various jobs to earn currency
- **[`/shop`](src/commands/economy/shop.js:40)** - Browse and purchase items
- **[`/inventory`](src/commands/economy/inventory.js:45)** - View and manage your items
- **[`/gift`](src/commands/economy/gift.js:48)** - Send currency to other users
- **[`/leaderboard`](src/commands/economy/leaderboard.js)** - View community rankings

## 🔒 Cannabis Compliance & Age Verification

### Why Age Verification is Required

**New Jersey Cannabis Law Compliance:**
- Cannabis content requires 21+ verification per NJ state law
- Educational content about cultivation, strains, and effects is age-restricted
- Premium features and currency (Premium Seeds) are 21+ only
- Community safety and legal compliance are top priorities

### What Requires 21+ Verification

**Music Bot:**
- Cannabis meditation sessions
- Educational cannabis podcasts
- Strain-specific audio content

**AI Chat:**
- Strain information and advice
- Growing and cultivation tips
- Cannabis legal discussions
- Medical cannabis information

**Economy System:**
- Premium Seeds currency
- Cannabis collectibles and strain cards
- Cannabis-themed work activities
- Premium shop items

### How to Get Verified
1. Contact a server moderator or administrator
2. Provide age verification documentation
3. Receive the "21+ Verified" role
4. Access all premium cannabis features

## 🌿 Feature Integration Benefits

### Cross-System Rewards
- **AI Education + Economy**: Learn about cannabis to earn bonus rewards
- **Music Participation + XP**: Listening sessions provide experience points
- **Community Engagement**: All features contribute to your server ranking

### Unified Age Verification
- Single verification process unlocks all premium features
- Consistent compliance across all systems
- Enhanced safety for the community

### Cannabis Education Focus
- All features prioritize education over recreation
- Legal compliance information integrated throughout
- Responsible use messaging and disclaimers

## 📚 Getting Help

### Documentation Navigation
- **[Music Bot User Guide](docs/USER_GUIDES/MUSIC_BOT_GUIDE.md)** - Detailed music system instructions
- **[AI Chat User Guide](docs/USER_GUIDES/AI_CHAT_GUIDE.md)** - Complete AI assistant documentation
- **[Economy User Guide](docs/USER_GUIDES/ECONOMY_GUIDE.md)** - Full economy system guide
- **[Advanced Features Setup](docs/ADVANCED_FEATURES_SETUP.md)** - Administrator setup guide
- **[Admin Commands Reference](docs/ADMIN_COMMANDS_REFERENCE.md)** - Administrative command documentation

### Support Channels
- **Community Help**: Ask questions in general channels
- **Staff Support**: Contact moderators for verification or technical issues
- **Feature Requests**: Use [`/suggest`](src/commands/engagement/suggest.js:19) for improvements

### Important Legal Disclaimers

**⚠️ Please Remember:**
- All cannabis content is for educational purposes only
- Follow all New Jersey state and local cannabis laws
- This is not medical advice - consult healthcare professionals
- Be responsible and prioritize community safety
- Age verification is required for legal compliance

---

**Last Updated**: January 2024  
**Documentation Version**: 1.0.0  
**Bot Version**: Advanced Features Release

For technical support or questions about these features, please contact the GrowmiesNJ staff team.