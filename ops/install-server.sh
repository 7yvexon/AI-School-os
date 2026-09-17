#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "root 권한이 필요합니다." >&2
  exit 1
fi

APP_ROOT=${APP_ROOT:-/srv/app}
CONFIG_ROOT=${CONFIG_ROOT:-/etc/app}
ENV_FILE=${ENV_FILE:-$CONFIG_ROOT/app.env}
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
  ''|*[!a-zA-Z0-9_-]*) echo "SERVICE_USER는 영문자·숫자·밑줄·하이픈 조합이어야 합니다." >&2; exit 1 ;;
esac
case "$SERVICE_NAME" in
  ''|*[!a-zA-Z0-9_-]*) echo "SERVICE_NAME은 영문자·숫자·밑줄·하이픈 조합이어야 합니다." >&2; exit 1 ;;
esac
case "$APP_PORT" in
  ''|*[!0-9]*) echo "APP_PORT는 숫자여야 합니다." >&2; exit 1 ;;
esac
if [ "$APP_PORT" -lt 1 ] || [ "$APP_PORT" -gt 65535 ]; then
  echo "APP_PORT는 1에서 65535 사이여야 합니다." >&2
  exit 1
fi
if [[ ! "$APP_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "APP_ROOT는 안전한 절대 경로여야 합니다." >&2
  exit 1
fi
if [[ ! "$CONFIG_ROOT" =~ ^/[A-Za-z0-9._/-]+$ ]]; then
  echo "CONFIG_ROOT는 안전한 절대 경로여야 합니다." >&2
  exit 1
fi
case "$PUBLIC_HOSTNAME" in
  ''|*[!a-zA-Z0-9._-]*) echo "PUBLIC_HOSTNAME은 도메인 형식이어야 합니다." >&2; exit 1 ;;
esac
case "$APP_URL" in
  *[[:space:]\|\&\;]*) echo "APP_URL에 허용되지 않는 문자가 있습니다." >&2; exit 1 ;;
esac

command -v systemctl >/dev/null
command -v openssl >/dev/null
command -v node >/dev/null
command -v npm >/dev/null

node_major=$(node --version | sed -E 's/^v([0-9]+).*/\1/')
node_minor=$(node --version | sed -E 's/^v[0-9]+\.([0-9]+).*/\1/')
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

install -d -o root -g "$SERVICE_USER" -m 0750 "$APP_ROOT" "$APP_ROOT/releases"
install -d -o root -g root -m 0750 "$CONFIG_ROOT"

db_password=""
auth_secret=""
if [ ! -r "$ENV_FILE" ]; then
  db_password=$(openssl rand -hex 32)
  auth_secret=$(openssl rand -hex 32)
  if runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_roles WHERE rolname = '$DB_ROLE'" | grep -qx 1; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -v db_role="$DB_ROLE" -v db_password="$db_password" <<'SQL'
SELECT format('ALTER ROLE %I LOGIN PASSWORD %L', :'db_role', :'db_password')\gexec
SQL
  else
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -v db_role="$DB_ROLE" -v db_password="$db_password" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'db_role', :'db_password')\gexec
SQL
  fi
  if ! runuser -u postgres -- psql -Atqc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -qx 1; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -v db_role="$DB_ROLE" -v db_name="$DB_NAME" <<'SQL'
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_role')\gexec
SQL
  fi
  umask 0077
  cat >"$ENV_FILE" <<EOF
NODE_ENV=production
DATABASE_URL=postgresql://${DB_ROLE}:${db_password}@127.0.0.1:5432/${DB_NAME}?schema=public
AUTH_SECRET=${auth_secret}
APP_URL=${APP_URL}
TRUST_PROXY=true
SERVER_ACTION_ALLOWED_ORIGINS=${PUBLIC_HOSTNAME}
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=
EOF
  chown root:"$SERVICE_USER" "$ENV_FILE"
  chmod 0640 "$ENV_FILE"
else
  chmod 0640 "$ENV_FILE"
  chown root:"$SERVICE_USER" "$ENV_FILE"
fi

if [ ! -f "$SCRIPT_DIR/ai-school-os.service" ]; then
  echo "서비스 템플릿을 찾지 못했습니다: $SCRIPT_DIR/ai-school-os.service" >&2
  exit 1
fi
rendered_service=$(mktemp)
trap 'rm -f "$rendered_service"' EXIT
sed \
  -e "s|__APP_ROOT__|$APP_ROOT|g" \
  -e "s|__CONFIG_ROOT__|$CONFIG_ROOT|g" \
  -e "s|__APP_PORT__|$APP_PORT|g" \
  -e "s|__SERVICE_USER__|$SERVICE_USER|g" \
  -e "s|__SERVICE_NAME__|$SERVICE_NAME|g" \
  "$SCRIPT_DIR/ai-school-os.service" >"$rendered_service"
install -o root -g root -m 0644 "$rendered_service" "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME.service"

echo "서버 기본 설정 완료: $APP_ROOT · $ENV_FILE · $SERVICE_NAME.service"
