# Dockerfile for Next.js application

# 1. Installer Stage: Install dependencies
FROM node:20-alpine AS installer
WORKDIR /app

COPY package*.json ./

RUN npm install

# 2. Builder Stage: Build the Next.js application
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=installer /app/node_modules ./node_modules
# Accept DATABASE_URL as a build argument
ARG DATABASE_URL
# Set it as an environment variable for the build process
ENV DATABASE_URL=$DATABASE_URL

COPY . .

RUN npx prisma generate

RUN npm run build

# 3. Runner Stage: Create the final production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV DATABASE_URL=$DATABASE_URL

COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

RUN npm install --prod

EXPOSE 3000

# Use a robust CMD for read-only filesystems
CMD ["sh", "-c", "npm start"]
