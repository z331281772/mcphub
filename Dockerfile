# Use Node.js LTS image with Python support
FROM node:22-alpine

# Use mirror for faster package installation
RUN npm config set registry https://registry.npmmirror.com

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

# Copy the rest of the application
COPY . .

# Build the application
RUN pnpm build

# Expose the port defined in .env
EXPOSE 3000

# Start the application
CMD ["pnpm", "start"]
