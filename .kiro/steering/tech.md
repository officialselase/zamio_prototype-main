# Technology Stack

## Backend

- **Framework**: Django 5.1+ with Django REST Framework
- **Language**: Python 3.x
- **Database**: PostgreSQL (production), SQLite (development)
- **Cache/Queue**: Redis
- **Task Queue**: Celery with django-celery-beat for scheduled tasks
- **WebSockets**: Django Channels with Daphne ASGI server
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Audio Processing**: librosa, ffmpeg-python
- **External Services**: ACRCloud for music identification

## Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Routing**: React Router v6
- **Styling**: Tailwind CSS 3
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Monorepo**: npm workspaces with shared UI package (@zamio/ui)

### Frontend Applications

- `zamio_frontend` (port 5173): Artist portal
- `zamio_stations` (port 5174): Radio station interface
- `zamio_publisher` (port 5175): Publisher dashboard
- `zamio_admin` (port 5176): Admin panel

## Mobile

- **Framework**: Flutter 3.4+
- **Language**: Dart
- **Key Packages**: flutter_sound, sqflite, connectivity_plus, firebase_messaging
- **Platforms**: Android, iOS

## Infrastructure

- **Containerization**: Docker with Docker Compose
- **Development**: docker-compose.local.yml
- **Production**: docker-compose.coolify.yml (Coolify deployment)
- **Web Server**: Nginx (production, for serving SPAs)

## Common Commands

### Backend (Django)

```bash
# Local development with Docker
docker compose -f docker-compose.local.yml up --build
docker compose -f docker-compose.local.yml down

# Run migrations
docker compose -f docker-compose.local.yml exec backend python manage.py migrate

# Create superuser
docker compose -f docker-compose.local.yml exec backend python manage.py createsuperuser

# Collect static files
docker compose -f docker-compose.local.yml exec backend python manage.py collectstatic --noinput

# Django shell
docker compose -f docker-compose.local.yml exec backend python manage.py shell

# Run tests
docker compose -f docker-compose.local.yml exec backend pytest
```

### Frontend (React/Vite)

```bash
# Development (runs automatically in Docker)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test
```

### Mobile (Flutter)

```bash
# Get dependencies
flutter pub get

# Run on device/emulator
flutter run

# Build APK (Android)
flutter build apk

# Build iOS
flutter build ios
```

## Testing

- **Backend**: pytest, pytest-django, factory-boy, freezegun
- **Frontend**: Vitest, @testing-library/react

## Environment Configuration

All services use environment variables for configuration. See `.env.example` for required variables. Key variables include:

- `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`
- `DATABASE_URL`, `REDIS_URL`
- `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND`
- `ACRCLOUD_ACCESS_KEY`, `ACRCLOUD_ACCESS_SECRET`, `ACRCLOUD_HOST`
- `VITE_API_URL` (frontend)
