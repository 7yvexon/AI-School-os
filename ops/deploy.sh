#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "root 권한이 필요합니다." >&2
  exit 1
fi

RELEASE_DIR=${1:-$PWD}
APP_ROOT=${APP_ROOT:-/srv/app}
CONFIG_ROOT=${CONFIG_ROOT:-/etc/app}
SERVICE_NAME=${SERVICE_NAME:-app}
SERVICE_USER=${SERVICE_USER:-svc-app}
APP_PORT=${APP_PORT:-3000}

case "$SERVICE_USER" in
  ''|[!a-zA-Z0-9]*|*[!a-zA-Z0-9_-]*) echo "SERVICE_USER는 영문자·숫자·밑줄·하이픈 조합이어야 합니다." >&2; exit 1 ;;
esac
case "$SERVICE_NAME" in
  ''|[!a-zA-Z0-9]*|*[!a-zA-Z0-9_-]*) echo "SERVICE_NAME은 영문자·숫자·밑줄·하이픈 조합이어야 합니다." >&2; exit 1 ;;
esac
case "$APP_PORT" in
  ''|*[!0-9]*) echo "APP_PORT는 숫자여야 합니다." >&2; exit 1 ;;
esac
app_port_number=$((10#$APP_PORT))
if [ "$app_port_number" -lt 1 ] || [ "$app_port_number" -gt 65535 ]; then
  echo "APP_PORT는 1에서 65535 사이여야 합니다." >&2
  exit 1
fi
if [[ ! "$APP_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] || [ "$APP_ROOT" = "/" ]; then
  echo "APP_ROOT는 안전한 절대 경로여야 합니다." >&2
  exit 1
fi
if [[ ! "$CONFIG_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] || [ "$CONFIG_ROOT" = "/" ]; then
  echo "CONFIG_ROOT는 안전한 절대 경로여야 합니다." >&2
  exit 1
fi

command -v readlink >/dev/null
command -v npm >/dev/null
command -v curl >/dev/null
command -v systemctl >/dev/null
command -v chown >/dev/null
command -v find >/dev/null
command -v runuser >/dev/null

APP_ROOT=$(readlink -f -- "$APP_ROOT")
CONFIG_ROOT=$(readlink -f -- "$CONFIG_ROOT")
if [ "$APP_ROOT" = "/" ] || [ "$CONFIG_ROOT" = "/" ] ||
  [[ ! "$APP_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] ||
  [[ ! "$CONFIG_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] ||
  [ ! -d "$APP_ROOT" ] || [ ! -d "$APP_ROOT/releases" ]; then
  echo "APP_ROOT와 releases 디렉터리가 필요합니다." >&2
  exit 1
fi
if [ -z "${ENV_FILE+x}" ]; then
  ENV_FILE="$CONFIG_ROOT/app.env"
fi
if [[ ! "$ENV_FILE" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "ENV_FILE은 안전한 절대 경로여야 합니다." >&2
  exit 1
fi
case "$ENV_FILE" in
  "$CONFIG_ROOT"/*) ;;
  *) echo "ENV_FILE은 CONFIG_ROOT 아래에 있어야 합니다." >&2; exit 1 ;;
esac
case "$ENV_FILE" in
  */../*|*/..|*/./*|*/.) echo "ENV_FILE에 허용되지 않은 경로 요소가 있습니다." >&2; exit 1 ;;
esac
RELEASE_DIR=$(readlink -f -- "$RELEASE_DIR")
case "$RELEASE_DIR" in
  "$APP_ROOT"/releases/*) ;;
  *) echo "릴리스는 $APP_ROOT/releases 아래에 있어야 합니다." >&2; exit 1 ;;
esac
if [ ! -d "$RELEASE_DIR" ]; then
  echo "릴리스 디렉터리가 없습니다: $RELEASE_DIR" >&2
  exit 1
fi

for file in package.json package-lock.json prisma/schema.prisma; do
  [ -r "$RELEASE_DIR/$file" ] || { echo "필수 파일이 없습니다: $RELEASE_DIR/$file" >&2; exit 1; }
done
if [ -L "$ENV_FILE" ] || [ ! -f "$ENV_FILE" ] || [ ! -r "$ENV_FILE" ]; then
  echo "환경 파일은 읽을 수 있는 일반 파일이어야 합니다: $ENV_FILE" >&2
  exit 1
fi

load_environment() {
  local line key value
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      *$'\r') line=${line%$'\r'} ;;
    esac
    case "$line" in
      ""|\#*) continue ;;
    esac
    if [[ "$line" != *=* ]]; then
      echo "환경 파일 형식이 올바르지 않습니다." >&2
      exit 1
    fi
    key=${line%%=*}
    value=${line#*=}
    case "$key" in
      NODE_ENV|DATABASE_URL|AUTH_SECRET|APP_URL|TRUST_PROXY|SERVER_ACTION_ALLOWED_ORIGINS|AI_API_KEY|AI_BASE_URL|AI_MODEL|CLAMAV_SOCKET|CLAMAV_HOST|CLAMAV_PORT|TEACHER_INVITE_CODE) ;;
      *) echo "환경 파일에 허용되지 않은 항목이 있습니다: $key" >&2; exit 1 ;;
    esac
    case "$value" in
      \"*\")
        if [ "${#value}" -lt 2 ]; then
          echo "환경 파일 형식이 올바르지 않습니다." >&2
          exit 1
        fi
        value=${value:1:${#value}-2}
        ;;
      \'*\')
        if [ "${#value}" -lt 2 ]; then
          echo "환경 파일 형식이 올바르지 않습니다." >&2
          exit 1
        fi
        value=${value:1:${#value}-2}
        ;;
    esac
    printf -v "$key" '%s' "$value"
    export "$key"
  done < "$ENV_FILE"
}

load_environment
export NODE_ENV=production

HEALTH_URL=${HEALTH_URL:-http://127.0.0.1:${app_port_number}/api/health}
if [ "$HEALTH_URL" != "http://127.0.0.1:${app_port_number}/api/health" ]; then
  echo "HEALTH_URL은 로컬 애플리케이션 health 경로만 허용됩니다." >&2
  exit 1
fi

cd "$RELEASE_DIR"
if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
  echo "서비스 사용자를 찾을 수 없습니다: $SERVICE_USER" >&2
  exit 1
fi
chown -R "$SERVICE_USER":"$SERVICE_USER" "$RELEASE_DIR"
BUILD_HOME="$RELEASE_DIR/.build-home"
mkdir -p "$BUILD_HOME"
chown "$SERVICE_USER":"$SERVICE_USER" "$BUILD_HOME"
chmod 0700 "$BUILD_HOME"
cleanup_build_home() { rm -rf -- "$BUILD_HOME"; }
trap cleanup_build_home EXIT
run_as_service() {
  runuser --preserve-environment -u "$SERVICE_USER" -- env \
    HOME="$BUILD_HOME" \
    NPM_CONFIG_CACHE="$BUILD_HOME/.npm" \
    "$@"
}
run_as_service npm ci --include=dev --ignore-scripts
run_as_service npm run ops:check-env:production
run_as_service npm run db:generate
run_as_service npm run db:preflight
run_as_service npm run db:deploy
rm -rf "$RELEASE_DIR/.next"
run_as_service npm run build

chown -R root:"$SERVICE_USER" "$RELEASE_DIR"
find "$RELEASE_DIR" -type d -exec chmod 0750 {} +
find "$RELEASE_DIR" -type f -perm /111 -exec chmod 0750 {} +
find "$RELEASE_DIR" -type f ! -perm /111 -exec chmod 0640 {} +

previous_target=$(readlink -f -- "$APP_ROOT/current" 2>/dev/null || true)
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
  case "$previous_target" in
    "$APP_ROOT"/releases/*)
      if [ -d "$previous_target" ]; then
        ln -sfnT "$previous_target" "$APP_ROOT/current"
        systemctl restart "$SERVICE_NAME.service" || true
      fi
      ;;
  esac
  systemctl status "$SERVICE_NAME.service" --no-pager -l || true
  exit 1
fi

echo "배포 완료: $RELEASE_DIR"
curl --fail --silent --show-error "$HEALTH_URL"
