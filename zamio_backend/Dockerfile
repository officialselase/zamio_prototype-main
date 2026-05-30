# Local Development Dockerfile for ZamIO Django
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libpq-dev \
    libsndfile1 \
    ffmpeg \
    git \
    curl \
    postgresql-client \
  && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt ./requirements.txt
RUN pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Copy and set permissions for entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN sed -i 's/\r$//' /entrypoint.sh \
    && chmod +x /entrypoint.sh \
    && mkdir -p /app/static_cdn /app/media

# Set environment variables
ENV DJANGO_SETTINGS_MODULE=core.settings \
    MPLCONFIGDIR=/tmp/matplotlib

EXPOSE 8000

# Use the entrypoint script
ENTRYPOINT ["/entrypoint.sh"]