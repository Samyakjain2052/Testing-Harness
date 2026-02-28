#!/bin/sh
set -e

echo "=== Running database migrations ==="
node backend/dist/migrations/run.js

echo "=== Starting backend server ==="
exec node backend/dist/index.js
