# VocalIQ - Multi-stage Docker build for Google Cloud Run
# Stage 1: Build the React Vite client
# Stage 2: Run Express server and serve the built React app
# Author: Angaddeep Singh Gupta | CS651 Project 2

# ── Stage 1: Build React client ──────────────────────────────
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci --silent
COPY client/ ./
RUN npm run build

# ── Stage 2: Production Express server ───────────────────────
FROM node:20-alpine AS production
WORKDIR /app
# ffmpeg is required for server-side video frame extraction (emotion timeline on Drive uploads)
RUN apk add --no-cache ffmpeg
COPY server/package*.json ./
RUN npm ci --only=production --silent
COPY server/ ./

# Copy built React app into Express public folder
COPY --from=client-builder /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.js"]
