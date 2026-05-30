# 🚀 ZamIO Django - Deployment Guide

**Complete guide for deploying ZamIO Django locally and on Coolify**

---

## 📁 **Project Structure**

```
zamio_backend/
├── core/                    # Django core settings
├── accounts/               # User accounts app
├── artists/                # Artists management
├── stations/               # Radio stations
├── music_monitor/          # Music monitoring
├── notifications/          # User notifications
├── publishers/             # Music publishers
├── fan/                    # Fan management
├── activities/             # User activities
├── bank_account/           # Banking features
├── mr_admin/               # Admin panel
├── streamer/               # Streaming features
├── users/                  # User management
├── templates/              # HTML templates
├── media/                  # User uploads
├── static_cdn/             # Static files
├── manage.py               # Django management
├── requirements.txt         # Python dependencies
├── Dockerfile              # Docker image
├── entrypoint.sh           # Container startup
├── docker-compose.local.yml # Local development
├── .dockerignore           # Docker build exclusions
├── .gitignore              # Git exclusions
├── env.local.example       # Local environment template
├── .env.local              # Local environment (auto-created)
├── start-local.bat         # Windows startup script
├── stop-local.bat          # Windows stop script
├── DEPLOYMENT_STEPS.md     # Step-by-step deployment
├── DEPLOYMENT_CHECKLIST.md # Deployment checklist
├── QUICK_COMMANDS.md       # Essential commands
└── django-commands.bat     # Windows Django commands
```

---

## 🖥️ **Local Development**

### **Quick Start (Local Docker)**
```bash
# 1. Copy the sample environment file and edit values as needed
cp .env.example .env.local

# 2. Build and start all services
docker compose -f docker-compose.local.yml up --build

docker compose -f docker-compose.local.yml up -d

# 3. Run database migrations once the containers settle
docker compose -f docker-compose.local.yml exec backend python manage.py migrate

# 4. (Optional) Create an admin user
docker compose -f docker-compose.local.yml exec backend python manage.py createsuperuser

# 5. Stop everything
docker compose -f docker-compose.local.yml down
```

- **Backend API**: `http://localhost:8000`
- **Frontend SPAs**: `http://localhost:5173`, `5174`, `5175`, `5176`
- **Postgres**: `localhost:5432`
- **Redis**: `localhost:6379`

> **Note:** Vite frontends run with hot reload. Each SPA has an isolated `node_modules` volume managed by Docker, so first boot installs dependencies automatically.

### **Key Django Commands (via Docker)**
```bash
# Run migrations
docker compose -f docker-compose.local.yml exec backend python manage.py migrate

# Collect static files
docker compose -f docker-compose.local.yml exec backend python manage.py collectstatic --noinput

# Open Django shell
docker compose -f docker-compose.local.yml exec backend python manage.py shell
```

---

## 🌐 **Environment Variables**

Use `.env.example` as the source of truth. Copy it to `.env.local` for local work or paste values into Coolify’s UI for production.

- **Core Django**: `SECRET_KEY`, `DEBUG`, `BASE_URL`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`
- **Database**: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `DATABASE_URL`, `DB_CONN_MAX_AGE`
- **Redis / Celery**: `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`, `CELERY_PREFETCH_MULTIPLIER`
- **Email (optional)**: `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, etc.
- **Security Flags**: `SECURE_SSL_REDIRECT`, `SECURE_HSTS_SECONDS`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`
- **Frontend**: `VITE_API_URL` (internal URL in Docker, public API URL in production)
- **Integrations (optional)**: `PYFCM_API_KEY`, AWS credentials, or storage keys as needed

For Coolify deployments, set the same keys in the app’s environment panel and attach a persistent volume to the `postgres` service.

---

## 🚢 **Coolify Deployment Workflow**

- **Step 1**: Push the repo with updated `docker-compose.coolify.yml`, production Dockerfiles, and `.env.example`
- **Step 2**: In Coolify, create a new Docker Compose app pointing to `docker-compose.coolify.yml`
- **Step 3**: Fill environment variables (match `.env.example`, but with production-grade secrets and domains)
- **Step 4**: Provision a volume for `postgres_data`
- **Step 5**: Deploy and watch logs; backend will run migrations automatically, and Celery services auto-restart on failure
- **Step 6**: Verify each service using the domains/ports assigned by Coolify and run smoke tests (`python manage.py check`, API probes, frontend navigation)

---
