# AI Chat User Guide - GrowmiesNJ Discord Bot

## 🤖 Overview

The GrowmiesNJ AI Chat system provides an intelligent cannabis knowledge assistant powered by OpenAI, offering educational information about cannabis while maintaining strict compliance with New Jersey cannabis laws. The AI assistant can answer questions, provide strain information, offer growing advice, and maintain ongoing conversations with context memory.

## 🚀 Quick Start

### Basic Setup
1. **No Setup Required**: AI chat works immediately for general questions
2. **For Cannabis Content**: Get 21+ age verified with `/verify` to unlock strain and growing advice
3. **Start Simple**: Begin with [`/ask`](../../src/commands/ai/ask.js:46) for quick questions

### Example First Use
```
/ask question:What are the main differences between indica and sativa?
```

## 💬 Core AI Commands

### [`/ask`](../../src/commands/ai/ask.js:46) - One-Off Questions
**Purpose**: Ask the AI assistant individual questions with cannabis compliance

**Basic Usage:**
```
/ask question:your question here
/ask question:What is CBD? type:cannabis_education
```

**Parameters:**
- `question` (required): Your question for the AI assistant (5-2000 characters)
- `type` (optional): Type of question for specialized assistance
  - `general`: General questions
  - `cannabis_education`: Cannabis education (21+ required)
  - `strain_advice`: Strain information (21+ required)
  - `grow_tips`: Growing advice (21+ required)
  - `legal_info`: Legal information (21+ required)
- `private` (optional): Make response private (only you see it)

**Examples:**
```
/ask question:How does the endocannabinoid system work? type:cannabis_education
/ask question:What are terpenes and how do they affect cannabis? private:true
/ask question:Is cannabis legal in New Jersey? type:legal_info
```

### [`/chat`](../../src/commands/ai/chat.js:52) - Conversational AI
**Purpose**: Have ongoing conversations with context memory

**Basic Usage:**
```
/chat message:your message here
/chat message:Tell me more about that strain conversation_type:strain_advice
```

**Parameters:**
- `message` (required): Your message to the AI assistant (3-2000 characters)
- `conversation_type` (optional): Type of conversation
  - `general`: General conversation
  - `cannabis_education`: Cannabis education (21+ required)
  - `strain_advice`: Strain discussion (21+ required)
  - `grow_tips`: Growing discussion (21+ required)
  - `legal_info`: Legal discussion (21+ required)
- `private` (optional): Make conversation private
- `view_context` (optional): View conversation statistics

**Examples:**
```
/chat message:I want to learn about cannabis cultivation conversation_type:grow_tips
/chat message:What can you tell me about Blue Dream strain? conversation_type:strain_advice
/chat view_context:true
```

**Context Features:**
- Remembers previous messages in the conversation
- Maintains context across multiple interactions
- Tracks conversation statistics
- Separate context per channel

## 🌿 Cannabis-Specific Commands (21+ Only)

### [`/strain-advice`](../../src/commands/ai/strain-advice.js:53) - Strain Information
**Purpose**: Get detailed cannabis strain information and advice

**🔞 Age Verification Required**: Must be 21+ verified to access

**Usage:**
```
/strain-advice strain:Blue Dream focus:effects
/strain-advice strain:Sour Diesel focus:growing growing_tips:true
```

**Parameters:**
- `strain` (required): Name of the cannabis strain (2-100 characters)
- `focus` (optional): What aspect you're interested in
  - `general`: General information
  - `effects`: Effects & potency
  - `growing`: Growing information
  - `genetics`: Genetics & lineage
  - `medical`: Medical properties
  - `flavor`: Flavor & aroma
- `growing_tips` (optional): Include cultivation advice
- `private` (optional): Make response private

**Focus Areas Explained:**

**General Information:**
- Overall strain profile
- Balanced information across all aspects
- Good starting point for new strains

**Effects & Potency:**
- THC/CBD content and ratios
- Expected effects and duration
- User experience reports
- Onset time and intensity

**Growing Information:**
- Cultivation difficulty level
- Flowering time and yield
- Optimal growing conditions
- Indoor vs outdoor suitability

**Genetics & Lineage:**
- Parent strains and breeding history
- Genetic characteristics
- Phenotype variations
- Breeder information

**Medical Properties:**
- Potential therapeutic applications
- Terpene profiles and effects
- Medical user experiences
- Dosing considerations

**Flavor & Aroma:**
- Taste profile and characteristics
- Terpene contributions to flavor
- Aroma description
- Consumption method impact

### [`/grow-tips`](../../src/commands/ai/grow-tips.js:65) - Cultivation Advice
**Purpose**: Get AI-powered cannabis cultivation tips and growing advice

**🔞 Age Verification Required**: Must be 21+ verified to access

**Usage:**
```
/grow-tips topic:yellowing leaves on flowering plants grow_stage:flowering
/grow-tips topic:setting up indoor grow room grow_stage:equipment experience_level:beginner
```

**Parameters:**
- `topic` (required): What cultivation topic you need help with (5-200 characters)
- `grow_stage` (optional): Stage of growth
  - `seedling`: Seedling & germination
  - `vegetative`: Vegetative growth
  - `flowering`: Flowering stage
  - `harvest`: Harvest & curing
  - `indoor`: General indoor growing
  - `outdoor`: Outdoor growing
  - `equipment`: Equipment & setup
- `experience_level` (optional): Your growing experience
  - `beginner`: New to growing
  - `intermediate`: Some experience
  - `advanced`: Experienced grower
- `include_troubleshooting` (optional): Include problem-solving advice
- `private` (optional): Make response private

**Growing Stages Explained:**

**Seedling & Germination:**
- Seed starting techniques
- Early plant care
- Environmental requirements for seedlings
- Common seedling problems

**Vegetative Growth:**
- Nutrition and feeding schedules
- Lighting requirements and schedules
- Training techniques (LST, topping, SCROG)
- Plant health monitoring

**Flowering Stage:**
- Bloom nutrition requirements
- Light cycle management (12/12)
- Bud development monitoring
- Environmental control

**Harvest & Curing:**
- Harvest timing and trichome inspection
- Drying techniques and environment
- Curing processes and containers
- Storage and preservation

**Indoor Growing:**
- Equipment selection and setup
- Environmental control systems
- Space optimization
- Stealth and discretion

**Outdoor Growing:**
- Seasonal planning and timing
- Soil preparation and selection
- Weather protection
- Pest and predator management

**Equipment & Setup:**
- Lighting systems (LED, HPS, etc.)
- Ventilation and air movement
- Nutrients and feeding systems
- Monitoring and automation

### [`/legal-info`](../../src/commands/ai/legal-info.js) - Cannabis Legal Guidance
**Purpose**: Get information about cannabis laws and regulations

**🔞 Age Verification Required**: Must be 21+ verified to access

**Usage:**
```
/legal-info topic:home cultivation limits in New Jersey
/legal-info topic:medical vs recreational differences private:true
```

**Note**: Legal information is for educational purposes only and not legal advice.

## 🎛️ Conversation Management

### [`/clear-context`](../../src/commands/ai/clear-context.js) - Reset Conversation
**Purpose**: Clear conversation memory and start fresh

**Usage:**
```
/clear-context
/clear-context confirm:true
```

**When to Use:**
- Starting a new topic
- Conversation feels confused or off-track
- Want to reset AI memory
- Switching conversation types

### Viewing Context
**Check Conversation Stats:**
```
/chat view_context:true
```

**Context Information Includes:**
- Active conversations count
- Total messages in conversation
- Tokens used
- Cannabis conversation count
- Last activity timestamp
- User preferences

## ⚙️ AI Settings & Preferences

### Conversation Preferences
- **Cannabis Assistance**: Enable/disable cannabis content
- **Response Style**: Adjust AI communication style
- **Content Filtering**: Set filtering level
- **Privacy Settings**: Default private/public responses

### Content Filtering Levels
- **Strict**: Maximum compliance filtering
- **Standard**: Balanced filtering (recommended)
- **Minimal**: Basic safety filtering only

## 🔧 Troubleshooting

### Common Issues

**"AI Service Unavailable"**
- OpenAI service may be down or not configured
- Contact administrators about service status
- Try again later or use community channels

**"Age verification required"**
- Cannabis content requires 21+ verification
- Contact moderators to complete verification
- Use general questions while waiting

**"This interaction failed"**
- Try rephrasing your question
- Check if you're in the correct channel
- Restart Discord if needed

**"Response is too long/cut off"**
- AI responses are automatically split if too long
- Check for follow-up messages
- Use more specific questions for shorter responses

**"AI seems confused"**
- Use [`/clear-context`](../../src/commands/ai/clear-context.js) to reset conversation
- Be more specific in your questions
- Try a different conversation type

### Error Messages

**"Cannabis content requires age verification"**
- Complete 21+ verification with server staff
- Use general conversation types while waiting
- Contact moderators for verification help

**"OpenAI API error"**
- Temporary service issue
- Try again in a few minutes
- Contact support if error persists

**"Token limit exceeded"**
- Long conversation hit memory limit
- Use [`/clear-context`](../../src/commands/ai/clear-context.js) to reset
- Break complex topics into smaller questions

### Getting Help
1. Try [`/chat view_context:true`](../../src/commands/ai/chat.js:68) to check conversation status
2. Use [`/clear-context`](../../src/commands/ai/clear-context.js) if AI seems confused
3. Check age verification status for cannabis content
4. Ask in community channels for help
5. Contact moderators for technical issues

## 🌿 Cannabis Compliance

### Age Verification Requirements
**Why 21+ Verification is Required:**
- New Jersey cannabis laws require 21+ for cannabis information
- Strain and growing advice involves cannabis-specific content
- Legal compliance protects the community
- Educational cannabis content is age-restricted

### What Requires Verification
- Cannabis strain information ([`/strain-advice`](../../src/commands/ai/strain-advice.js:53))
- Growing and cultivation advice ([`/grow-tips`](../../src/commands/ai/grow-tips.js:65))
- Cannabis legal discussions ([`/legal-info`](../../src/commands/ai/legal-info.js))
- Medical cannabis information
- Cannabis-specific conversation types

### Content Filtering
- **Automatic Detection**: AI automatically identifies cannabis content
- **Compliance Filtering**: Responses filtered for legal compliance
- **Educational Focus**: All content focused on education, not promotion
- **Legal Disclaimers**: Appropriate disclaimers included in responses

### Getting Verified
1. Contact a server moderator or administrator
2. Provide age verification documentation
3. Receive "21+ Verified" role
4. Access all cannabis AI features

## 💡 Tips & Best Practices

### Getting the Best Responses
- **Be Specific**: "How to fix nitrogen deficiency in flowering cannabis" vs "plant problems"
- **Use Context**: Continue conversations rather than starting new ones
- **Choose Right Type**: Use appropriate conversation/question types
- **Ask Follow-ups**: Build on previous responses for deeper information

### Conversation Management
- **Use Context Wisely**: Long conversations may become unfocused
- **Clear When Needed**: Reset context when changing topics completely
- **Private for Personal**: Use private mode for personal growing questions
- **Public for Learning**: Share educational content publicly

### Cannabis Questions
- **Focus on Education**: Ask about learning and understanding
- **Include Experience Level**: Mention if you're beginner/intermediate/advanced
- **Be Specific About Stage**: Mention seedling/veg/flower for growing questions
- **Ask About Compliance**: Get information about legal requirements

### Privacy & Safety
- **Personal Information**: Don't share personal growing details in public
- **Legal Compliance**: Always follow local and state laws
- **Medical Advice**: AI doesn't provide medical advice - consult professionals
- **Responsible Use**: Use information responsibly and legally

## 📚 Related Documentation

- **[Music Bot User Guide](MUSIC_BOT_GUIDE.md)** - Learn about the music streaming system
- **[Economy User Guide](ECONOMY_GUIDE.md)** - Discover the virtual currency system
- **[Advanced Features Guide](../ADVANCED_FEATURES_GUIDE.md)** - Overview of all advanced features
- **[Advanced Features Setup](../ADVANCED_FEATURES_SETUP.md)** - Administrator setup documentation

## ⚠️ Important Legal Information

**Cannabis Compliance Disclaimers:**
- All cannabis information is for educational purposes only
- Follow all New Jersey state and local cannabis laws
- This is not medical advice - consult healthcare professionals
- AI responses include appropriate legal disclaimers
- Cannabis content requires 21+ verification for legal compliance

**AI Service Disclaimers:**
- AI responses are generated and may contain errors
- Always verify important information from authoritative sources
- Not a substitute for professional advice
- Educational purposes only

**Privacy Notice:**
- Conversations may be logged for compliance and improvement
- Private conversations are marked as such
- Age verification status is tracked for compliance
- Follow Discord's privacy policy

---

**Last Updated**: January 2024  
**Documentation Version**: 1.0.0  
**AI Chat System Version**: Full Implementation

For technical support or questions about the AI chat system, contact the GrowmiesNJ staff team or ask in the community channels.