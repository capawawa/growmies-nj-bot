# Economy System User Guide - GrowmiesNJ Discord Bot

## 💰 Overview

The GrowmiesNJ Economy System is a comprehensive virtual currency and marketplace system featuring a dual-currency model with **GrowCoins** for general activities and **Premium Seeds** for exclusive cannabis-related content. The system includes work activities, a virtual shop, inventory management, gifting, and age-gated premium features.

## 🚀 Quick Start

### Getting Started
1. **Automatic Registration**: Your economy profile is created automatically
2. **Check Balance**: Use [`/balance`](../../src/commands/economy/balance.js:39) to see your current funds
3. **Start Earning**: Use [`/work`](../../src/commands/economy/work.js:42) to begin earning GrowCoins
4. **Explore Shop**: Use [`/shop`](../../src/commands/economy/shop.js:45) to see available items

### Example First Steps
```
/balance
/work
/shop category:tools
/buy item:Basic Growing Kit
```

## 💵 Currency System

### Dual Currency Model

**🪙 GrowCoins (Primary Currency)**
- General-purpose virtual currency
- Earned through work activities and daily bonuses
- Used for most shop purchases and activities
- No age restrictions

**🌱 Premium Seeds (Premium Currency)**
- Exclusive currency for cannabis-related content
- Earned through special activities and achievements
- Used for premium shop items and features
- **Requires 21+ age verification** for earning and spending

### Currency Exchange
- **Convert GrowCoins to Premium Seeds**: Premium exchange rates
- **Limited Conversion**: Prevents economy inflation
- **Age Verification Required**: Must be 21+ to handle Premium Seeds

## 💼 Core Economy Commands

### [`/balance`](../../src/commands/economy/balance.js:39) - Check Your Finances
**Purpose**: View your current currency balances and economy statistics

**Usage:**
```
/balance
/balance user:@username
/balance detailed:true
```

**Parameters:**
- `user` (optional): Check another user's balance
- `detailed` (optional): Show detailed economy statistics

**Information Displayed:**
- Current GrowCoins balance
- Premium Seeds balance (if 21+ verified)
- Daily streak information
- Work cooldown status
- Economy level and experience
- Recent transaction history

### [`/work`](../../src/commands/economy/work.js:42) - Earn GrowCoins
**Purpose**: Perform work activities to earn GrowCoins and experience

**Usage:**
```
/work
/work type:growing
/work type:community difficulty:hard
```

**Parameters:**
- `type` (optional): Type of work activity
  - `general`: General community work
  - `growing`: Cannabis cultivation work (21+ required)
  - `education`: Educational content work
  - `community`: Community support work
  - `research`: Cannabis research work (21+ required)
- `difficulty` (optional): Work difficulty level
  - `easy`: Lower rewards, higher success rate
  - `medium`: Balanced rewards and difficulty
  - `hard`: Higher rewards, lower success rate
- `focus` (optional): Specific work focus area

**Work Types Explained:**

**General Community Work:**
- Helping new members
- Moderating discussions
- Creating community content
- Available to all users
- Standard GrowCoins rewards

**Growing Work (21+ Required):**
- Cannabis cultivation activities
- Plant care and monitoring
- Harvest and processing work
- Higher GrowCoins + Premium Seeds rewards
- Age verification required

**Educational Work:**
- Creating educational content
- Researching cannabis topics
- Writing guides and tutorials
- Knowledge sharing activities
- Bonus rewards for quality content

**Community Support Work:**
- Mentoring other growers
- Answering questions
- Providing support and guidance
- Building community connections
- Social rewards and recognition

**Research Work (21+ Required):**
- Cannabis research activities
- Strain analysis and documentation
- Scientific content creation
- Premium Seeds rewards
- Age verification required

**Work Mechanics:**
- **Cooldown Period**: 4-6 hours between work sessions
- **Success Rates**: Based on difficulty and user level
- **Experience Gain**: Increases economy level over time
- **Daily Streaks**: Consecutive work days increase rewards
- **Random Events**: Special bonus opportunities

### [`/daily`](../../src/commands/economy/daily.js:35) - Daily Rewards
**Purpose**: Claim daily GrowCoins bonus and maintain streak

**Usage:**
```
/daily
/daily streak_info:true
```

**Parameters:**
- `streak_info` (optional): View streak statistics and bonuses

**Daily Bonus Features:**
- **Base Daily Reward**: Fixed GrowCoins amount
- **Streak Multipliers**: Increasing rewards for consecutive days
- **Weekly Bonuses**: Special rewards every 7 days
- **Monthly Rewards**: Premium rewards every 30 days
- **Streak Protection**: Grace period for missed days

**Streak Tiers:**
- **Days 1-6**: Base rewards
- **Week 1**: 1.2x multiplier
- **Week 2**: 1.5x multiplier  
- **Week 3**: 1.8x multiplier
- **Month+**: 2.0x multiplier + Premium Seeds (21+ only)

## 🛒 Shop System

### [`/shop`](../../src/commands/economy/shop.js:45) - Browse Marketplace
**Purpose**: Browse and explore available items in the virtual marketplace

**Usage:**
```
/shop
/shop category:seeds
/shop category:equipment currency:premium_seeds
```

**Parameters:**
- `category` (optional): Filter by item category
  - `tools`: Growing tools and equipment
  - `seeds`: Cannabis seeds (21+ required)
  - `nutrients`: Plant nutrients and supplements
  - `equipment`: Advanced growing equipment
  - `books`: Educational books and guides
  - `accessories`: Miscellaneous accessories
  - `premium`: Premium exclusive items (21+ required)
- `currency` (optional): Filter by currency type
  - `growcoins`: Items purchasable with GrowCoins
  - `premium_seeds`: Items requiring Premium Seeds (21+ required)
- `price_range` (optional): Filter by price range
- `available_only` (optional): Show only available items

**Shop Categories Explained:**

**🔧 Tools & Equipment:**
- Basic growing tools
- Measuring instruments
- Hand tools and pruning supplies
- Entry-level equipment
- Paid with GrowCoins

**🌱 Seeds (21+ Required):**
- Cannabis seed varieties
- Strain-specific seeds
- Collectible genetics
- Premium breeding stock
- Paid with Premium Seeds
- Age verification required

**🧪 Nutrients & Supplements:**
- Plant nutrition products
- Growth supplements
- Soil amendments
- pH adjustment supplies
- Mixed currency options

**⚙️ Equipment:**
- Advanced growing systems
- Lighting equipment
- Environmental controls
- Automation systems
- Higher-tier GrowCoins purchases

**📚 Educational Books:**
- Growing guides and manuals
- Cannabis education materials
- Research publications
- Community-created content
- Knowledge-based rewards

**🎁 Premium Exclusives (21+ Required):**
- Limited edition items
- Exclusive cannabis-related products
- VIP access items
- Collector's items
- Premium Seeds required

### [`/buy`](../../src/commands/economy/buy.js:56) - Purchase Items
**Purpose**: Purchase items from the shop using your currencies

**Usage:**
```
/buy item:Basic Growing Kit
/buy item:Blue Dream Seeds quantity:3
/buy item:Premium Nutrients confirm:true
```

**Parameters:**
- `item` (required): Name of the item to purchase (5-100 characters)
- `quantity` (optional): Number of items to buy (default: 1)
- `confirm` (optional): Skip confirmation dialog
- `currency` (optional): Preferred currency if item accepts multiple

**Purchase Process:**
1. **Item Validation**: Confirms item exists and is available
2. **Age Verification**: Checks age requirements for restricted items
3. **Balance Check**: Verifies sufficient funds
4. **Confirmation Dialog**: Shows purchase summary and costs
5. **Transaction Processing**: Completes purchase and updates inventory
6. **Receipt**: Provides transaction confirmation

**Purchase Restrictions:**
- **Age Requirements**: Cannabis items require 21+ verification
- **Stock Limits**: Some items have limited quantities
- **User Limits**: Purchase limits per user for rare items
- **Currency Requirements**: Specific items require specific currencies

### [`/inventory`](../../src/commands/economy/inventory.js:41) - Manage Your Items
**Purpose**: View and manage your purchased items and inventory

**Usage:**
```
/inventory
/inventory category:seeds
/inventory user:@username sort:date_purchased
```

**Parameters:**
- `category` (optional): Filter inventory by category
- `user` (optional): View another user's public inventory
- `sort` (optional): Sort order
  - `name`: Alphabetical by item name
  - `date_purchased`: Most recent first
  - `quantity`: Highest quantity first
  - `value`: Most valuable first
- `show_values` (optional): Display current item values

**Inventory Features:**
- **Item Organization**: Items grouped by category
- **Quantity Tracking**: Shows owned quantities
- **Purchase History**: When and where items were acquired
- **Item Values**: Current market value of items
- **Usage Status**: Shows used/unused items
- **Sharing Options**: Gift or trade certain items

## 🎁 Gifting & Social Features

### [`/gift`](../../src/commands/economy/gift.js:67) - Send Gifts
**Purpose**: Send GrowCoins, Premium Seeds, or items to other users

**Usage:**
```
/gift user:@username amount:100
/gift user:@username amount:5 currency:premium_seeds
/gift user:@username item:Basic Growing Kit message:Welcome to the community!
```

**Parameters:**
- `user` (required): The user to send the gift to
- `amount` (optional): Amount of currency to gift
- `currency` (optional): Type of currency
  - `growcoins`: Send GrowCoins
  - `premium_seeds`: Send Premium Seeds (21+ required)
- `item` (optional): Specific item to gift from inventory
- `message` (optional): Personal message with the gift (up to 200 characters)
- `anonymous` (optional): Send gift anonymously

**Gifting Rules:**
- **Daily Limits**: Maximum gifts per day to prevent abuse
- **Age Restrictions**: Premium Seeds gifts require both users to be 21+
- **Item Restrictions**: Some items cannot be gifted
- **Cooldown Periods**: Prevents spam gifting
- **Tax System**: Small percentage fee on large gifts

**Gift Types:**

**Currency Gifts:**
- GrowCoins: Any amount within daily limits
- Premium Seeds: Requires 21+ verification for both users
- Transaction fees apply to large amounts

**Item Gifts:**
- Inventory items: Gift owned items to others
- Shop purchases: Buy and immediately gift items
- Gift wrapping: Special presentation for gifts

**Anonymous Gifts:**
- Secret admirer gifts
- Community appreciation
- Surprise rewards
- Special event gifts

### [`/leaderboard`](../../src/commands/economy/leaderboard.js:44) - Economy Rankings
**Purpose**: View economy rankings and community statistics

**Usage:**
```
/leaderboard
/leaderboard type:premium_seeds
/leaderboard period:weekly scope:level
```

**Parameters:**
- `type` (optional): Leaderboard category
  - `balance`: Total currency balance
  - `growcoins`: GrowCoins specifically
  - `premium_seeds`: Premium Seeds (21+ users only)
  - `work_streak`: Work activity streaks
  - `level`: Economy experience level
  - `gifts_sent`: Most generous gifters
- `period` (optional): Time period
  - `all_time`: All-time statistics
  - `monthly`: Current month
  - `weekly`: Current week
  - `daily`: Today's activity
- `scope` (optional): Ranking scope
  - `global`: Server-wide rankings
  - `level`: Within your experience level
  - `verified`: Only 21+ verified users (for Premium Seeds)

**Leaderboard Features:**
- **Privacy Options**: Users can opt out of public rankings
- **Multiple Categories**: Different ways to compete and excel
- **Rewards**: Monthly rewards for top performers
- **Achievement Tracking**: Progress toward leaderboard goals

## 📊 Economy Statistics & Progression

### Experience & Levels
**Economy Level System:**
- **Experience Points**: Earned through work and activities
- **Level Benefits**: Higher levels unlock better work opportunities
- **Skill Bonuses**: Increased success rates and rewards
- **Prestige Rewards**: Special items and recognition

**Level Progression:**
- **Levels 1-10**: Beginner tier, basic work options
- **Levels 11-25**: Intermediate tier, better work rewards
- **Levels 26-50**: Advanced tier, premium work opportunities
- **Levels 51+**: Expert tier, exclusive features and bonuses

### Achievement System
**Work Achievements:**
- Work streak milestones
- Total work sessions completed
- Success rate achievements
- Specialty work completions

**Economy Achievements:**
- Currency accumulation milestones
- Shopping achievements
- Gifting milestones
- Community contribution awards

**Premium Achievements (21+ Required):**
- Premium Seeds milestones
- Cannabis work specializations
- Research contributions
- Growing expertise recognition

### Statistics Tracking
**Personal Statistics:**
- Total earnings over time
- Work success rates
- Shopping history and preferences
- Gift giving and receiving history
- Achievement progress

**Community Statistics:**
- Server economy health
- Average user balances
- Popular shop items
- Gift exchange volumes
- Work activity levels

## 🔧 Economy Management Commands

### [`/economy-stats`](../../src/commands/economy/economy-stats.js) - Server Economy Data
**Purpose**: View comprehensive server economy statistics

**Usage:**
```
/economy-stats
/economy-stats period:monthly detailed:true
```

**Displays:**
- Total currency in circulation
- Active users and participation rates
- Popular items and categories
- Gift exchange volumes
- Economy health indicators

### [`/convert`](../../src/commands/economy/convert.js) - Currency Exchange
**Purpose**: Convert GrowCoins to Premium Seeds (21+ required)

**🔞 Age Verification Required**: Must be 21+ verified to access

**Usage:**
```
/convert amount:1000 from:growcoins to:premium_seeds
```

**Exchange Features:**
- **Dynamic Rates**: Exchange rates fluctuate based on market conditions
- **Daily Limits**: Maximum conversion amounts per day
- **Age Verification**: Premium Seeds require 21+ status
- **Transaction Fees**: Small percentage fee on conversions

## 🛠️ Troubleshooting

### Common Issues

**"Economy profile not found"**
- Profiles are created automatically on first command use
- Try using [`/balance`](../../src/commands/economy/balance.js:39) to initialize your profile
- Contact staff if issue persists

**"Work cooldown active"**
- Work has a 4-6 hour cooldown between sessions
- Check [`/balance detailed:true`](../../src/commands/economy/balance.js:39) for cooldown status
- Use other economy features while waiting

**"Insufficient funds for purchase"**
- Check current balance with [`/balance`](../../src/commands/economy/balance.js:39)
- Earn more through [`/work`](../../src/commands/economy/work.js:42) or [`/daily`](../../src/commands/economy/daily.js:35)
- Consider different items or lower quantities

**"Age verification required"**
- Cannabis-related items require 21+ verification
- Contact moderators to complete age verification
- Use general items while waiting for verification

**"Item not found in shop"**
- Check exact item spelling and availability
- Browse [`/shop`](../../src/commands/economy/shop.js:45) for current inventory
- Some items have limited stock or are seasonal

**"Gift failed to send"**
- Verify recipient username
- Check daily gifting limits
- Ensure sufficient balance for gift and fees
- Confirm age requirements for Premium Seeds gifts

### Error Messages

**"Work attempt failed"**
- Random chance of work failure based on difficulty
- Try different work types or easier difficulty
- Level up for better success rates

**"Daily reward already claimed"**
- Daily rewards reset at midnight UTC
- Check current server time
- Streak continues even if you miss the exact 24-hour window

**"Shop item out of stock"**
- Limited quantity items can sell out
- Check back later for restocks
- Consider similar alternative items

### Getting Help
1. Check [`/balance detailed:true`](../../src/commands/economy/balance.js:39) for account status
2. Review this guide for command usage
3. Ask in community channels for help
4. Contact moderators for technical issues
5. Report bugs to server administrators

## 🌿 Cannabis Compliance

### Age Verification Requirements
**Why 21+ Verification is Required:**
- New Jersey cannabis laws require 21+ for cannabis-related content
- Premium Seeds and cannabis items are age-restricted
- Work activities involving cannabis require verification
- Legal compliance protects the community

### What Requires Verification
- **Premium Seeds**: Earning, spending, and gifting Premium Seeds
- **Cannabis Items**: Seeds, cannabis-specific tools, research materials
- **Cannabis Work**: Growing work, research work, cannabis education work
- **Premium Features**: Cannabis-related achievements and leaderboards

### Getting Verified
1. Contact a server moderator or administrator
2. Provide age verification documentation
3. Receive "21+ Verified" role
4. Access all premium economy features

### Content Filtering
- **Automatic Detection**: System identifies cannabis-related content
- **Age Gates**: Age verification checks before access
- **Educational Focus**: All content focused on education and legal compliance
- **Legal Disclaimers**: Appropriate disclaimers in cannabis content

## 💡 Tips & Best Practices

### Maximizing Earnings
- **Maintain Daily Streaks**: Daily rewards compound over time
- **Diversify Work Types**: Different work types offer different rewards
- **Level Up Consistently**: Higher levels unlock better opportunities
- **Participate in Events**: Special events offer bonus rewards

### Smart Shopping
- **Compare Prices**: Check different categories for similar items
- **Watch for Sales**: Special events often include shop discounts
- **Plan Purchases**: Save for premium items rather than impulse buying
- **Check Reviews**: Community feedback helps inform purchases

### Effective Gifting
- **Build Relationships**: Gifting strengthens community bonds
- **Welcome New Members**: Small gifts help newcomers get started
- **Celebrate Achievements**: Recognize community accomplishments
- **Coordinate Group Gifts**: Pool resources for special occasions

### Economy Progression
- **Set Goals**: Work toward specific items or achievement milestones
- **Track Progress**: Monitor statistics to see improvement over time
- **Engage with Community**: Participate in leaderboards and events
- **Share Knowledge**: Help others learn the economy system

## 📚 Related Documentation

- **[Music Bot User Guide](MUSIC_BOT_GUIDE.md)** - Learn about the music streaming system
- **[AI Chat User Guide](AI_CHAT_GUIDE.md)** - Discover the AI assistant features
- **[Advanced Features Guide](../ADVANCED_FEATURES_GUIDE.md)** - Overview of all advanced features
- **[Advanced Features Setup](../ADVANCED_FEATURES_SETUP.md)** - Administrator setup documentation

## ⚠️ Important Legal Information

**Cannabis Compliance Disclaimers:**
- Virtual cannabis items are for educational and entertainment purposes only
- Follow all New Jersey state and local cannabis laws
- Age verification is required for legal compliance
- Virtual items do not represent real cannabis products

**Economy System Disclaimers:**
- Virtual currencies have no real-world monetary value
- Economy system is for community engagement only
- GrowCoins and Premium Seeds cannot be exchanged for real money
- System may be reset or modified as needed for balance

**Privacy Notice:**
- Economy transactions are logged for system integrity
- Leaderboards can be opted out of for privacy
- Age verification status is tracked for compliance
- Follow Discord's privacy policy

---

**Last Updated**: January 2024  
**Documentation Version**: 1.0.0  
**Economy System Version**: Full Implementation

For technical support or questions about the economy system, contact the GrowmiesNJ staff team or ask in the community channels.