FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Expose port
EXPOSE 3004

# Start the application
CMD ["npm", "start"]
