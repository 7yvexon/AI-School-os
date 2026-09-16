# AI School OS

학생과 선생님을 연결하는 **AI 기반 학교 과제·수행평가 관리 SaaS MVP**입니다. 선생님이 과제를 등록하면 참여 학생의 대시보드에 표시되고, 학생은 과제 내용을 이해하는 AI와 대화한 뒤 결과를 제출할 수 있습니다.

메인페이지에는 **20초 제품 소개 영상**과 스크롤에 반응하는 **Three.js 기기 장면**을 적용했습니다. 영상 속 과제 확인 → AI 질문 → 제출 흐름은 예시 UI를 3D 장면으로 렌더링한 것입니다. 실제 계정의 화면 녹화나 실시간 AI 응답이 아니며, 로그인 후 사용하는 서비스는 PostgreSQL에 저장된 데이터를 읽고 씁니다.

## 구현된 기능

| 공통                          | 학생                      | 선생님                    |
| ----------------------------- | ------------------------- | ------------------------- |
| 회원가입·로그인·로그아웃      | 코드로 클래스 참여        | 클래스 생성·초대 코드     |
| DB 기반 7일 세션              | 긴급/이번 주/나중 과제    | 수업별 과제 CRUD          |
| 역할별 서버 접근 제어         | 과제 종류별 필터·즐겨찾기 | 수행평가·시험·준비물 등록 |
| 학교·학년·반 프로필           | 과제 제출·피드백 확인     | 학생 목록·완료 현황       |
| 반응형 화면·오류/로딩/빈 상태 | 개인 일정·월간 캘린더     | 첨부파일 등록·삭제        |
| FREE/PRO 플랜 저장            | 과제별 AI 대화·기록 복원  | 설명·마감일·평가기준 편집 |

- **AI**: OpenAI-compatible Chat Completions API. 과목·제목·설명·평가기준·마감일·학생 프로필·현재 한국 날짜·남은 날짜를 서버에서 구성합니다. 최근 16개 메시지를 문맥으로 전달하고 전체 기록은 DB에 저장합니다.
- **사용량**: FREE 하루 10회, PRO 하루 100회. 한국 시간 자정 기준이며 DB에서 원자적으로 횟수를 예약해 동시 요청이 한도를 넘지 않도록 합니다. 실패한 요청은 횟수를 복구합니다. 제공자가 반환한 전체 토큰 수도 기록합니다.
- **파일**: PDF·PNG·JPEG·TXT, 파일당 최대 5MB. PostgreSQL에 저장하고 소속 클래스 권한을 확인한 뒤 다운로드합니다. MVP에서 자동 파일 내용 분석은 하지 않습니다.
- **제출**: 학생은 과제별 텍스트 결과를 제출하고, 선생님은 검토 완료 또는 수정 요청과 피드백을 남길 수 있습니다. 제출 시 학생의 과제 상태가 완료로 표시됩니다.
- **애니메이션**: 첫 화면은 무음 반복 영상이며 재생/일시정지 버튼을 제공합니다. 아래 Three.js 장면은 스크롤에 따라 회전하고, 화면 밖/백그라운드에서는 렌더링을 건너뜁니다. 움직임 줄이기 설정에서는 자동 재생을 멈춥니다.

### 제품 소개 영상 다시 만들기

개발 서버를 3000번 포트로 실행한 상태에서 아래 명령을 실행합니다.

```bash
npx playwright install chromium
node scripts/render-school-film.cjs
```

`src/lib/school-film.ts`의 기기·조명·예시 UI를 24fps, 20초로 렌더링해 `public/media/school-film.webm`과 포스터를 생성합니다. WebCodecs를 지원하는 Playwright Chromium이 필요합니다. 생성 원본과 배경 출처는 [미디어 설명](public/media/ASSETS.md)에 있습니다.

## 기술 스택

Next.js 16.3.4 App Router · React 19 · TypeScript · Tailwind CSS 4 · Lucide · Three.js · PostgreSQL · Prisma 6.19.3 · Zod · bcryptjs · Playwright.

인증은 직접 구현한 서버 세션 방식입니다. UI는 별도 shadcn/ui 의존성 없이 재사용 컴포넌트와 CSS로 구현했습니다. Prisma는 기존 PostgreSQL 스키마/마이그레이션 방식을 유지하기 위해 6.x 버전으로 고정했습니다. 재현 가능한 설치를 위해 `package-lock.json`을 포함합니다.

## 빠르게 실행하기

Node.js **22.12 이상**과 npm이 필요합니다. Node.js 24에서 개발했습니다.

```bash
git clone https://github.com/7yvexon/AI-School-os.git
cd AI-School-os
npm ci
```

### 방법 A: Docker 없이 로컬 PostgreSQL 실행

```bash
npm run dev:db
```

이 명령은 개발용 PostgreSQL을 `127.0.0.1:5432`에 실행합니다. 데이터는 `.local/postgres`에 유지되며, `.env`가 없으면 무작위 `AUTH_SECRET`을 포함해 생성합니다. 기존 `.env`는 덮어쓰지 않습니다. **이 터미널을 열어 둔 채** 두 번째 터미널에서 실행하세요.

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다. 이미 5432 포트를 쓰고 있다면 방법 B 또는 기존 PostgreSQL 연결을 사용하세요. `embedded-postgres`는 로컬 개발과 테스트 전용입니다. 설치 정책이 패키지 스크립트를 차단하면 Prisma·esbuild·플랫폼별 embedded-postgres 패키지의 설치 스크립트를 검토하고 허용해야 합니다. Linux에서 root 계정으로 실행하지 마세요.

### 방법 B: Docker 또는 기존 PostgreSQL

`.env.example`을 `.env`로 복사하고 환경변수를 설정하세요. PowerShell에서는 아래 명령을 사용할 수 있습니다.

```powershell
Copy-Item .env.example .env
docker compose up -d db
```

`AUTH_SECRET`은 다음 명령으로 생성한 값으로 바꿉니다.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

기존 DB를 사용하면 Docker 실행 대신 `.env`의 `DATABASE_URL`을 해당 DB로 설정하세요. Docker 예시의 DB 사용자/비밀번호는 개발용입니다.

## 환경변수

| 변수           | 설명                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL` | PostgreSQL 연결 문자열. 예: `postgresql://school:school_dev_password@localhost:5432/school_os?schema=public` |
| `AUTH_SECRET`  | 최소 32자 무작위 비밀값. 세션 토큰 HMAC 해시에 사용합니다. 변경 시 기존 세션이 무효화됩니다.                 |
| `APP_URL`      | 외부에서 접속하는 원본 URL. 로컬은 `http://localhost:3000`. AI API의 Origin 검사에 사용합니다.               |
| `AI_API_KEY`   | AI 제공자 API 키. 서버에서만 읽습니다.                                                                       |
| `AI_BASE_URL`  | `/chat/completions` 앞까지의 URL. 예: `https://api.openai.com/v1`                                            |
| `AI_MODEL`     | 제공자가 지원하는 모델 ID. 사용 중인 제공자에서 확인해서 지정하세요.                                         |

`.env`와 API 키는 Git에 커밋하지 마세요. AI 설정이 비어 있어도 과제 관리 기능은 동작하며, AI 영역에 연결 필요 상태를 표시합니다. 가짜 응답으로 대체하지 않습니다.

## AI 연결

1. 제공자의 Chat Completions 호환 API 키·Base URL·모델 ID를 `.env`에 설정합니다.
2. 개발 서버를 재시작합니다.
3. 학생으로 로그인하고 과제 상세의 **AI 과제 도우미**에서 질문합니다.

서버는 `POST {AI_BASE_URL}/chat/completions`로 `{ model, messages, max_tokens: 1600 }`를 보냅니다. API 교체가 필요하면 `src/lib/ai.ts`만 수정하면 됩니다. 현재 비스트리밍 응답을 사용하며 요청 제한 시간은 60초입니다. 응답 제한 필드가 다른 제공자는 이 어댑터를 조정하세요.

학생이 질문할 때 이름·학교·학년·반과 과제 문맥, 최근 대화가 선택한 외부 AI 제공자에게 전달됩니다. 이메일·비밀번호·세션은 보내지 않습니다. 학교에서 공개 운영할 때는 이 데이터 전달과 보관 방침을 학생에게 알리고 필요한 동의 절차를 마련하세요.

## DB 마이그레이션과 샘플 계정

초기 SQL 마이그레이션은 `prisma/migrations/20260909000000_initial/migration.sql`에 있습니다.

```bash
# 저장소의 마이그레이션 적용
npm run db:deploy

# 스키마 변경 후 새 개발 마이그레이션 생성
npm run db:migrate -- --name describe_change

# Prisma Client 재생성
npm run db:generate

# 개발용 샘플 데이터 (동일 이메일·코드의 샘플 레코드는 최신 예시로 갱신)
npm run db:seed
```

| 역할   | 이메일                | 개발 전용 비밀번호 |
| ------ | --------------------- | ------------------ |
| 선생님 | `teacher@example.com` | `SchoolDemo!2026`  |
| 학생   | `student@example.com` | `SchoolDemo!2026`  |

샘플 클래스는 **2학년 탐구 수업**, 초대 코드는 **BSS-7K29FA**입니다. 샘플 학생은 이미 참여한 상태이며, **주제 탐구 보고서**의 마감은 **2026-09-20 23:59 (한국)**입니다. 이 날짜를 지난 후에는 기한이 지난 과제로 표시됩니다. 샘플 계정 생성은 `NODE_ENV=production`에서 차단됩니다. 공개 서비스에는 샘플 계정을 생성하지 마세요.

## 플랜

```bash
# 개발환경에서 사용자 플랜 변경
npm run dev:plan -- student@example.com PRO
npm run dev:plan -- student@example.com FREE
```

로그인 사용자에게 자기 플랜을 승격하는 API는 제공하지 않습니다. 스크립트도 `NODE_ENV=production`에서 실행할 수 없습니다. 현재 결제/PG 연동은 없고, PRO에서는 AI 하루 한도 증가가 적용됩니다.

**TODO**: PRO 자동 공부계획, 고급 일정 분석, 파일 내용 분석, 결제·구독 관리. 해당 기능은 제공되는 기능으로 광고하지 않고 화면에 준비 중으로 표시합니다.

## 실제 서비스 시연

선생님과 학생을 **서로 다른 브라우저 프로필 또는 시크릿 창**에서 열면 두 역할의 흐름을 함께 확인할 수 있습니다. 같은 브라우저 프로필의 탭들은 로그인 쿠키를 공유합니다.

1. 선생님으로 로그인하거나 회원가입하고 클래스를 만듭니다.
2. 과제의 설명·마감일·평가기준을 작성하고 클래스 코드를 학생에게 공유합니다.
3. 학생으로 회원가입하고 **내 클래스**에서 코드를 입력합니다.
4. 학생 대시보드에서 과제를 열고 AI에게 “오늘 30분 동안 무엇부터 할까?”라고 질문합니다. 이 단계에는 실제 AI 제공자 설정이 필요합니다.
5. 학생이 결과를 제출하면 선생님 과제 화면에서 제출물을 확인하고 피드백을 남길 수 있습니다.

발표 준비, 과제별 AI 기록 확인, 계정 간 데이터 확인 방법은 [제품 시연 가이드](docs/product-walkthrough.md)를 참고하세요.

## 테스트

아래 명령으로 현재 체크아웃을 검증합니다. 테스트에 사용하는 AI 제공자는 로컬 모형 서버이며, 실제 외부 AI 키를 사용한 호출을 대신 검증하지 않습니다.

```bash
npm run test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

E2E는 별도의 로컬 PostgreSQL(`55433`, `.local/e2e-postgres`)과 빌드된 Next.js 서버(`3100`)를 실행합니다. 실제 운영 DB나 AI 키를 사용하지 않습니다. `4318` 포트의 로컬 테스트 제공자가 과제 문맥을 검사하고 고정 응답을 반환합니다. 실제 AI 제공자의 응답 품질·과금·모델 호환성은 설정 후 별도 확인이 필요합니다.

검증 범위: 선생님/학생 회원가입, 클래스 생성·초대·참여, 과제 CRUD·첨부파일 다운로드, 학생 제출·교사 검토·피드백, 대시보드 반영, 즐겨찾기·완료 처리, 학생별 완료 현황, 다른 클래스/선생님 접근 차단, AI 문맥 전달·대화 저장·실패 시 사용량 복구·동시 요청 제한, 데스크톱/모바일 랜딩 및 정적 대체 화면.

## 프로젝트 구조

```text
prisma/
  schema.prisma           사용자·수업·과제·제출·세션·AI·일정·첨부 모델
  migrations/             재현 가능한 PostgreSQL 마이그레이션
  seed.ts                 개발 샘플 데이터
scripts/
  local-db.ts             Docker 없는 로컬 PostgreSQL
  e2e-server.ts           독립 테스트 DB·AI 제공자·서버
  set-plan.ts             개발 플랜 변경 도구
  render-school-film.cjs  예시 UI를 사용하는 20초 제품 영상 렌더러
public/media/             생성한 제품 영상·포스터·배경·출처 설명
docs/                     실제 서비스 시연 및 검토 기록
src/
  app/
    page.tsx              Three.js 메인 랜딩
    actions.ts            인증·클래스·과제·제출·진행 상태 서버 작업
    login/ register/      공통 인증 화면
    student/              대시보드·클래스·과제·AI·캘린더·설정
    teacher/              대시보드·클래스·과제 CRUD·학생·설정
    api/ai/               권한 검사·한도·AI 요청·기록 저장
    api/attachments/      권한 검사 후 파일 다운로드
  components/             기능별 폼·공통 화면·대화·랜딩 연출
  lib/                    DB·세션·권한·AI 어댑터·날짜·요청 제한
tests/                    도메인 테스트·Playwright E2E
```

## 보안과 운영 범위

- bcrypt(cost 12) 비밀번호 해시, UTF-8 72바이트 제한. 256비트 무작위 세션 토큰은 HttpOnly·SameSite=Lax 쿠키로 전달하고 HMAC 해시만 DB에 저장합니다. 운영 모드에서는 Secure 쿠키를 사용하므로 HTTPS가 필요합니다.
- 모든 서버 작업에서 역할·클래스 소속·소유권을 확인합니다. Next.js Server Actions의 Origin 보호에 더해 AI API는 명시적으로 Origin을 검사합니다.
- Zod 서버 검증, Prisma 매개변수 쿼리, React 텍스트 렌더링을 사용합니다. 사용자 HTML을 그대로 실행하지 않습니다.
- 첨부는 DB에 저장하며 파일 경로를 입력받지 않습니다. 다운로드 전용 `application/octet-stream`·`nosniff` 응답으로 브라우저 실행을 억제합니다. 파일 형식 검증은 허용 MIME과 크기 기준이며 악성코드 검사는 아직 없습니다.
- DB 기반 요청 제한: 인증 이메일별 15분 10회/전체 300회, 사용자 쓰기 분당 100회, AI 분당 6회. 프로덕션에서는 앞단 프록시에서도 IP별 제한을 추가하세요.
- 한 과제 대화는 한 번에 한 요청만 처리합니다. 서버가 강제 종료되어 예약된 AI 횟수가 복구되지 않는 경우에는 운영자 확인이 필요합니다. 만료된 세션·RateLimit 행은 주기적으로 정리해야 합니다.
- MVP에서는 이메일 인증·비밀번호 재설정·계정 삭제·교사 재직 인증을 제공하지 않습니다. 교사 역할은 회원가입 시 선택할 수 있으며, 실제 학교 운영에서는 승인 절차를 추가해야 합니다.
- 학생의 “완료”는 자기 확인 또는 제출을 의미하며, 교사의 검토 완료와는 별도입니다. 현재 제출물은 텍스트로 저장하고 교사가 검토 결과와 피드백을 남깁니다.
- 관리 화면은 조회/새로고침 시 최신 DB 상태를 반영합니다. 이미 열린 다른 사용자 탭에 실시간 푸시하지는 않습니다.
- 현재 전체 과제 목록을 조회합니다. 학교 단위 대규모 운영 전 페이지네이션, 파일 개수/총용량 제한, 스토리지 분리, 백업, 로그/개인정보 보관 정책을 추가하세요.

운영 실행은 DB와 환경변수 설정 후 `npm run db:deploy`, `npm run build`, `npm start` 순서입니다. 호스팅의 요청/업로드 제한은 최대 5MB 첨부와 AI 응답 시간에 맞게 설정해야 합니다. 자동 배포·PG 결제·외부 AI 계정 개설은 이 저장소에서 수행하지 않습니다.

## 참고



`deepmerge-ts`는 개발 도구인 Prisma 설정 로더의 하위 의존성입니다. 알려진 재귀 병합 취약점을 피하기 위해 8.x override를 적용하고 Prisma 생성·마이그레이션·빌드로 호환성을 확인합니다.
