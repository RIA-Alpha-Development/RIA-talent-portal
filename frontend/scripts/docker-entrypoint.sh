#!/bin/sh
set -e

echo "Starting RIA Talent Portal..."

# Check if we should wait for postgres container
SHOULD_WAIT_FOR_POSTGRES=false

# In production (NODE_ENV=production), NEVER wait for postgres
# Production uses Cloud SQL which doesn't need the wait
if [ "$NODE_ENV" = "production" ]; then
  echo "Production environment - skipping postgres wait (using Cloud SQL)"
  SHOULD_WAIT_FOR_POSTGRES=false
# In non-production environments, check DATABASE_URL or DB_HOST
elif [ -n "$INSTANCE_CONNECTION_NAME" ]; then
  echo "Cloud SQL connection detected, skipping network wait"
  SHOULD_WAIT_FOR_POSTGRES=false
elif [ -n "$DB_HOST" ]; then
  case "$DB_HOST" in
    */cloudsql/*)
      echo "Cloud SQL Unix socket detected, skipping network wait"
      SHOULD_WAIT_FOR_POSTGRES=false
      ;;
    postgres|db)
      echo "Docker Compose postgres container detected, waiting..."
      SHOULD_WAIT_FOR_POSTGRES=true
      ;;
    *)
      echo "External database connection, proceeding without wait..."
      SHOULD_WAIT_FOR_POSTGRES=false
      ;;
  esac
else
  echo "No database configuration found, proceeding..."
  SHOULD_WAIT_FOR_POSTGRES=false
fi

# Only wait for postgres if needed
if [ "$SHOULD_WAIT_FOR_POSTGRES" = "true" ]; then
  MAX_RETRIES=30
  RETRY_COUNT=0
  DB_PORT="${DB_PORT:-5432}"

  until nc -z "${DB_HOST}" "${DB_PORT}" 2>/dev/null || [ $RETRY_COUNT -eq $MAX_RETRIES ]; do
    echo "PostgreSQL is unavailable - sleeping (attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
    RETRY_COUNT=$((RETRY_COUNT+1))
  done

  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "Failed to connect to PostgreSQL after $MAX_RETRIES attempts"
    exit 1
  fi

  echo "PostgreSQL is ready!"
  # Additional wait to ensure postgres is fully initialized
  echo "Waiting 3 seconds for PostgreSQL to fully initialize..."
  sleep 3
fi

# Start the application
echo "Starting Node.js server on port ${PORT:-8080}..."
exec node server.js
