# Use Node.js LTS image with Python support
FROM node:22-alpine

# Install Python and pip
RUN apk add --no-cache \
    python3 \
    py3-pip \
    && ln -sf python3 /usr/bin/python

# Create symbolic links for python commands
RUN ln -sf /usr/bin/pip3 /usr/bin/pip

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
