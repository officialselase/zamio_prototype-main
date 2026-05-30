#!/bin/bash

# Local development entrypoint for ZamIO Django
set -e

log() {
	echo "$(date +"%Y-%m-%d %H:%M:%S.%3N") | $1"
}

log "Starting ZamIO Django application..."

MEDIA_BASE="${MEDIA_ROOT:-/app/media}"
STATIC_BASE="${STATIC_ROOT:-/app/static_cdn/static_root}"
log "Ensuring media directory at ${MEDIA_BASE} and static directory at ${STATIC_BASE}"
mkdir -p "${MEDIA_BASE}" "${MEDIA_BASE}/temp" "${STATIC_BASE}"

# Wait for database to be ready using pg_isready
log "Waiting for database to be ready..."
PG_ISREADY_CMD=(pg_isready)

if [ -n "$DATABASE_URL" ]; then
    PG_ISREADY_CMD+=(-d "$DATABASE_URL")
else
    DB_HOST=${DB_HOST:-postgres}
    DB_PORT=${DB_PORT:-5432}
    DB_NAME=${DB_NAME:-${POSTGRES_DB:-postgres}}
    DB_USER=${DB_USER:-${POSTGRES_USER:-postgres}}
    PG_ISREADY_CMD+=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME")
fi

until "${PG_ISREADY_CMD[@]}" >/dev/null 2>&1; do
	log "Database is not ready yet. Waiting..."
	sleep 2
done

# If a command is provided (e.g., Celery), run it; otherwise do Django setup and start server
if [ "$#" -gt 0 ]; then
	if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
		log "Running database migrations..."
		python manage.py migrate
		log "Collecting static files..."
		python manage.py collectstatic --noinput || true
	fi
	log "Executing provided command: $*"
	exec "$@"
else
	## Run makemigrations (dev convenience)
	#log "Running database make migrations..."
	#python manage.py makemigrations || true

	# Run migrations
	log "Running database migrations..."
	python manage.py migrate

	# Collect static files (if needed)
	log "Collecting static files..."
	python manage.py collectstatic --noinput || true

	# Start the application
	log "Starting Django development server..."
	exec python manage.py runserver 0.0.0.0:8000
fi
