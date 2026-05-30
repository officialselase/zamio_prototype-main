# Project Structure

## Repository Layout

This is a monorepo containing backend, multiple frontend applications, a mobile app, and shared packages.

```
zamio/
├── zamio_backend/          # Django backend API
├── zamio_frontend/         # Artist portal (React)
├── zamio_stations/         # Station interface (React)
├── zamio_publisher/        # Publisher dashboard (React)
├── zamio_admin/            # Admin panel (React)
├── zamio_app/              # Mobile app (Flutter)
├── packages/               # Shared packages
│   └── ui/                 # Shared React UI components
├── docker/                 # Docker configurations
├── package.json            # Root workspace config
└── docker-compose.*.yml    # Docker orchestration
```

## Backend Structure (zamio_backend/)

Django apps are organized by domain:

- `accounts/` - User authentication, registration, RBAC, file uploads
- `artists/` - Artist profiles, albums, tracks, media management
- `stations/` - Radio station management and play log submission
- `publishers/` - Publisher catalogs and agreements
- `music_monitor/` - Audio fingerprinting and detection services
- `royalties/` - Royalty calculations and PRO integration
- `disputes/` - Dispute workflow and resolution
- `analytics/` - Real-time analytics and WebSocket consumers
- `notifications/` - User notification system
- `bank_account/` - Payment and banking features
- `activities/` - User activity tracking
- `fan/` - Fan features and interactions
- `streamer/` - Streaming service integration
- `mr_admin/` - Admin-specific features
- `core/` - Django settings, ASGI/WSGI, URL routing, shared utilities

### Backend App Organization

Each Django app typically contains:

```
app_name/
├── api/                    # API views, serializers, URLs (if complex)
├── management/commands/    # Custom Django commands
├── migrations/             # Database migrations
├── services/               # Business logic layer
├── tests/                  # Test files
├── admin.py                # Django admin configuration
├── apps.py                 # App configuration
├── models.py               # Database models
├── serializers.py          # DRF serializers
├── signals.py              # Django signals
├── tasks.py                # Celery tasks
├── urls.py                 # URL routing
└── views.py                # View functions/classes
```

## Frontend Structure

Each frontend app follows a similar structure:

```
zamio_*/
├── src/
│   ├── components/         # React components
│   ├── pages/              # Page components (routes)
│   ├── lib/                # Utilities (api, auth, router)
│   ├── css/                # Stylesheets
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
├── index.html              # HTML template
├── package.json            # Dependencies
├── vite.config.js          # Vite configuration
├── tailwind.config.cjs     # Tailwind configuration
└── tsconfig.json           # TypeScript configuration
```

## Mobile App Structure (zamio_app/)

```
zamio_app/
├── lib/
│   ├── models/             # Data models
│   ├── services/           # Business logic (database, sync, offline)
│   ├── ui/                 # UI screens/pages
│   ├── main.dart           # Entry point
│   └── *.dart              # Core app files
├── android/                # Android-specific code
├── ios/                    # iOS-specific code
└── pubspec.yaml            # Flutter dependencies
```

## Shared Package (@zamio/ui)

```
packages/ui/
├── src/
│   ├── Button.tsx          # Shared button component
│   ├── Card.tsx            # Shared card component
│   ├── ThemeProvider.tsx   # Theme context
│   ├── ThemeToggle.tsx     # Theme switcher
│   ├── authClient.ts       # Shared auth utilities
│   ├── tailwind.css        # Base styles
│   └── index.ts            # Package exports
└── package.json
```

## Key Conventions

- **API Endpoints**: Backend uses `/api/` prefix for all REST endpoints
- **Authentication**: JWT tokens in Authorization header (`Bearer <token>`)
- **File Uploads**: Media files stored in `zamio_backend/media/`, static in `static_cdn/`
- **Environment Files**: `.env.example` is the source of truth, copy to `.env.local` for development
- **Testing**: Backend tests in `app/tests/`, frontend tests co-located with components
- **Migrations**: Always create migrations after model changes, never edit existing migrations
- **URL Trailing Slashes**: `APPEND_SLASH = False` - API endpoints should NOT have trailing slashes
- **CORS**: Configured to allow all origins in DEBUG mode, specific origins in production
