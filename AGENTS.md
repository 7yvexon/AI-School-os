<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AI School OS 작업 지침

## 기본 원칙

- 이 저장소는 Next.js 16.3.4 App Router, React 19, TypeScript strict, Prisma 6.19.3, PostgreSQL 17을 사용한다.
- Node.js 22.12 이상과 저장소의 `package-lock.json`을 기준으로 작업한다.
- 의존성 설치는 `npm ci`를 우선 사용한다. 의존성 버전 변경은 요청되었거나 변경 이유가 명확한 경우에만 수행하고 `package.json`과 `package-lock.json`을 함께 갱신한다.
- 기존 한국어 UI 문구와 사용자 흐름을 우선한다.
- 에이전트의 진행 및 최종 답변은 한국어로 작성한다.
- 사용자가 요청하지 않는 한 새 코드 주석을 추가하지 않는다.
- 작업에 필요한 도구는 전역 설치나 시스템 변경 없이 워크스페이스 내부의 npm 스크립트와 로컬 의존성을 사용한다.
- `.env`, API 키, 실제 사용자 데이터, 세션 토큰을 커밋하거나 로그에 남기지 않는다.

## Next.js 및 프로젝트 구조

- `<!-- BEGIN:nextjs-agent-rules -->`부터 `<!-- END:nextjs-agent-rules -->`까지의 블록은 Next.js가 관리하므로 수정하지 않는다.
- Next.js API를 변경하기 전에는 설치된 `node_modules/next/dist/docs/`의 현재 버전 문서를 확인한다.
- `src/app/`의 페이지와 레이아웃은 기본적으로 Server Component로 유지한다.
- 브라우저 상호작용이 필요한 컴포넌트에만 `"use client"`를 사용한다.
- `src/app/actions.ts`의 Server Actions와 `src/app/api/`의 Route Handler는 서버 진입점으로 취급한다.
- `src/lib/auth.ts`, `src/lib/access.ts`, `src/lib/db.ts`, `src/lib/ai.ts`, `src/lib/rate-limit.ts`는 서버 전용이다. Client Component에서 import하지 않는다.
- `@/*` 경로 별칭은 `src/*`를 가리킨다.
- `next-env.d.ts`, `.next/`, `.local/`, `test-results/`는 자동·로컬 산출물로 취급하며 직접 편집하거나 커밋하지 않는다.

## 보안 및 개인정보 불변식

- 권한이 필요한 모든 Server Action과 API Route에서 세션, 역할, 클래스 소속, 리소스 소유권을 서버에서 검증한다. 클라이언트의 UI 제한만으로 접근을 통제하지 않는다.
- 외부 입력은 서버에서 Zod로 검증한다.
- AI 요청은 사용자의 AI 동의 이후에만 수행한다.
- AI 제공자에는 과제 처리에 필요한 최소 문맥만 전달한다. 이름, 학교, 이메일, 비밀번호, 세션 등 불필요한 개인정보는 전달하지 않는다.
- AI API 키는 서버에서만 읽는다. 테스트용 localhost HTTP 허용 설정을 운영 환경에서 활성화하지 않는다.
- 첨부파일은 허용 MIME 타입, 파일 시그니처, 크기 제한, 클래스·과제 접근 권한을 모두 확인한다.
- `TRUST_PROXY`가 true가 아닌 경우 외부 전달 IP 헤더를 신뢰하지 않는다.
- 인증, 클래스 참여, AI 요청, 첨부파일 다운로드의 권한 검사를 우회하지 않는다.

## DB 및 데이터 보존

- `prisma/schema.prisma`를 변경하면 새 Prisma 마이그레이션을 함께 추가한다.
- 적용된 기존 마이그레이션 파일은 수정하거나 덮어쓰지 않는다.
- 스키마 변경 후 `npm run db:generate`를 실행한다.
- 로컬 개발 마이그레이션은 `npm run db:migrate -- --name describe_change`, 기존 마이그레이션 적용은 `npm run db:deploy`를 사용한다.
- 과제 삭제는 보관 처리 의미를 유지한다. 제출물, 검토 이력, AI 대화 기록을 임의로 삭제하지 않는다.
- `db:seed`, `dev:plan`, `teacher:approve`, `db:cleanup`은 DB를 변경하므로 운영 DB나 공유 DB에서 실행하지 않는다.

## 검증

- 로직·보안 변경은 `npm run lint`, `npm run format:check`, `npm test`, `npm run typecheck`를 실행한다.
- 페이지·Server Action·API·스키마 변경은 위 검증에 `npm run build`와 `npm run test:e2e`를 추가한다.
- E2E는 별도 DB, 로컬 AI 픽스처, 프로젝트 내부 Chromium을 사용한다. 개발 DB나 외부 AI 키를 사용하지 않는다.
- E2E를 처음 실행할 때는 `PLAYWRIGHT_BROWSERS_PATH=0`으로 프로젝트 내부 Chromium을 설치한다.
- `npm run format`은 파일을 수정하는 명령이므로 의도적으로 실행한 뒤 diff를 확인한다.
- 검증 결과와 변경 범위를 PR 설명에 기록한다.

## 문서 및 변경 범위

- 설치와 제품 범위는 `README.md`, 기여와 검증 절차는 `CONTRIBUTING.md`, 보안 운영과 취약점 신고는 `SECURITY.md`, 실제 사용자 흐름은 `docs/product-walkthrough.md`를 기준으로 한다.
- 기능, 환경변수, 실행 명령, 보안 동작이 바뀌면 관련 문서를 함께 갱신한다.
- 새 동작에는 가능한 범위에서 `tests/domain.test.ts`, `tests/security.test.ts`, 또는 `tests/e2e/school.spec.ts`에 회귀 테스트를 추가하거나 갱신한다.
- 요청 범위를 벗어난 대규모 리팩터링과 무관한 포맷 변경을 섞지 않는다.
