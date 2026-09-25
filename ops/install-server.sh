#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "root 권한이 필요합니다." >&2
  exit 1
fi

APP_ROOT=${APP_ROOT:-/srv/app}
CONFIG_ROOT=${CONFIG_ROOT:-/etc/app}
DB_ROLE=${DB_ROLE:-app}
DB_NAME=${DB_NAME:-app}
PUBLIC_HOSTNAME=${PUBLIC_HOSTNAME:?PUBLIC_HOSTNAME must be set}
APP_URL=${APP_URL:-https://$PUBLIC_HOSTNAME}
APP_PORT=${APP_PORT:-3000}
SERVICE_USER=${SERVICE_USER:-svc-app}
SERVICE_NAME=${SERVICE_NAME:-app}
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)

case "$DB_ROLE" in
  ''|*[!a-zA-Z0-9_]*|[0-9]*) echo "DB_ROLE은 영문자·숫자·밑줄 조합이어야 합니다." >&2; exit 1 ;;
esac
case "$DB_NAME" in
  ''|*[!a-zA-Z0-9_]*|[0-9]*) echo "DB_NAME은 영문자·숫자·밑줄 조합이어야 합니다." >&2; exit 1 ;;
esac
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
APP_PORT=$app_port_number
if [[ ! "$APP_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] || [ "$APP_ROOT" = "/" ]; then
  echo "APP_ROOT는 안전한 절대 경로여야 합니다." >&2
  exit 1
fi
if [[ ! "$CONFIG_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] || [ "$CONFIG_ROOT" = "/" ]; then
  echo "CONFIG_ROOT는 안전한 절대 경로여야 합니다." >&2
  exit 1
fi
case "$PUBLIC_HOSTNAME" in
  ''|*[!a-zA-Z0-9._-]*) echo "PUBLIC_HOSTNAME은 도메인 형식이어야 합니다." >&2; exit 1 ;;
esac
if [[ ! "$APP_URL" =~ ^https://[A-Za-z0-9.-]+(:[0-9]{1,5})?/?$ ]]; then
  echo "APP_URL은 HTTPS 원본 URL이어야 합니다." >&2
  exit 1
fi

command -v systemctl >/dev/null
command -v openssl >/dev/null
command -v node >/dev/null
command -v npm >/dev/null
command -v readlink >/dev/null
if [ ! -x /usr/bin/node ] || [ ! -x /usr/bin/npm ]; then
  echo "운영 서비스와 배포에는 /usr/bin/node 및 /usr/bin/npm이 필요합니다." >&2
  exit 1
fi

APP_ROOT=$(readlink -f -- "$APP_ROOT")
CONFIG_ROOT=$(readlink -f -- "$CONFIG_ROOT")
if [ "$APP_ROOT" = "/" ] || [ "$CONFIG_ROOT" = "/" ] ||
  [[ ! "$APP_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]] ||
  [[ ! "$CONFIG_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "APP_ROOT와 CONFIG_ROOT는 루트 디렉터리일 수 없습니다." >&2
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
  */../*|*/..|*/./*|*/.) echo "ENV_FILE에 허용되지 않는 경로 요소가 있습니다." >&2; exit 1 ;;
esac

if [ ! -f "$SCRIPT_DIR/ai-school-os.service" ]; then
  echo "서비스 템플릿을 찾지 못했습니다: $SCRIPT_DIR/ai-school-os.service" >&2
  exit 1
fi
if [ ! -f "$SCRIPT_DIR/ai-school-os-cleanup.service" ] ||
  [ ! -f "$SCRIPT_DIR/ai-school-os-cleanup.timer" ]; then
  echo "정리 작업용 systemd 템플릿을 찾지 못했습니다." >&2
  exit 1
fi

node_major=$(/usr/bin/node --version | sed -E 's/^v([0-9]+).*/\1/')
node_minor=$(/usr/bin/node --version | sed -E 's/^v[0-9]+\.([0-9]+).*/\1/')
if [ "$node_major" -lt 22 ] || { [ "$node_major" -eq 22 ] && [ "$node_minor" -lt 12 ]; }; then
  echo "Node.js 22.12 이상이 필요합니다." >&2
  exit 1
fi

if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
  useradd --system --home-dir /nonexistent --shell /usr/sbin/nologin --user-group "$SERVICE_USER"
fi

apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql-16 postgresql-client-16
systemctl enable --now postgresql
command -v psql >/dev/null
command -v runuser >/dev/null

install -d -o root -g "$SERVICE_USER" -m 0750 "$APP_ROOT" "$APP_ROOT/releases"
install -d -o root -g root -m 0750 "$CONFIG_ROOT"

db_password=""
auth_secret=""
if [ -L "$ENV_FILE" ]; then
  echo "환경 파일은 심볼릭 링크일 수 없습니다: $ENV_FILE" >&2
  exit 1
fi
if [ -e "$ENV_FILE" ]; then
  if [ ! -f "$ENV_FILE" ] || [ ! -r "$ENV_FILE" ]; then
    echo "환경 파일은 읽을 수 있는 일반 파일이어야 합니다: $ENV_FILE" >&2
    exit 1
  fi
  chmod 0640 "$ENV_FILE"
  chown root:"$SERVICE_USER" "$ENV_FILE"
else
  db_password=$(openssl rand -hex 32)
  auth_secret=$(openssl rand -hex 32)
  if runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_ROLE'" | grep -qx 1; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 <<SQL
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', '$DB_ROLE', '$db_password')\gexec
SQL
  else
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 <<SQL
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', '$DB_ROLE', '$db_password')\gexec
SQL
  fi
  if ! runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -qx 1; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 <<SQL
SELECT format('CREATE DATABASE %I OWNER %I', '$DB_NAME', '$DB_ROLE')\gexec
SQL
  fi
  umask 0077
  (
    set -o noclobber
    {
      printf '%s\n' 'NODE_ENV=production'
      printf 'DATABASE_URL=%s\n' "postgresql://${DB_ROLE}:${db_password}@127.0.0.1:5432/${DB_NAME}?schema=public"
      printf 'AUTH_SECRET=%s\n' "$auth_secret"
      printf 'APP_URL=%s\n' "$APP_URL"
      printf '%s\n' 'TRUST_PROXY=true'
      printf 'SERVER_ACTION_ALLOWED_ORIGINS=%s\n' "$PUBLIC_HOSTNAME"
      printf '%s\n' 'AI_API_KEY='
      printf '%s\n' 'AI_BASE_URL=https://api.openai.com/v1'
      printf '%s\n' 'AI_MODEL='
      printf '%s\n' 'CLAMAV_SOCKET='
      printf '%s\n' 'CLAMAV_HOST='
      printf '%s\n' 'CLAMAV_PORT=3310'
    } >"$ENV_FILE"
  )
  chown root:"$SERVICE_USER" "$ENV_FILE"
  chmod 0640 "$ENV_FILE"
fi

rendered_service=$(mktemp)
rendered_cleanup_service=$(mktemp)
rendered_cleanup_timer=$(mktemp)
trap 'rm -f "$rendered_service" "$rendered_cleanup_service" "$rendered_cleanup_timer"' EXIT
sed \
  -e "s|__APP_ROOT__|$APP_ROOT|g" \
  -e "s|__CONFIG_ROOT__|$CONFIG_ROOT|g" \
  -e "s|__ENV_FILE__|$ENV_FILE|g" \
  -e "s|__APP_PORT__|$APP_PORT|g" \
  -e "s|__SERVICE_USER__|$SERVICE_USER|g" \
  -e "s|__SERVICE_NAME__|$SERVICE_NAME|g" \
  "$SCRIPT_DIR/ai-school-os.service" >"$rendered_service"
sed \
  -e "s|__APP_ROOT__|$APP_ROOT|g" \
  -e "s|__CONFIG_ROOT__|$CONFIG_ROOT|g" \
  -e "s|__ENV_FILE__|$ENV_FILE|g" \
  -e "s|__SERVICE_USER__|$SERVICE_USER|g" \
  -e "s|__SERVICE_NAME__|$SERVICE_NAME|g" \
  "$SCRIPT_DIR/ai-school-os-cleanup.service" >"$rendered_cleanup_service"
sed \
  -e "s|__SERVICE_NAME__|$SERVICE_NAME|g" \
  "$SCRIPT_DIR/ai-school-os-cleanup.timer" >"$rendered_cleanup_timer"
install -o root -g root -m 0644 "$rendered_service" "/etc/systemd/system/$SERVICE_NAME.service"
install -o root -g root -m 0644 "$rendered_cleanup_service" "/etc/systemd/system/$SERVICE_NAME-cleanup.service"
install -o root -g root -m 0644 "$rendered_cleanup_timer" "/etc/systemd/system/$SERVICE_NAME-cleanup.timer"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME.service"
systemctl enable --now "$SERVICE_NAME-cleanup.timer"

echo "서버 기본 설정 완료: $APP_ROOT · $ENV_FILE · $SERVICE_NAME.service"
