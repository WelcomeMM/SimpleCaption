# SimpleCaption — production image
#
# Based on Remotion's official headless-Chrome Linux deployment guidance:
# https://www.remotion.dev/docs/lambda/setup (system deps section)
#
# NOTE: Before transcription works you must either:
#   1. Run `npm run setup:whisper` inside the container after first start, OR
#   2. Mount a pre-built whisper directory at /app/data/whisper.
#
# Mount /app/data as a volume for persistent uploads, renders, and the whisper model.
#
# Example:
#   docker build -t simplecaption .
#   docker run -p 3000:3000 -v $(pwd)/data:/app/data simplecaption

FROM node:22-bookworm-slim

# System libraries required by Remotion's Chrome Headless Shell on Debian
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libnss3 \
    libdbus-1-3 \
    libatk1.0-0 \
    libgbm-dev \
    libasound2 \
    libxrandr2 \
    libxkbcommon-dev \
    libxfixes3 \
    libxcomposite1 \
    libxdamage1 \
    libatk-bridge2.0-0 \
    libpango-1.0-0 \
    libcairo2 \
    libcups2 \
    libxss1 \
    libxshmfence1 \
    fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (layer-cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build Next.js app
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
