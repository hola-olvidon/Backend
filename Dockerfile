# Multi-stage build for NestJS Backend
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies first to leverage Docker cache
COPY package*.json ./
# Install all dependencies including devDependencies for the build process
RUN npm ci

# Copy source and config
COPY . .

# Install the missing adapter needed for the build
RUN npm install @prisma/adapter-pg pg

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build

# Production stage
FROM node:22-alpine AS production

WORKDIR /app

# Copy only necessary files from build stage
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma

# Set environment to production
ENV NODE_ENV=production

# The app runs on port 3000 by default in NestJS
EXPOSE 3000

CMD ["npm", "run", "start:prod"]
