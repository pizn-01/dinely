# ─── Stage 1: Frontend Build ────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ─── Stage 2: Backend Build ─────────────────────────────
FROM node:20-slim AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci
COPY backend/ .
RUN npx tsc

# ─── Stage 3: Runner ────────────────────────────────────
FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# Install only production dependencies for the backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend to the directory backend expects
COPY --from=frontend-builder /app/dist ./public_html

EXPOSE 3001
CMD ["node", "dist/server.js"]
