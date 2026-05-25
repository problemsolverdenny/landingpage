# Problem Solver, Denny 소셜 자동화

PDF 사업 보고서를 바탕으로 매일 오전 09:00(KST)에 X/Twitter, Threads, Instagram에 경험담 콘텐츠를 게시하는 자동화 시스템입니다.

## 구조

- `scripts/post_daily.py`: 콘텐츠 선택, 중복 게시 방지, 플랫폼별 API 게시
- `content/daily_posts.json`: 보고서 기반 일일 경험담 콘텐츠 뱅크
- `content/report_summary.md`: PDF에서 추출한 브랜드/사업 요약
- `site/`: Cloudflare Pages에 배포할 정적 랜딩페이지
- `.github/workflows/daily-social.yml`: GitHub Actions 예약 실행, 매일 00:00 UTC
- `.env.example`: 로컬 실행 및 GitHub Secrets 입력값 예시

## 웹사이트 배포

Cloudflare Pages에서 무료 기본 도메인으로 배포할 수 있습니다.

1. Cloudflare Dashboard > Workers & Pages > Create application > Pages로 이동합니다.
2. GitHub 저장소 `problemsolverdenny/landingpage`를 연결합니다.
3. 프로젝트 이름을 `problemsolverdenny`로 입력합니다. 사용 가능하면 URL은 `https://problemsolverdenny.pages.dev`가 됩니다.
4. 빌드 설정은 아래처럼 둡니다.

```text
Framework preset: None
Build command: 비워둠
Build output directory: site
Root directory: /
```

`site/`는 Manus에서 만든 랜딩페이지의 정적 배포본입니다. Manus 편집/분석 스크립트는 제거했고, 필요한 이미지 자산은 `site/assets/`에 포함했습니다.

## 빠른 테스트

```bash
python scripts/post_daily.py --dry-run
```

특정 날짜 콘텐츠를 확인하려면:

```bash
POST_DATE=2026-05-25 python scripts/post_daily.py --dry-run
```

## 실제 게시 실행

1. `.env.example`을 `.env`로 복사합니다.
2. 각 플랫폼 토큰과 계정 ID를 입력합니다.
3. 아래 명령을 실행합니다.

```bash
python scripts/post_daily.py --publish
```

`--publish`는 같은 한국 날짜에 이미 성공 로그가 있으면 다시 게시하지 않습니다. 테스트 중 중복 게시를 원하면 `data/post_log.jsonl`에서 해당 날짜 로그를 직접 확인한 뒤 조정하세요.

같은 날짜에 강제로 테스트 재게시하려면:

```bash
python scripts/post_daily.py --publish --force
```

## OpenAI 콘텐츠 생성

기본값은 무료인 정적 콘텐츠 뱅크입니다.

```env
CONTENT_SOURCE=static
```

OpenAI로 매일 새 콘텐츠를 생성하려면 `.env` 또는 GitHub Secrets에 아래 값을 설정합니다. OpenAI API는 토큰 사용량 기준 과금될 수 있으므로, 실제 호출 전 비용 사용을 승인한 경우에만 `OPENAI_API_APPROVED=true`로 바꾸세요.

```env
CONTENT_SOURCE=openai
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-nano
OPENAI_REASONING_EFFORT=low
OPENAI_MAX_OUTPUT_TOKENS=1400
OPENAI_API_APPROVED=true
```

OpenAI 생성은 `content/report_summary.md`와 해당 날짜의 `content/daily_posts.json` 소재를 바탕으로 3단 스토리 구조의 한국어 게시글을 만듭니다.

## GitHub Actions 설정

이 디렉터리를 GitHub 저장소로 올린 뒤, Repository Settings > Secrets and variables > Actions에 아래 값을 등록합니다.

- `OPENAI_API_KEY`
- `THREADS_ACCESS_TOKEN`

워크플로는 매일 `00:00 UTC`, 즉 한국시간 `09:00`에 실행됩니다. GitHub Actions 스케줄은 몇 분 지연될 수 있습니다.

현재 예약 워크플로는 Threads 전용으로 고정되어 있으며, 매일 OpenAI `gpt-5-nano`로 새 글을 생성한 뒤 Threads에 게시합니다. OpenAI API는 토큰 사용량 기준 비용이 발생할 수 있습니다.

예약 실행 기본값:

```env
ENABLED_PLATFORMS=threads
CONTENT_SOURCE=openai
OPENAI_MODEL=gpt-5-nano
OPENAI_REASONING_EFFORT=low
OPENAI_MAX_OUTPUT_TOKENS=1400
OPENAI_API_APPROVED=true
THREADS_USER_ID=me
```

## 플랫폼별 주의사항

- X/Twitter: OAuth 2.0 user-context 토큰에 쓰기 권한이 필요합니다. 이 프로젝트는 `POST /2/tweets`를 사용합니다.
- Threads: 텍스트 컨테이너를 만든 뒤 publish 호출을 합니다.
- Instagram: 피드 게시에는 공개적으로 접근 가능한 JPG/PNG URL이 필요합니다. 로컬 파일 경로는 Instagram API가 가져갈 수 없습니다.

참고 공식 문서:

- X API: https://docs.x.com/x-api/posts/creation-of-a-post
- Threads API: https://developers.facebook.com/docs/threads/
- Instagram Content Publishing: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing/
