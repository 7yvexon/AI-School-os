#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "root 권한이 필요합니다." >&2
  exit 1
fi

RELEASE_DIR=${1:-$PWD}
APP_ROOT=${APP_ROOT:-/srv/app}
CONFIG_ROOT=${CONFIG_ROOT:-/etc/app}
ENV_FILE=${ENV_FILE:-$CONFIG_ROOT/app.env}
SERVICE_NAME=${SERVICE_NAME:-app}
SERVICE_USER=${SERVICE_USER:-svc-app}
APP_PORT=${APP_PORT:-3000}
HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:${APP_PORT}/api/health}

RELEASE_DIR=$(readlink -f "$RELEASE_DIR")
case "$RELEASE_DIR" in
  "$APP_ROOT"/releases/*) ;;
  *) echo "릴리스는 $APP_ROOT/releases 아래에 있어야 합니다." >&2; exit 1 ;;
esac

for file in package.json package-lock.json prisma/schema.prisma; do
  [ -r "$RELEASE_DIR/$file" ] || { echo "필수 파일이 없습니다: $RELEASE_DIR/$file" >&2; exit 1; }
done
[ -r "$ENV_FILE" ] || { echo "환경 파일이 없습니다: $ENV_FILE" >&2; exit 1; }

set -a
. "$ENV_FILE"
set +a
export NODE_ENV=production

cd "$RELEASE_DIR"
npm ci --include=dev
npm run db:generate
npm run db:deploy
rm -rf "$RELEASE_DIR/.next"
npm run build

chown -R root:"$SERVICE_USER" "$RELEASE_DIR"
find "$RELEASE_DIR" -type d -exec chmod 0750 {} +
find "$RELEASE_DIR" -type f -perm /111 -exec chmod 0750 {} +
find "$RELEASE_DIR" -type f ! -perm /111 -exec chmod 0640 {} +

previous_target=$(readlink -f "$APP_ROOT/current" 2>/dev/null || true)
ln -sfnT "$RELEASE_DIR" "$APP_ROOT/current"
systemctl restart "$SERVICE_NAME.service"

ready=0
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 3 "$HEALTH_URL" >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done

if [ "$ready" -ne 1 ]; then
  echo "배포 후 health check에 실패했습니다." >&2
  if [ -n "$previous_target" ] && [ -d "$previous_target" ]; then
    ln -sfnT "$previous_target" "$APP_ROOT/current"
    systemctl restart "$SERVICE_NAME.service" || true
  fi
  systemctl status "$SERVICE_NAME.service" --no-pager -l || true
  exit 1
fi

echo "배포 완료: $RELEASE_DIR"
curl --fail --silent --show-error "$HEALTH_URL"
