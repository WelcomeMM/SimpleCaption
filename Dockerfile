FROM node:22-bookworm

# Chromium for Remotion's headless renderer + its runtime libs
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgbm-dev \
    libasound2 \
    libxrandr2 \
    libxkbcommon-dev \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libpango-1.0-0 \
    libcairo2 \
    libcups2 \
    libxss1 \
    libxshmfence1 \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer / Remotion to use system Chromium instead of downloading one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install deps before copying source so this layer is cached across code changes
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Uploads, renders, and the whisper binary/model all live here.
# Mount a Docker volume at this path so data survives container restarts.
ENV SIMPLECAPTION_DATA=/data

EXPOSE 3000
CMD ["npm", "start"]
