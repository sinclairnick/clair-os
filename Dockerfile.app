# Build stage
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Copy workspace config and lockfile
COPY package.json bun.lock ./
COPY packages/shared/package.json ./packages/shared/
COPY api/package.json ./api/
COPY app/package.json ./app/

# Install dependencies using filter to scope to app and shared
RUN --mount=type=cache,id=bun,target=~/.bun/install/cache \
    bun install --filter app --filter 'packages/*' --frozen-lockfile




# Copy source
COPY packages/shared ./packages/shared
COPY app ./app
COPY tsconfig.json ./

# Build args for environment variables
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

# Build the app
RUN bun --filter app build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
