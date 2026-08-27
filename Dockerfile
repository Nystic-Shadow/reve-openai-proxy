# Use lightweight official Node.js Alpine base
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (for docker layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Expose default port (5674)
EXPOSE 5674

# Environment defaults
ENV PORT=5674
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Start application
CMD ["node", "src/server.js"]
