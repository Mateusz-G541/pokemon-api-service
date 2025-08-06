# Multi-stage build for optimal image size and security

# Stage 1: Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the TypeScript application
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy essential directories for the application
COPY --from=builder /app/data ./data
COPY --from=builder /app/images ./images

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pokemon -u 1001

# Change ownership of the app directory
RUN chown -R pokemon:nodejs /app
USER pokemon

# Expose the port
EXPOSE 20275

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:20275/api/health || exit 1

# Start the application
CMD ["npm", "start"]
