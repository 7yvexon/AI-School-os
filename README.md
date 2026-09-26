# AI School OS

> 과제를 등록하고, AI로 시작점을 찾고, 제출과 피드백까지 이어 가는 학교용 학습 워크스페이스

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.12-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2F17-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

AI School OS는 교사와 학생이 클래스, 과제, 개인 일정, AI 대화, 제출물 검토를 한 흐름에서 관리할 수 있도록 만든 **AI 기반 학교 과제 관리 SaaS MVP**입니다. 현재는 로컬 실행과 제품 시연에 초점을 둔 공개 저장소이며, 결제·학교 계정 연동은 포함하지 않습니다. 자체 호스팅을 위한 systemd·로컬 PostgreSQL·Cloudflare Tunnel 배포 스크립트는 제공하지만, 관리형 배포 서비스나 운영 지원은 제공하지 않습니다.

## 프로젝트 성격과 이용 범위

이 프로젝트는 **범서고등학교 모의창업 활동을 위해 제작한 교육·시연용 프로젝트**입니다. 배포된 주소가 있다면 불특정 다수가 화면과 기능을 이용할 수 있지만, 공개 접근이 가능하다는 사실이 정식 서비스 제공을 뜻하지는 않습니다.

현재 정식 서비스 대상은 범서고등학교 모의창업 활동의 시연과 제한된 검증 범위입니다. 학교의 공식 시스템, 상용 서비스, 유료 서비스 또는 지속적인 고객 지원을 제공하는 서비스로 운영하지 않으며, 가용성·데이터 보존·지원 수준을 보장하지 않습니다. 실제 학생·교직원 개인정보와 제출물을 입력하지 말고, 시연과 테스트에는 허가받은 최소한의 데이터만 사용하세요.

외부 공개와 서비스 이용은 [라이선스](LICENSE)의 이용 범위와 포함된 제3자 자료의 라이선스를 함께 따라야 합니다. 공개된 데모를 정식 서비스나 학교의 공식적인 안내로 오해하지 않도록 운영 환경에 이 안내를 함께 표시하세요. 화면의 [개인정보 안내](/privacy)에는 현재 저장·삭제 동작과 AI 전송 범위를 설명합니다.

## 제품 미리보기

첫 화면에서 과제·일정·제출·피드백 관리와 AI 학습 도우미를 소개합니다. 실제 클래스
보드와 계정 기능은 가입·로그인 후 확인할 수 있습니다.

기존 제품 필름 자산은 오프라인 렌더링과 시각 회귀 확인을 위한 별도 도구로만 남아
있습니다. 생성 원본과 배경 출처는 [미디어 설명](public/media/ASSETS.md)에서 확인할 수
있습니다.

### 오프라인 제품 필름 다시 렌더링

기본 랜딩에는 제품 필름을 로드하지 않습니다. 개발 서버를 `3000`번 포트로 실행한
상태에서 숨겨진 `/film-render` 경로를 사용하면 WebCodecs를 지원하는 Playwright
Chromium으로 필름 자산을 다시 렌더링할 수 있습니다.

Playwright 브라우저는 전역 캐시 대신 프로젝트 내부에 설치하는 방식을 권장합니다.

PowerShell:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "0"
npx playwright install chromium
```

macOS·Linux:

```bash
export PLAYWRIGHT_BROWSERS_PATH=0
npx playwright install chromium
```

설치와 렌더러 실행은 같은 터미널에서 진행합니다.

```bash
node scripts/render-school-film.cjs
```

`src/lib/school-film.ts`의 기기·조명·예시 UI를 Mediabunny와 WebCodecs로 24fps, 20초 렌더링해 `public/media/school-film.webm`과 포스터를 갱신합니다.

## 목차

- [주요 기능](#주요-기능)
- [오프라인 제품 필름 다시 렌더링](#오프라인-제품-필름-다시-렌더링)
- [빠른 시작](#빠른-시작)
- [환경변수와 AI 연결](#환경변수와-ai-연결)
- [개발용 샘플 계정](#개발용-샘플-계정)
- [개발 명령과 테스트](#개발-명령과-테스트)
- [프로젝트 구조](#프로젝트-구조)
- [보안과 운영 범위](#보안과-운영-범위)
- [로드맵](#로드맵)
- [기여하기](#기여하기)
- [라이선스](#라이선스)

## 주요 기능

| 영역      | 학생                                                            | 선생님                                             | 공통 기반                         |
| --------- | --------------------------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| 클래스    | 초대 코드로 클래스 참여                                         | 클래스 생성·초대 코드 재발급·학생 관리             | 역할별 접근 제어                  |
| 과제      | 긴급·이번 주·나중 필터, 즐겨찾기, 완료 처리                     | 과제 CRUD, 보관·복원, 수행평가·시험·준비물 유형    | PostgreSQL·Prisma 영속화          |
| 학습 흐름 | 과제별 AI 대화, 기록 복원, 텍스트 제출, 피드백 확인             | 제출물 검토, 수정 요청·검토 완료, 학생별 완료 현황 | 과제별 대화·제출 기록 저장        |
| 생활 관리 | 개인 일정·월간 캘린더(사용자별 최대 500개), 학교·학년·반 프로필 | 학생 목록·클래스별 현황                            | 반응형 화면, 로딩·오류·빈 상태    |
| 운영      | FREE 하루 10회 / PRO 하루 100회 AI 한도 확인                    | 개발환경에서 사용자 플랜 확인                      | 세션·요청 제한·첨부파일 권한 검사 |

- **AI 과제 도우미**: 과목·제목·설명·평가기준·마감일·학년 정보·현재 한국 날짜·남은 날짜를 서버에서 구성합니다. AI 사용 동의 후 최근 최대 16개 메시지(총 24,000자 이내)와 현재 질문을 설정한 모델로 전달하고, 화면에는 최신 100개 메시지를 표시합니다. 프로필의 이름·학교·반은 자동으로 포함하지 않지만, 질문·대화·과제 내용에 직접 입력한 정보는 자동으로 걸러지지 않습니다. 학생은 설정에서 대화 기록을 직접 삭제할 수 있습니다.
- **사용량 제한**: 한국 시간 자정 기준 FREE 10회, PRO 100회입니다. 인증은 IP와 실패한 이메일·IP 조합별 제한, 클래스 참여와 AI 요청은 IP와 사용자별 제한을 함께 적용합니다. 대화 잠금 뒤 사용자별 사용량과 서비스 전체 한도를 함께 예약하며, 잠금이나 한도 검사에서 거절된 요청은 전체 한도를 소진하지 않습니다. 외부 제공자 오류가 나도 예약한 횟수는 복구하지 않습니다.
- **첨부파일**: PDF·PNG·JPEG·TXT를 파일당 최대 5MiB까지 저장하며 클래스별 50개·50MiB 총량을 제한합니다. 검사 전에는 동시 업로드의 예약량까지 포함해 저장 한도를 확인하고 저장 트랜잭션에서 다시 확인합니다. 검사에 통과한 파일만 다운로드할 수 있고, 검사 서비스가 없거나 오류가 나면 파일을 검사 대기 상태로 저장해 다운로드를 차단합니다. 파일 내용 자동 분석은 아직 제공하지 않습니다.
- **제출·검토**: 학생은 텍스트 결과를 제출하고, 선생님은 `수정 요청` 또는 `검토 완료`와 피드백을 기록합니다. 모든 검토 결과를 이력으로 남기며, 과제 보관은 제출물과 AI 기록을 삭제하지 않습니다.
- **랜딩 경험**: 과제·일정 관리와 AI 도우미를 소개합니다. 계정 생성 뒤 학생은 클래스에 참여하고 AI 사용에 동의해야 과제별 질문을 보낼 수 있습니다.

실제 계정으로 위 흐름을 따라가려면 [제품 시연 가이드](docs/product-walkthrough.md)를 참고하세요. 선생님과 학생은 서로 다른 브라우저 프로필 또는 시크릿 창에서 실행하는 것이 좋습니다.

## 기술 스택

Next.js 16.3.4 App Router · React 19 · TypeScript · Tailwind CSS 4 · Lucide · Three.js · PostgreSQL 16/17 · Prisma 6.19.3 · Zod · bcryptjs · Playwright

인증은 직접 구현한 서버 세션 방식입니다. UI는 별도 shadcn/ui 의존성 없이 재사용 컴포넌트와 CSS로 구성했습니다. Prisma는 6.x로 고정했고 `package-lock.json`을 함께 관리합니다.

## 빠른 시작

### 준비물

- Node.js **22.12 이상**과 npm
- 방법 A 또는 방법 B 중 하나의 PostgreSQL 실행 환경. Docker Compose는 PostgreSQL 17을 사용하고, 운영 설치 스크립트는 PostgreSQL 16을 설치합니다.

### 1. 저장소 설치

```bash
git clone https://github.com/7yvexon/AI-School-os.git
cd AI-School-os
npm ci
```

### 방법 A: 내장 PostgreSQL

첫 번째 터미널에서 개발용 DB를 실행하고 터미널을 열어 둡니다.

```bash
npm run dev:db
```

`127.0.0.1:5432`에 DB를 만들고, `.env`가 없으면 무작위 `AUTH_SECRET`을 포함해 생성합니다. 데이터는 `.local/postgres`에 유지됩니다.

두 번째 터미널에서 스키마·샘플 데이터를 준비하고 서버를 시작합니다.

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다. 5432 포트를 이미 사용 중이면 방법 B를 사용하거나 `.env`의 `DATABASE_URL`을 기존 DB로 바꾸세요.

### 방법 B: Docker 또는 기존 PostgreSQL

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up -d db
```

macOS·Linux:

```bash
cp .env.example .env
docker compose up -d db
```

`.env`의 `POSTGRES_PASSWORD`와 `DATABASE_URL`에 있는 로컬 DB 비밀번호 자리표시자를 같은 값으로 교체하고, `AUTH_SECRET`을 최소 32자 무작위 값으로 교체합니다.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

그 다음 방법 A와 같은 `db:generate` → `db:deploy` → `db:seed` → `dev` 순서로 실행합니다. Docker 예시의 DB 사용자·비밀번호는 개발 전용입니다.

## 환경변수와 AI 연결

`.env.example`을 복사해 `.env`를 만들고 환경에 맞는 값을 입력합니다.

배포 전에 `NODE_ENV=production`으로 실행 환경을 선택한 뒤 `npm run ops:check-env`를 실행하면 데이터베이스 URL, 인증 비밀값, 외부 URL, 프록시 설정을 값 자체를 출력하지 않고 확인할 수 있습니다. 이 명령은 서버를 시작하지 않으므로 배포 파이프라인의 사전 점검 단계에서 사용할 수 있습니다. PowerShell에서는 `$env:NODE_ENV = "production"; npm run ops:check-env`, macOS·Linux에서는 `NODE_ENV=production npm run ops:check-env`를 사용합니다.

| 변수                               | 필수         | 설명                                                                                                   |
| ---------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                     | 예           | PostgreSQL 연결 문자열. `.env.example`의 자리표시자를 실제 개발 DB 값으로 교체합니다.                  |
| `AUTH_SECRET`                      | 예           | 최소 32자 무작위 비밀값. 변경하면 기존 세션이 무효화됩니다.                                            |
| `APP_URL`                          | 예           | 외부 접속 원본 URL. 로컬 기본값은 `http://localhost:3000`이며 AI API Origin 검사에 사용합니다.         |
| `TRUST_PROXY`                      | 배포 시      | 운영에서는 `true`여야 하며, Cloudflare가 설정하는 단일 `CF-Connecting-IP` 주소를 IP 제한에 사용합니다. |
| `SERVER_ACTION_ALLOWED_ORIGINS`    | 배포 시      | 프록시가 사용하는 Server Action 허용 호스트를 쉼표로 구분해 입력합니다.                                |
| `AI_API_KEY`                       | AI 사용 시   | OpenAI 호환 제공자의 API 키. 서버에서만 읽습니다.                                                      |
| `AI_BASE_URL`                      | AI 사용 시   | `/chat/completions` 앞까지의 URL. 운영에서는 HTTPS를 사용합니다. 예: `https://api.openai.com/v1`       |
| `AI_MODEL`                         | AI 사용 시   | 제공자가 지원하는 모델 ID                                                                              |
| `AI_ALLOW_INSECURE_HTTP_LOCALHOST` | 테스트 시    | 비운영 E2E의 로컬호스트 AI 픽스처에만 HTTP를 허용합니다. 운영 환경에서는 설정하지 않습니다.            |
| `CLAMAV_SOCKET` / `CLAMAV_HOST`    | 첨부 사용 시 | ClamAV Unix socket 또는 TCP 호스트입니다. 둘 다 없으면 첨부파일은 격리 상태로 남습니다.                |
| `CLAMAV_PORT`                      | 첨부 사용 시 | ClamAV TCP 포트이며 기본값은 `3310`입니다.                                                             |

AI를 연결하려면 위 AI 변수 3개를 설정하고 서버를 재시작한 뒤 학생 과제 상세에서 AI 사용에 동의하고 질문합니다. 서버는 사용자별 일일 한도와 서비스 전체 기본 1,000회/일 상한을 함께 적용하며, `POST {AI_BASE_URL}/chat/completions`로 `{ model, messages, max_completion_tokens: 1600 }`을 보내는 비스트리밍 어댑터를 사용합니다. 다른 응답 형식은 [AI 어댑터](src/lib/ai.ts)에서 조정합니다.

대화 잠금이나 사용자별·전체 한도에서 거절된 질문은 사용량을 예약하지 않습니다. 예약된 AI 질문 시도는 외부 제공자의 오류나 시간 초과가 발생해도 사용량을 복구하지 않습니다. 제공자 비용과 로컬 사용량이 서로 어긋나 quota를 우회하지 않도록 보수적으로 계산합니다.

동의 화면에는 현재 제공자 호스트와 모델이 표시됩니다. 제공자 호스트나 모델이 바뀌면 다시 동의해야 합니다. AI에 학년 정보, 과제 문맥, 최근 대화와 현재 질문을 보냅니다. 프로필의 이름·학교·반·이메일·비밀번호·세션은 자동으로 붙이지 않지만, 자유 입력과 과제 내용의 개인정보는 자동으로 제거되지 않습니다. 시연용 서비스에는 실제 개인정보를 입력하지 마세요. 대화 기록은 학생이 삭제할 때까지 저장되며, 동의 철회만으로 기존 대화는 지워지지 않습니다. 이미 진행 중인 요청은 외부 제공자에게 도착할 수 있고, 외부 데이터 삭제는 제공자 정책을 따릅니다.

`.env`와 API 키는 절대 커밋하지 마세요. AI 설정이 비어 있어도 클래스·과제·제출 기능은 동작하며 AI 영역에는 연결 필요 상태가 표시됩니다.

운영 배포는 Cloudflare Tunnel을 사용하고 앱은 loopback에 바인딩합니다. `TRUST_PROXY=true`일 때 앱은 `CF-Connecting-IP`만 신뢰하며, 사용자 제공 `X-Forwarded-For` 값은 요청 제한에 사용하지 않습니다. 다른 프록시를 사용할 때는 검증된 클라이언트 주소를 `CF-Connecting-IP`로 덮어쓰도록 구성하세요.

## 개발용 샘플 계정

`npm run db:seed`는 운영 환경(`NODE_ENV=production`)에서 실행되지 않습니다. 아래 계정은 로컬 시연 전용이며 교사 샘플 계정은 이미 승인된 상태로 생성됩니다.

<details>
<summary>샘플 계정과 클래스 정보 보기</summary>

| 역할   | 이메일                | 비밀번호                 |
| ------ | --------------------- | ------------------------ |
| 선생님 | `teacher@example.com` | `npm run db:seed` 출력값 |
| 학생   | `student@example.com` | `npm run db:seed` 출력값 |

- 샘플 클래스: **2학년 탐구 수업**
- 초대 코드: `BSS-7FBB881CA2`
- 샘플 과제: **주제 탐구 보고서**
- 샘플 마감일: `prisma/seed.ts`에 정의된 **2026-09-20 23:59 (한국)**

`npm run db:seed`는 로컬 시연용 임시 비밀번호를 실행할 때 생성해 터미널에 한 번 출력합니다. 마감일은 실행 시점에 따라 D-Day 또는 기한 지남으로 표시될 수 있습니다. 시연 날짜가 지난 경우 새 과제를 만들어 현재 날짜에 맞춰 보여 주세요.

</details>

플랜을 변경하는 로그인 사용자용 API나 결제 연동은 없습니다. 개발환경에서만 `npm run dev:plan -- student@example.com PRO` 또는 `npm run dev:plan -- student@example.com FREE`로 플랜별 화면과 한도를 확인할 수 있습니다. 신규 가입은 전화번호를 요구하지 않으며 이메일 소유 여부를 확인하지 않습니다. 실제 이메일이나 학생 정보를 쓰지 마세요. 교사 계정은 운영 담당자 승인 후 로그인할 수 있으며 DB 운영자는 `npm run teacher:approve -- teacher@example.com`을 실행합니다.

## 개발 명령과 테스트

| 명령                                           | 용도                                        |
| ---------------------------------------------- | ------------------------------------------- |
| `npm run dev`                                  | 개발 서버 실행                              |
| `npm start`                                    | 빌드 결과를 사용하는 프로덕션 서버 실행     |
| `npm run typecheck`                            | TypeScript 타입 검사                        |
| `npm run lint`                                 | ESLint 정적 검사                            |
| `npm run test`                                 | 도메인 단위 테스트                          |
| `npm run build`                                | Prisma Client 생성 및 프로덕션 빌드         |
| `npm run test:e2e`                             | 독립 DB·AI 픽스처를 사용하는 Playwright E2E |
| `npm run format`                               | Prettier 포맷 적용                          |
| `npm run format:check`                         | Prettier 포맷 검사                          |
| `npm run db:generate`                          | Prisma Client 생성                          |
| `npm run ops:check-deprecations`               | 잠금 파일의 deprecated 의존성 사전 점검     |
| `npm run db:migrate -- --name describe_change` | 개발 마이그레이션 생성                      |
| `npm run db:deploy`                            | 저장소 마이그레이션 적용                    |
| `npm run db:preflight`                         | 무변경 migration 데이터 사전 점검           |
| `npm run db:seed`                              | 개발 샘플 데이터 생성/갱신                  |
| `npm run db:cleanup`                           | 만료 세션·요청 제한·첨부 예약 배치 정리     |
| `npm run attachments:scan`                     | 격리·검사 오류 첨부파일을 파일별로 재검사   |
| `npm run ops:check-env`                        | 운영 환경변수 사전 점검                     |
| `npm run ops:check-env:production`             | 운영 모드 환경변수 사전 점검                |
| `npm run teacher:approve -- email`             | DB 운영자용 기존 교사 승인 상태 보정        |
| `npm run dev:plan -- student@example.com PRO`  | 개발환경 플랜 변경                          |

권장 검증 순서는 다음과 같습니다.

처음 한 번은 위의 프로젝트 내부 Chromium 설치를 실행한 뒤 아래 명령을 사용합니다.

```bash
npm run format
npm run ops:check-deprecations
npm run db:generate
npm run lint
npm run format:check
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

`npm run ops:check-deprecations`는 `package-lock.json`의 deprecated 메타데이터를 점검합니다. 현재는 Next.js ESLint 플러그인 호환성 때문에 `eslint@9.39.5`만 허용하며, 다른 항목이나 ESLint 버전 변경은 검토 없이 통과하지 않습니다. 운영 환경 점검은 AI 설정이 전부 비어 있으면 AI 비활성화를 허용하고, 세 변수 일부만 설정했거나 `AI_BASE_URL`이 HTTP면 배포를 중단합니다.

E2E는 `55433` 포트의 별도 PostgreSQL(`.local/e2e-postgres-v4`), 기본 `3100` 포트의 빌드된 Next.js 서버, 그리고 loopback에서 실행되는 결정적 로컬 AI 픽스처를 사용합니다. AI 픽스처 포트는 기본적으로 비어 있는 포트를 자동 할당하며 `E2E_AI_MOCK_PORT`로 고정할 수 있습니다. 실제 운영 DB나 외부 AI 키를 호출하지 않으며 프로젝트 내부 Chromium을 설치한 뒤 `npm run build`를 먼저 실행해야 합니다.

`AI_ALLOW_INSECURE_HTTP_LOCALHOST=true`는 E2E 실행기가 로컬 AI 픽스처를 사용할 때만 주입합니다. 개발자가 외부 AI를 연결할 때는 HTTPS `AI_BASE_URL`을 사용하고 이 변수를 직접 설정하지 마세요.

## 프로젝트 구조

```text
prisma/                  스키마·마이그레이션·개발 시드
scripts/                 로컬 DB·E2E 서버·플랜·제품 필름 도구
public/media/            제품 영상·포스터·배경·출처 설명
docs/                    제품 시연 가이드
src/app/                 랜딩·인증·학생·선생님 라우트와 서버 작업
src/components/          폼·대화·공통 화면·랜딩 연출
src/lib/                 DB·세션·권한·AI·날짜·요청 제한
tests/                   도메인 테스트·Playwright E2E
```

주요 데이터 모델은 [Prisma 스키마](prisma/schema.prisma), 실제 흐름은 [시연 가이드](docs/product-walkthrough.md)에서 확인할 수 있습니다.

## 보안과 운영 범위

- bcrypt(cost 12) 비밀번호 해시, UTF-8 72바이트 제한, 256비트 무작위 세션 토큰과 7일 만료, HttpOnly·SameSite=Lax 쿠키를 사용합니다. 운영 모드에서는 Secure 쿠키와 HTTPS가 필요합니다.
- 모든 서버 작업에서 역할·클래스 소속·소유권을 검사하고, Next.js Server Actions의 허용 Origin 검사와 AI API의 `APP_URL` 일치 검사를 사용합니다. `SERVER_ACTION_ALLOWED_ORIGINS`는 빌드 시 허용할 프록시 호스트 목록으로 반영되므로 환경변수를 바꾼 뒤 다시 빌드해야 합니다. 가입 이메일 소유권은 자동 검증하지 않으며, 교사 가입은 운영 담당자 승인 후 로그인할 수 있습니다.
- Zod 서버 검증, Prisma 매개변수 쿼리, React 텍스트 렌더링을 사용합니다. 사용자 HTML을 실행하지 않습니다.
- 첨부파일은 DB에 저장하고 파일당 5MiB·클래스별 50개·50MiB·선생님별 500MiB를 제한합니다. 검사 전에는 동시 업로드 예약량을 포함하고 저장 시 다시 확인하며, ClamAV 검사에 통과한 `CLEAN` 파일만 `application/octet-stream`·`nosniff`로 다운로드합니다. scanner가 없거나 오류가 난 파일은 격리 상태로 차단하고, 운영 재검사는 파일 데이터를 한 건씩 읽습니다.
- 인증·쓰기·AI·클래스 참여 요청에 IP·계정·이메일·실패한 이메일·IP 조합 기반 제한을 적용하고, AI에는 서비스 전체 일일 호출 상한도 적용합니다. `TRUST_PROXY=true`에서는 Cloudflare가 설정하는 `CF-Connecting-IP`만 사용합니다. 다른 프록시는 해당 헤더를 외부 입력에서 덮어써야 합니다.
- `GET /api/health`는 환경 설정과 PostgreSQL 연결을 확인하는 준비 상태 엔드포인트입니다. 두 항목이 모두 정상이면 200, 하나라도 확인하지 못하면 503을 반환하며 응답을 캐시하지 않습니다. AI는 선택 기능이므로 연결이 없어도 핵심 서비스의 준비 상태는 정상으로 표시됩니다.
- AI는 동의 후 학년 정보·과제 문맥·학생의 현재 질문·최근 대화를 외부 제공자에 전달합니다. 프로필의 반·이름·학교·이메일·비밀번호·세션은 자동으로 포함하지 않지만 자유 입력이나 과제 내용에 적힌 개인정보는 자동 제거되지 않습니다. AI 대화는 학생이 삭제할 때까지 저장되며 자동 만료되지 않습니다. 동의 철회는 이후 요청을 막지만 기록을 삭제하지 않고, 진행 중인 요청은 외부 전송될 수 있습니다. 외부 제공자 보관·지역·학습 사용 정책은 별도 설정에 따릅니다.
- 과제 삭제는 학생 작업을 보존하는 보관 처리이며 교사는 클래스 화면에서 복원할 수 있습니다. 만료 세션·요청 제한·첨부 업로드 예약 데이터는 운영 스케줄러에서 `npm run db:cleanup`을 주기적으로 실행하세요. 검사 중단 뒤 남은 첨부 예약은 2분 후 한도 계산에서 제외됩니다.
- 비밀번호 재설정·계정 삭제·학교 도메인 기반 교사 재직 인증은 아직 제공하지 않습니다. 가입 이메일은 확인되지 않으므로 실제 계정 정보나 학생 데이터를 입력하지 마세요. 개인정보 처리 문의는 개인정보 안내에 적힌 운영 담당자 문의 절차를 이용하세요.

공개 취약점 신고 방법은 [보안 정책](SECURITY.md)을 참고하세요. 운영 실행은 `npm run db:deploy` → `npm run build` → `npm start` 순서입니다. 자동 배포·PG 결제·외부 AI 계정 개설은 이 저장소의 범위가 아닙니다.

운영 서버(systemd·로컬 PostgreSQL·Cloudflare Tunnel) 배포 절차는 [운영 배포 문서](docs/deployment.md)를 참고하세요.

## 로드맵

- [x] 역할별 인증·세션·클래스·과제 CRUD
- [x] 과제별 AI 대화 저장·복원과 플랜별 사용량 제한
- [x] 학생 제출·선생님 검토·피드백 흐름
- [x] 첨부파일 권한 검사와 반응형 랜딩 경험
- [x] 학생·선생님 역할 가입·클래스 코드 재발급·학생 제외
- [x] 과제 보관·복원과 제출·검토 이력 보존
- [x] AI 동의·개인정보 최소화·대화 기록 삭제
- [ ] PRO 자동 공부계획과 고급 일정 분석
- [x] 첨부파일 quarantine·ClamAV 검사 경계
- [ ] 안전한 오브젝트 스토리지 분리·비밀번호 재설정·학교 도메인 기반 교사 재직 인증
- [ ] 결제·구독 관리와 자동 배포

로드맵의 미완료 항목은 현재 기능으로 광고하지 않으며 화면에서 준비 중으로 표시합니다.

## 기여하기

버그 제보, 문서 개선, 기능 제안은 환영합니다. 개발 환경과 PR 체크리스트는 [기여 가이드](CONTRIBUTING.md)를 먼저 읽어 주세요.

## 라이선스

이 저장소는 [범서고등학교 학생 제한적 이용 라이선스](LICENSE)를 적용합니다. GitHub 이용약관이 허용하는 서비스 내 열람·포크와 별개로, 저작권자의 승인 없이 코드를 서비스 밖에서 복제·수정·배포하거나 상업적으로 사용할 수 없습니다. 범서고등학교 재학생이 저작권자에게 본인과 재학 여부를 인증하고 승인받은 경우에만 승인 메시지 또는 허가서에 적힌 범위에서 사용할 수 있습니다. 별도 허가가 없는 기본 범위는 개인 학습과 범서고등학교 내부 수업·동아리·과제·비공개 시연으로 한정되며, 외부 공개·재배포·상업적 이용은 허용되지 않습니다. 저장소의 제3자 라이브러리·미디어에는 각자의 라이선스가 적용될 수 있으므로 함께 확인해 주세요.

## 유지보수 메모

`deepmerge-ts`는 Prisma 설정 로더의 하위 의존성입니다. 알려진 재귀 병합 취약점 영향을 줄이기 위해 `package.json`에 8.x override를 적용하고 Prisma 생성·마이그레이션·빌드로 호환성을 확인합니다.
