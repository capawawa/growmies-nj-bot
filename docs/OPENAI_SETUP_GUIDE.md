# OpenAI API Setup Guide

## ⚠️ IMPORTANT SECURITY NOTICE

**NEVER commit your API keys to version control!** Always use environment variables.

## Setup Instructions

1. **Create a `.env` file** in the root directory (if it doesn't exist)
2. **Copy the contents** from `.env.example` to `.env`
3. **Add your OpenAI API key** to the `.env` file:

```env
OPENAI_API_KEY=your_actual_api_key_here
OPENAI_VECTOR_STORE_ID=vs_6884ce1d1f98819182c6a0bdc3d617c6
```

4. **Ensure `.env` is in `.gitignore`** (it should be by default)

## Verify Setup

Run this command to verify your environment is configured:

```bash
node -e "console.log(process.env.OPENAI_API_KEY ? '✅ API Key configured' : '❌ API Key missing')"
```

## Credit System

- Users spend GrowCoins to use AI features
- 1 cent of API usage = 1 GrowCoin deducted
- Users need minimum 10 GrowCoins to start
- VIP users get unlimited access

## Security Best Practices

1. **Rotate keys regularly** through OpenAI dashboard
2. **Set usage limits** in OpenAI to prevent unexpected charges
3. **Monitor usage** through OpenAI's usage dashboard
4. **Never share keys** in Discord, commits, or logs

## Troubleshooting

If the bot can't connect to OpenAI:
1. Check the API key is correctly set in `.env`
2. Verify the key is active in OpenAI dashboard
3. Ensure no extra spaces or quotes around the key
4. Check the bot logs for specific error messages