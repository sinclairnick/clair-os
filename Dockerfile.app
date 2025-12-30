# Build stage
FROM node:25-alpine AS builder

WORKDIR /app

# Enable corepack for pnpm
RUN npm i -g pnpm

# Copy workspace config and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY app/package.json ./app/

# Install dependencies using filter to scope to app and shared
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --filter app --filter '@clairos/shared' --frozen-lockfile

# Copy source
COPY packages/shared ./packages/shared
COPY app ./app
COPY tsconfig.json ./

# Build the app
RUN pnpm --filter app build

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
