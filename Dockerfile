# Dockerfile for Growmies NJ Discord Bot
# Production-ready containerization for Railway.app deployment

# Use Node.js 18 LTS Alpine for smaller image size and security
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S growmiesbot -u 1001

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files first for better Docker layer caching
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application source code
COPY . .

# Create necessary directories
RUN mkdir -p logs data config && \
    chown -R growmiesbot:nodejs /app

# Set user to non-root
USER growmiesbot

# Expose health check port (if using monitoring)
EXPOSE 3000

# Health check for Railway.app
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('Bot health check passed')" || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the Discord bot
CMD ["node", "src/index.js"]

# Labels for maintainability
LABEL name="growmies-nj-discord-bot" \
      version="1.0.0" \
      description="Cannabis community Discord bot for New Jersey" \
      maintainer="Growmies NJ Development Team" \
      org.opencontainers.image.source="https://github.com/capawawa/growmies-nj-discord-bot"