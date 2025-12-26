# ClairOS Deployment Guide

ClairOS is designed for simple home server deployment using Docker Compose. No cloud services required—your family data stays on your own hardware.

## Prerequisites

- Docker and Docker Compose installed
- A home server (Raspberry Pi 4+, old laptop, NAS, etc.)
- Local network access

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url> clair-os
   cd clair-os
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env and set a secure DB_PASSWORD
   ```

3. **Start the stack**
   ```bash
   docker-compose up -d
   ```

4. **Access the app**
   ```
   http://<server-ip>:3000
   ```

## Docker Compose Configuration

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: clairios
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: clairios
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U clairios"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgres://clairios:${DB_PASSWORD}@db:5432/clairios
      PORT: 3001
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "3001:3001"

  app:
    build:
      context: .
      dockerfile: Dockerfile.app
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - api

volumes:
  postgres_data:
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_PASSWORD` | PostgreSQL password | `your-secure-password` |
| `PORT` | API port (internal) | `3001` |
| `DATABASE_URL` | Full connection string | Auto-generated |

## Database Management

### Running Migrations

```bash
# Access the API container
docker-compose exec api sh

# Run migrations
bun run db:migrate
```

### Backup

```bash
# Create a backup
docker-compose exec db pg_dump -U clairios clairios > backup.sql

# Restore from backup
docker-compose exec -T db psql -U clairios clairios < backup.sql
```

### Reset Database

```bash
# ⚠️ This will delete all data!
docker-compose down -v
docker-compose up -d
```

## Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

## Network Configuration

### Local Access Only (Default)

By default, the app binds to all interfaces. For local network access:

```yaml
ports:
  - "3000:80"  # Accessible from LAN
```

### Specific Interface

To bind to a specific IP:

```yaml
ports:
  - "192.168.1.100:3000:80"
```

### HTTPS with Reverse Proxy

For HTTPS, use a reverse proxy like Caddy, Traefik, or nginx:

```yaml
# Example with Caddy
caddy:
  image: caddy:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
```

```
# Caddyfile
home.local {
  reverse_proxy app:80
}

api.home.local {
  reverse_proxy api:3001
}
```

## Hardware Recommendations

### Minimum (Basic Use)
- Raspberry Pi 4 (2GB+)
- Any x86 machine with 2GB RAM

### Recommended (Smooth Experience)
- Raspberry Pi 4 (4GB) or Pi 5
- Any machine with 4GB RAM
- SSD for database storage

### Storage
- ~500MB for Docker images
- Database grows with usage (typically < 100MB)

## Troubleshooting

### Container Won't Start

```bash
# Check logs
docker-compose logs api
docker-compose logs db

# Restart individual service
docker-compose restart api
```

### Database Connection Issues

```bash
# Verify database is healthy
docker-compose ps

# Check database logs
docker-compose logs db
```

### Frontend Not Loading

```bash
# Check if build succeeded
docker-compose logs app

# Rebuild frontend
docker-compose up -d --build app
```

### Clear Everything and Start Fresh

```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

## Push Notifications (Optional)

For push notifications to work, you'll need:

1. HTTPS (required by browsers for service workers)
2. VAPID keys configured
3. Service worker registration

This is optional for home server deployments where users are on the same network.

## Accessing from Outside Home

For remote access, consider:

1. **VPN**: Most secure, recommended (WireGuard, Tailscale)
2. **Cloudflare Tunnel**: Free, no port forwarding needed
3. **Port Forwarding**: Not recommended without HTTPS

---

*ClairOS is designed for home use. For production deployments serving many families, additional infrastructure (load balancing, Redis, etc.) would be needed.*
