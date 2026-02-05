# 🚀 Production Deployment - CapitalView

This guide details the steps to deploy CapitalView in a production environment.

## 📋 Prerequisites

- Docker and Docker Compose
- Server (Min: 2 CPU cores, 4GB RAM, 20GB Disk)
- Domain name configured
- SSL Certificates (for HTTPS)

## 🔐 Initial Configuration

### 1. Environment Variables

Create your production environment file at the project root:

```bash
cp backend/.env.example .env.production
nano .env.production
```

**Security**: Generate strong keys:

```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

Required values in `.env.production`:
- `SECRET_KEY`: JWT secret
- `ENCRYPTION_KEY`: Sensitive data encryption key
- `DATABASE_URL`: PostgreSQL connection string
- `POSTGRES_PASSWORD`: Strong database password
- `CORS_ORIGINS`: https://capitalview.emilien.roukine.com
- `VITE_API_URL`: https://api.capitalview.emilien.roukine.com

### 2. SSL Configuration

For HTTPS production:

1. Obtain SSL certificates (e.g., Let's Encrypt).
2. Place them in `nginx/ssl/`.
3. Configure `nginx/nginx.conf` with your domain and SSL paths.

## 🚀 Deployment

### Standard Deployment

```bash
# 1. Build images
docker-compose -f docker-compose.prod.yaml build

# 2. Start services
docker-compose -f docker-compose.prod.yaml up -d

# 3. Check logs
docker-compose -f docker-compose.prod.yaml logs -f
```

*Note: GitHub Actions automates this on push to `main`.*

## 🛠️ Maintenance & Useful Commands

### Database Management

```bash
# Backup
docker-compose -f docker-compose.prod.yaml exec db pg_dump -U capitalview_user capitalview > backup_$(date +%Y%m%d).sql

# Restore
cat backup.sql | docker-compose -f docker-compose.prod.yaml exec -T db psql -U capitalview_user capitalview

# Migrations
docker-compose -f docker-compose.prod.yaml exec backend alembic upgrade head
```

### Monitoring

```bash
docker stats
docker-compose -f docker-compose.prod.yaml ps
```

## 🔄 Updates

```bash
git pull origin main
docker-compose -f docker-compose.prod.yaml up -d --build
```