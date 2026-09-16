# AI School OS

> 과제를 등록하고, AI로 시작점을 찾고, 제출과 피드백까지 이어 가는 학교용 학습 워크스페이스

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-149eca?logo=react&logoColor=white)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.12-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)

AI School OS는 교사와 학생이 클래스, 과제, 개인 일정, AI 대화, 제출물 검토를 한 흐름에서 관리할 수 있도록 만든 **AI 기반 학교 과제 관리 SaaS MVP**입니다. 현재는 로컬 실행과 제품 시연에 초점을 둔 공개 저장소이며, 결제·배포·학교 계정 연동은 포함하지 않습니다.

## 제품 미리보기

[![AI School OS 제품 소개 영상](public/media/school-film-poster.jpg)](public/media/school-film.webm)

포스터를 클릭하면 20초 제품 소개 필름을 열 수 있습니다. 영상은 Three.js로 렌더링한 예시 화면이며 실제 계정 녹화나 실시간 AI 응답이 아닙니다. 생성 원본과 배경 출처는 [미디어 설명](public/media/ASSETS.md)에서 확인할 수 있습니다.

### 제품 필름 다시 렌더링

개발 서버를 `3000`번 포트로 실행한 상태에서 WebCodecs를 지원하는 Playwright Chromium으로 렌더링합니다.

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

`src/lib/school-film.ts`의 기기·조명·예시 UI를 24fps, 20초로 렌더링해 `public/media/school-film.webm`과 포스터를 갱신합니다.

## 목차

- [주요 기능](#주요-기능)
- [제품 필름 다시 렌더링](#제품-필름-다시-렌더링)
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

| 영역      | 학생                                                | 선생님                                             | 공통 기반                         |
| --------- | --------------------------------------------------- | -------------------------------------------------- | --------------------------------- |
| 클래스    | 초대 코드로 클래스 참여                             | 클래스 생성·초대 코드 재발급·학생 관리             | 역할별 접근 제어                  |
| 과제      | 긴급·이번 주·나중 필터, 즐겨찾기, 완료 처리         | 과제 CRUD, 보관·복원, 수행평가·시험·준비물 유형    | PostgreSQL·Prisma 영속화          |
| 학습 흐름 | 과제별 AI 대화, 기록 복원, 텍스트 제출, 피드백 확인 | 제출물 검토, 수정 요청·검토 완료, 학생별 완료 현황 | 과제별 대화·제출 기록 저장        |
| 생활 관리 | 개인 일정·월간 캘린더, 학교·학년·반 프로필          | 학생 목록·클래스별 현황                            | 반응형 화면, 로딩·오류·빈 상태    |
| 운영      | FREE 하루 10회 / PRO 하루 100회 AI 한도 확인        | 개발환경에서 사용자 플랜 확인                      | 세션·요청 제한·첨부파일 권한 검사 |

- **AI 과제 도우미**: 과목·제목·설명·평가기준·마감일·학년·반·현재 한국 날짜·남은 날짜를 서버에서 구성합니다. AI 사용 동의 후 최근 16개 메시지만 문맥으로 전달하고, 화면에는 최신 100개 메시지를 표시합니다. 학생이 설정에서 대화 기록을 직접 삭제할 수 있습니다.
- **사용량 제한**: 한국 시간 자정 기준 FREE 10회, PRO 100회입니다. 인증은 IP와 실패한 이메일·IP 조합별 제한, 클래스 참여와 AI 요청은 IP와 사용자별 제한을 함께 적용합니다. 요청 전에 DB에서 AI 사용량을 원자적으로 예약하고 제공자 오류가 나면 횟수를 복구합니다.
- **첨부파일**: PDF·PNG·JPEG·TXT를 파일당 최대 5MiB까지 저장하며 클래스별 50개·50MiB 총량을 제한합니다. 다운로드 전에 클래스 소속과 과제 접근 권한을 확인하며 파일 내용 자동 분석과 악성코드 검사는 아직 제공하지 않습니다.
- **제출·검토**: 학생은 텍스트 결과를 제출하고, 선생님은 `수정 요청` 또는 `검토 완료`와 피드백을 기록합니다. 모든 검토 결과를 이력으로 남기며, 과제 보관은 제출물과 AI 기록을 삭제하지 않습니다.
- **랜딩 연출**: 무음 반복 영상과 재생/일시정지 버튼, 스크롤 기반 Three.js 장면을 제공합니다. 움직임 줄이기 설정에서는 자동 재생을 멈춥니다.

실제 계정으로 위 흐름을 따라가려면 [제품 시연 가이드](docs/product-walkthrough.md)를 참고하세요. 선생님과 학생은 서로 다른 브라우저 프로필 또는 시크릿 창에서 실행하는 것이 좋습니다.

## 기술 스택

Next.js 16.3.4 App Router · React 19 · TypeScript · Tailwind CSS 4 · Lucide · Three.js · PostgreSQL · Prisma 6.19.3 · Zod · bcryptjs · Playwright

인증은 직접 구현한 서버 세션 방식입니다. UI는 별도 shadcn/ui 의존성 없이 재사용 컴포넌트와 CSS로 구성했습니다. Prisma는 6.x로 고정했고 `package-lock.json`을 함께 관리합니다.

## 빠른 시작

### 준비물

- Node.js **22.12 이상**과 npm
- 방법 A 또는 방법 B 중 하나의 PostgreSQL 실행 환경

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

`.env`의 `AUTH_SECRET`을 최소 32자 무작위 값으로 교체합니다.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

그 다음 방법 A와 같은 `db:generate` → `db:deploy` → `db:seed` → `dev` 순서로 실행합니다. Docker 예시의 DB 사용자·비밀번호는 개발 전용입니다.

## 환경변수와 AI 연결

`.env.example`을 복사해 `.env`를 만들고 환경에 맞는 값을 입력합니다.

| 변수                            | 필수         | 설명                                                                                                         |
| ------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                  | 예           | PostgreSQL 연결 문자열. 예: `postgresql://school:school_dev_password@localhost:5432/school_os?schema=public` |
| `AUTH_SECRET`                   | 예           | 최소 32자 무작위 비밀값. 변경하면 기존 세션이 무효화됩니다.                                                  |
| `APP_URL`                       | 예           | 외부 접속 원본 URL. 로컬 기본값은 `http://localhost:3000`이며 AI API Origin 검사에 사용합니다.               |
| `TRUST_PROXY`                   | 배포 시      | `true`일 때 신뢰하는 프록시의 `X-Forwarded-For`·`X-Real-IP`를 IP 제한에 사용합니다.                          |
| `SERVER_ACTION_ALLOWED_ORIGINS` | 배포 시      | 프록시가 사용하는 Server Action 허용 호스트를 쉼표로 구분해 입력합니다.                                      |
| `TEACHER_INVITE_CODE`           | 교사 가입 시 | 교사 계정 가입을 허용할 때만 설정하는 서버 전용 초대 코드입니다. 비워 두면 공개 교사 가입을 막습니다.        |
| `AI_API_KEY`                    | AI 사용 시   | OpenAI 호환 제공자의 API 키. 서버에서만 읽습니다.                                                            |
| `AI_BASE_URL`                   | AI 사용 시   | `/chat/completions` 앞까지의 URL. 운영에서는 HTTPS를 사용합니다. 예: `https://api.openai.com/v1`             |
| `AI_MODEL`                      | AI 사용 시   | 제공자가 지원하는 모델 ID                                                                                    |

AI를 연결하려면 위 AI 변수 3개를 설정하고 서버를 재시작한 뒤 학생 과제 상세에서 AI 사용에 동의하고 질문합니다. 서버는 `POST {AI_BASE_URL}/chat/completions`로 `{ model, messages, max_tokens: 1600 }`을 보내는 비스트리밍 어댑터를 사용합니다. 다른 응답 형식은 [AI 어댑터](src/lib/ai.ts)에서 조정합니다.

학생의 질문에는 학년·반, 과제 문맥, 최근 대화가 포함되어 사용자가 동의한 뒤 선택한 외부 AI 제공자로 전송될 수 있습니다. 이름·학교·이메일·비밀번호·세션은 보내지 않습니다. 설정에서 동의를 철회하거나 저장된 AI 대화 기록을 삭제할 수 있지만, 외부 제공자가 이미 수신한 데이터의 삭제는 해당 제공자의 정책을 따릅니다.

`.env`와 API 키는 절대 커밋하지 마세요. AI 설정이 비어 있어도 클래스·과제·제출 기능은 동작하며 AI 영역에는 연결 필요 상태가 표시됩니다.

`TRUST_PROXY=false`인 상태로 공개 서버를 프록시 없이 직접 노출하면 모든 요청이 하나의 `direct` 제한 버킷으로 묶입니다. 운영에서는 실제 주소를 보존하고 외부 입력 헤더를 정리하는 신뢰 프록시 뒤에서만 `TRUST_PROXY=true`로 설정하세요.

## 개발용 샘플 계정

`npm run db:seed`는 운영 환경(`NODE_ENV=production`)에서 실행되지 않습니다. 아래 계정은 로컬 시연 전용이며 교사 샘플 계정은 이미 승인된 상태로 생성됩니다.

<details>
<summary>샘플 계정과 클래스 정보 보기</summary>

| 역할   | 이메일                | 비밀번호          |
| ------ | --------------------- | ----------------- |
| 선생님 | `teacher@example.com` | `SchoolDemo!2026` |
| 학생   | `student@example.com` | `SchoolDemo!2026` |

- 샘플 클래스: **2학년 탐구 수업**
- 초대 코드: `BSS-7K29FA`
- 샘플 과제: **주제 탐구 보고서**
- 샘플 마감일: `prisma/seed.ts`에 정의된 **2026-09-20 23:59 (한국)**

마감일은 실행 시점에 따라 D-Day 또는 기한 지남으로 표시될 수 있습니다. 시연 날짜가 지난 경우 새 과제를 만들어 현재 날짜에 맞춰 보여 주세요.

</details>

플랜을 변경하는 로그인 사용자용 API나 결제 연동은 없습니다. 개발환경에서만 `npm run dev:plan -- student@example.com PRO` 또는 `npm run dev:plan -- student@example.com FREE`로 플랜별 화면과 한도를 확인할 수 있습니다. 운영자가 승인할 때는 DB 접근이 가능한 환경에서 `npm run teacher:approve -- teacher@example.com`을 실행합니다.

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
| `npm run db:migrate -- --name describe_change` | 개발 마이그레이션 생성                      |
| `npm run db:deploy`                            | 저장소 마이그레이션 적용                    |
| `npm run db:seed`                              | 개발 샘플 데이터 생성/갱신                  |
| `npm run db:cleanup`                           | 만료 세션·요청 제한 데이터 배치 정리        |
| `npm run teacher:approve -- email`             | DB 운영자용 교사 승인                       |
| `npm run dev:plan -- student@example.com PRO`  | 개발환경 플랜 변경                          |

권장 검증 순서는 다음과 같습니다.

처음 한 번은 위의 프로젝트 내부 Chromium 설치를 실행한 뒤 아래 명령을 사용합니다.

```bash
npm run format
npm run db:generate
npm run lint
npm run format:check
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

E2E는 `55433` 포트의 별도 PostgreSQL(`.local/e2e-postgres`), `4318` 포트의 결정적 로컬 AI 제공자, `3100` 포트의 빌드된 Next.js 서버를 사용합니다. 실제 운영 DB나 외부 AI 키를 호출하지 않으며 프로젝트 내부 Chromium을 설치한 뒤 `npm run build`를 먼저 실행해야 합니다. 교사 가입 테스트는 E2E 전용 `TEACHER_INVITE_CODE`를 사용합니다.

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
- 모든 서버 작업에서 역할·클래스 소속·소유권을 검사하고, Server Actions와 AI API에서 Origin을 확인합니다. 교사 가입은 `TEACHER_INVITE_CODE`가 설정된 경우에만 허용합니다.
- Zod 서버 검증, Prisma 매개변수 쿼리, React 텍스트 렌더링을 사용합니다. 사용자 HTML을 실행하지 않습니다.
- 첨부파일은 DB에 저장하고 파일당 5MiB·클래스별 50개·50MiB를 제한하며 `application/octet-stream`·`nosniff`로 다운로드합니다. 악성코드 검사는 아직 제공하지 않습니다.
- 인증·쓰기·AI·클래스 참여 요청에 IP·계정·실패한 이메일·IP 조합 기반 제한을 적용합니다. 운영에서는 신뢰 프록시 설정, 모니터링과 백업을 함께 구성하세요.
- AI는 동의 후 학년·반과 과제 문맥만 외부 제공자에 전달합니다. 동의 철회와 대화 기록 삭제를 제공하지만, 외부 제공자 보관·지역·학습 사용 정책은 별도 계약과 설정이 필요합니다.
- 과제 삭제는 학생 작업을 보존하는 보관 처리이며 교사는 클래스 화면에서 복원할 수 있습니다. 만료 세션·요청 제한 데이터는 운영 스케줄러에서 `npm run db:cleanup`을 주기적으로 실행하세요.
- 이메일 인증·비밀번호 재설정·계정 삭제·학교 도메인 기반 교사 재직 인증은 아직 제공하지 않습니다. 실제 학교 운영에서는 승인 절차와 개인정보 보관·삭제 정책을 별도로 설계해야 합니다.

공개 취약점 신고 방법은 [보안 정책](SECURITY.md)을 참고하세요. 운영 실행은 `npm run db:deploy` → `npm run build` → `npm start` 순서입니다. 자동 배포·PG 결제·외부 AI 계정 개설은 이 저장소의 범위가 아닙니다.

## 로드맵

- [x] 역할별 인증·세션·클래스·과제 CRUD
- [x] 과제별 AI 대화 저장·복원과 플랜별 사용량 제한
- [x] 학생 제출·선생님 검토·피드백 흐름
- [x] 첨부파일 권한 검사와 반응형 랜딩 경험
- [x] 교사 초대 코드·클래스 코드 재발급·학생 제외
- [x] 과제 보관·복원과 제출·검토 이력 보존
- [x] AI 동의·개인정보 최소화·대화 기록 삭제
- [ ] PRO 자동 공부계획과 고급 일정 분석
- [ ] 첨부파일 내용 분석 및 안전한 오브젝트 스토리지 분리
- [ ] 이메일 인증·비밀번호 재설정·학교 도메인 기반 교사 재직 인증
- [ ] 결제·구독 관리와 자동 배포

로드맵의 미완료 항목은 현재 기능으로 광고하지 않으며 화면에서 준비 중으로 표시합니다.

## 기여하기

버그 제보, 문서 개선, 기능 제안은 환영합니다. 개발 환경과 PR 체크리스트는 [기여 가이드](CONTRIBUTING.md)를 먼저 읽어 주세요.

## 라이선스

현재 저장소에는 `LICENSE` 파일이 없습니다. 라이선스가 명시되기 전까지 코드·이미지·영상의 재사용이나 배포가 필요하면 저장소 소유자에게 먼저 허가를 확인해 주세요.

## 유지보수 메모

`deepmerge-ts`는 Prisma 설정 로더의 하위 의존성입니다. 알려진 재귀 병합 취약점 영향을 줄이기 위해 `package.json`에 8.x override를 적용하고 Prisma 생성·마이그레이션·빌드로 호환성을 확인합니다.
