# 운영 배포

AI School OS는 운영 서버에서 Docker 없이 systemd와 로컬 PostgreSQL을 사용합니다. 애플리케이션은 외부에 직접 노출하지 않고 `127.0.0.1:<app-port>`에만 바인딩하며, Cloudflare Tunnel의 공개 호스트 라우트가 `https://<public-hostname>`을 이 포트로 전달합니다.

저장소에는 실제 운영 경로·포트·도메인·터널 이름을 기록하지 않습니다. 설치와 배포 때 서버 운영자가 환경변수로 값을 주입하고, 실제 값은 서버의 환경 파일과 systemd 유닛에만 둡니다.

## 구성

- 릴리스: `<app-root>/releases/<release-id>`
- 현재 릴리스: `<app-root>/current`
- 환경 파일: `<config-root>/app.env` (root와 전용 서비스 그룹만 읽기)
- 데이터베이스: 로컬 PostgreSQL, `<db-name>`
- 애플리케이션: `<service-name>.service`, `127.0.0.1:<app-port>`
- 공개 경로: 기존 Cloudflare Tunnel의 `<public-hostname>` 라우트

## 최초 설치

서버에 Node.js 22.12 이상과 Git/SSH가 준비된 상태에서 저장소를 `<app-root>/releases/<release-id>`에 배치하고 root로 실행합니다. 아래 예시의 모든 `your-*` 값을 실제 운영 값으로 교체합니다.

```bash
cd <release-dir>
APP_ROOT=/srv/your-app \
CONFIG_ROOT=/etc/your-app \
APP_PORT=3000 \
SERVICE_USER=svc-your-app \
SERVICE_NAME=your-app \
DB_ROLE=your_app \
DB_NAME=your_app \
PUBLIC_HOSTNAME=app.example.com \
bash ops/install-server.sh

APP_ROOT=/srv/your-app \
CONFIG_ROOT=/etc/your-app \
APP_PORT=3000 \
SERVICE_USER=svc-your-app \
SERVICE_NAME=your-app \
bash ops/deploy.sh /srv/your-app/releases/<release-id>
```

`install-server.sh`는 PostgreSQL 16을 설치·활성화하고, 전용 DB 역할·데이터베이스·환경 파일·systemd 유닛을 최초 한 번 생성합니다. Docker Compose 개발 환경은 PostgreSQL 17 이미지를 사용하므로 운영 설치와 개발 환경의 PostgreSQL 주 버전이 다를 수 있지만, 저장소의 Prisma 스키마는 두 환경을 대상으로 합니다. 환경 파일이 이미 있으면 비밀값을 재생성하지 않습니다. 실제 운영 경로와 공개 호스트는 명령행 변수로만 전달됩니다.

## 릴리스 배포

새 릴리스 디렉터리를 만든 뒤 내부 메모리와 로컬 산출물을 제외한 소스를 복사하고 같은 배포 스크립트를 실행합니다.

```bash
mkdir -p /srv/your-app/releases/<release-id>
APP_ROOT=/srv/your-app \
CONFIG_ROOT=/etc/your-app \
APP_PORT=3000 \
SERVICE_USER=svc-your-app \
SERVICE_NAME=your-app \
bash ops/deploy.sh /srv/your-app/releases/<release-id>
```

운영 DB를 변경하기 전에는 새 릴리스에서 `npm run db:preflight`를 실행해 기존 데이터가 새 제약을 만족하는지 확인합니다. 점검이 통과한 뒤 스크립트는 전용 서비스 사용자로 `npm ci --ignore-scripts` → Prisma Client 생성 → 마이그레이션 적용 → 프로덕션 빌드 → `current` 심볼릭 링크 교체 → systemd 재시작 → `/api/health` 확인 순서로 동작합니다. health check가 실패하면 직전 릴리스 링크로 되돌린 뒤 서비스를 재시작합니다. 릴리스 디렉터리는 자동 삭제하지 않으므로 복구가 필요할 때까지 보존합니다.

소스 복사 시 `.git`, `.local`, `node_modules`, `.next`, `test-results`, `AGENTS.local.md` 같은 저장소·로컬 산출물과 내부 메모리는 릴리스에 넣지 않습니다.

## Cloudflare 라우트

Cloudflare One의 Tunnels & Mesh에서 사용할 터널을 열고 Published application routes에 다음 항목을 둡니다.

| 항목      | 값                       |
| --------- | ------------------------ |
| Tunnel    | `<existing-tunnel-name>` |
| Subdomain | `<subdomain>`            |
| Domain    | `<domain>`               |
| Type      | `HTTP`                   |
| URL       | `127.0.0.1:<app-port>`   |

라우트를 저장하면 DNS는 Cloudflare가 자동으로 구성합니다. 커넥터 토큰은 서버 전용 저장소에만 두고 저장소 문서나 로그에 넣지 않습니다.

## 환경변수

기본 운영값은 `<config-root>/app.env`에 생성됩니다. 환경 파일의 `NODE_ENV`는 반드시 `production`이어야 하며 배포 스크립트가 이 값을 확인합니다. `APP_URL`, `TRUST_PROXY`, `SERVER_ACTION_ALLOWED_ORIGINS`는 공개 호스트에 맞춰 설정하고, `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` 중 하나라도 비어 있으면 AI 기능은 비활성화된 상태로 핵심 학습 기능을 사용할 수 있습니다. 운영의 `AI_BASE_URL`은 HTTPS를 사용해야 합니다. 첨부파일을 사용하려면 `CLAMAV_SOCKET` 또는 `CLAMAV_HOST`·`CLAMAV_PORT`를 설정하고, scanner가 응답하지 않으면 파일은 격리 상태로 남습니다. 실제 AI·ClamAV를 연결할 때는 비밀값과 endpoint를 환경 파일에만 넣고 `<service-name>` 서비스를 재시작합니다.

학생과 선생님 모두 회원가입 화면에서 역할을 선택할 수 있고 전화번호를 필수로 입력합니다. 이메일 소유권과 전화번호 진위는 자동 검증하지 않으며, 교사 가입은 승인 대기 상태로 저장됩니다. 실제 학교 운영에서는 관리자가 대시보드·DB를 확인해 비정상 계정을 수동 정리해야 합니다.

## 점검 명령

```bash
systemctl status <service-name> --no-pager -l
journalctl -u <service-name> -n 100 --no-pager
curl -i http://127.0.0.1:<app-port>/api/health
curl -I https://<public-hostname>
systemctl status <tunnel-service> --no-pager -l
```

`/api/health`는 설정 또는 PostgreSQL 연결이 실패하면 503을 반환합니다. AI 설정이 비어 있는 것은 준비 상태 실패가 아닙니다.

## 주의사항

- 운영 DB에 `npm run db:seed`를 실행하지 않습니다. 샘플 계정은 개발 환경 전용입니다.
- `AUTH_SECRET`을 변경하면 기존 세션이 무효화됩니다.
- PostgreSQL 백업·복구 정책은 별도로 마련해야 합니다. 최소한 `pg_dump` 정기 백업과 복구 리허설을 운영 절차에 추가하세요.
- Cloudflare Tunnel 토큰과 `<config-root>/app.env`를 저장소나 로그에 남기지 않습니다.
