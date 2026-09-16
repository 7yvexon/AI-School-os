# 기여 가이드

AI School OS의 버그 수정, 문서 개선, 테스트 보강, 기능 제안을 환영합니다. 이 저장소는 현재 로컬 시연 중심의 MVP이므로 큰 기능을 제안하기 전에 이 문서와 [README](README.md)의 범위를 먼저 확인해 주세요.

## 시작하기

1. 저장소를 포크하거나 작업 브랜치를 만듭니다.
2. Node.js 22.12 이상을 준비하고 `npm ci`를 실행합니다.
3. [README의 빠른 시작](README.md#빠른-시작)에 따라 PostgreSQL과 `.env`를 준비합니다.
4. 스키마를 적용하고 필요한 경우 `npm run db:seed`로 개발 데이터를 생성합니다.

```bash
npm run db:generate
npm run db:deploy
npm run dev
```

AI 기능을 수정하거나 시연할 때만 외부 AI 환경변수를 설정합니다. API 키는 코드, 테스트 픽스처, 커밋 메시지에 남기지 마세요.

## 작업 원칙

- 사용자 흐름과 기존 한국어 UI 문구를 우선하고, 역할·클래스·소유권 경계를 서버에서 검증합니다.
- 데이터 모델을 변경하면 Prisma 마이그레이션을 함께 추가합니다. 생성된 마이그레이션 SQL을 직접 되돌려 기존 이력을 덮어쓰지 않습니다.
- 사용자 입력은 서버에서 Zod로 검증하고, 첨부파일은 허용 MIME·크기·접근 권한을 모두 확인합니다.
- 새 동작에는 가능한 범위에서 도메인 테스트 또는 Playwright E2E 시나리오를 추가합니다.
- 문서의 실행 명령, 환경변수, 샘플 계정, 현재 제공 범위가 코드와 일치하는지 확인합니다.

## 브랜치와 커밋

기능이나 수정 목적이 드러나는 짧은 브랜치명을 사용하세요. 예: `feature/assignment-rubric`, `fix/session-expiry`, `docs/readme`.

커밋 메시지는 변경 의도를 한 문장으로 적습니다. 서로 무관한 변경은 하나의 커밋에 섞지 않는 편이 검토와 되돌리기에 좋습니다.

## 변경 전 검증

변경 범위에 맞춰 아래 명령을 실행하고 결과를 PR에 적어 주세요.

E2E를 실행하기 전 Playwright Chromium을 프로젝트 내부에 설치합니다.

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

```bash
npm run format
npm run db:generate
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

문서만 바꾼 경우에도 링크, 코드 블록, 명령의 경로와 포트가 현재 저장소와 맞는지 확인합니다. E2E는 별도 로컬 DB와 AI 픽스처를 사용하므로 실제 운영 DB나 외부 AI 키를 연결하지 않습니다.

## 풀 리퀘스트 체크리스트

- [ ] 변경 목적과 사용자 영향이 설명되어 있습니다.
- [ ] 관련 테스트 또는 문서 검증을 실행했습니다.
- [ ] 스키마 변경 시 Prisma 마이그레이션을 포함했습니다.
- [ ] 비밀값, 개인 식별 정보, `.env` 파일이 변경에 포함되지 않았습니다.
- [ ] README·시연 가이드·로드맵의 제공 범위를 함께 갱신했습니다.
- [ ] UI 변경이라면 데스크톱과 모바일 상태를 확인했습니다.

보안 취약점은 공개 이슈로 올리지 말고 [보안 정책](SECURITY.md)의 비공개 신고 절차를 따라 주세요.
