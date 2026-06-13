#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parents[1]
POSTS_FILE = ROOT / "content" / "daily_posts.json"
REPORT_SUMMARY_FILE = ROOT / "content" / "report_summary.md"
LOG_FILE = ROOT / "data" / "post_log.jsonl"
KST = ZoneInfo("Asia/Seoul")


class ConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class SocialPost:
    date: str
    title: str
    text: str
    source: str = "static"
    model: str | None = None

    @property
    def x_text(self) -> str:
        return self.text

    @property
    def threads_text(self) -> str:
        return self.text

    @property
    def instagram_caption(self) -> str:
        return f"{self.text}\n\n#ProblemSolverDenny #MVP개발 #초기창업 #외주개발 #스타트업"


def load_dotenv() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def env(name: str, default: str = "") -> str:
    value = os.environ.get(name)
    if value is None or not value.strip():
        return default
    return value.strip()


def bool_env(name: str, default: bool) -> bool:
    value = env(name)
    if not value:
        return default
    return value.lower() in {"1", "true", "yes", "y", "on"}


def post_date() -> str:
    override = env("POST_DATE")
    if override:
        datetime.strptime(override, "%Y-%m-%d")
        return override
    return datetime.now(KST).strftime("%Y-%m-%d")


def load_posts() -> list[dict[str, str]]:
    with POSTS_FILE.open(encoding="utf-8") as handle:
        posts = json.load(handle)
    if not isinstance(posts, list) or not posts:
        raise ConfigError(f"{POSTS_FILE} must contain at least one post.")
    return posts


def select_static_post(date_text: str) -> SocialPost:
    posts = load_posts()
    start = datetime.strptime("2026-05-25", "%Y-%m-%d").date()
    current = datetime.strptime(date_text, "%Y-%m-%d").date()
    index = (current - start).days % len(posts)
    selected = posts[index]
    return SocialPost(
        date=date_text,
        title=selected["title"],
        text=selected["text"],
    )


def content_source() -> str:
    source = env("CONTENT_SOURCE", "static").lower()
    if source not in {"static", "openai"}:
        raise ConfigError("CONTENT_SOURCE must be either 'static' or 'openai'.")
    return source


def load_report_summary() -> str:
    return REPORT_SUMMARY_FILE.read_text(encoding="utf-8")


def output_text_from_response(response: dict[str, Any]) -> str:
    direct = response.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct

    chunks: list[str] = []
    for item in response.get("output", []):
        if not isinstance(item, dict):
            continue
        for content in item.get("content", []):
            if not isinstance(content, dict):
                continue
            if content.get("type") in {"output_text", "text"} and isinstance(content.get("text"), str):
                chunks.append(content["text"])
    return "".join(chunks).strip()


def platform_character_limit(platforms: list[str]) -> int:
    limits = {"x": 280, "threads": 500, "instagram": 1900}
    return min(limits[platform] for platform in platforms)


_WRITING_STYLES = [
    "짧은 에피소드: 실제 상담 장면 하나를 짧게 재현하고 그 상황에서 배운 점으로 마무리합니다.",
    "질문형 오프닝: 초기 창업자가 자주 하는 질문 하나로 시작해 Denny의 답변으로 이어갑니다.",
    "숫자 중심: 구체적인 금액·기간·비율 등 숫자를 앞에 내세워 독자의 시선을 먼저 잡습니다.",
    "실수 고백: Denny 본인 또는 고객이 저질렀던 실수를 솔직하게 털어놓고 교훈으로 연결합니다.",
    "한 줄 원칙: 핵심 판단 기준 하나를 뽑아 그 이유와 사례를 간결하게 풀어냅니다.",
    "대화 재현: 고객과 나눈 짧은 대화를 그대로 옮기고 그 대화가 왜 중요했는지 설명합니다.",
]


def writing_style_for_date(date_text: str) -> str:
    current = datetime.strptime(date_text, "%Y-%m-%d").date()
    index = current.toordinal() % len(_WRITING_STYLES)
    return _WRITING_STYLES[index]


def load_recent_post_titles(n: int = 7) -> list[str]:
    if not LOG_FILE.exists():
        return []
    titles: list[str] = []
    for line in LOG_FILE.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("status") == "success" and entry.get("title"):
            titles.append(entry["title"])
    return list(dict.fromkeys(reversed(titles)))[:n]


def generate_openai_post(date_text: str, platforms: list[str], seed_post: SocialPost) -> SocialPost:
    require_env(["OPENAI_API_KEY"])
    if not bool_env("OPENAI_API_APPROVED", False):
        raise ConfigError(
            "OpenAI API usage can incur costs. Set OPENAI_API_APPROVED=true only after approving paid API usage."
        )

    model = env("OPENAI_MODEL", "gpt-5-nano")
    max_chars = platform_character_limit(platforms)
    summary = load_report_summary()
    style = writing_style_for_date(date_text)
    recent_titles = load_recent_post_titles()
    recent_block = (
        "최근 게시된 포스트 제목 (이 소재와 관점은 반복하지 마세요):\n"
        + "\n".join(f"- {t}" for t in recent_titles)
        if recent_titles
        else ""
    )

    prompt = f"""
날짜: {date_text}
게시 플랫폼: {", ".join(platforms)}
최대 글자 수: {max_chars}자

브랜드/사업 요약:
{summary}

오늘의 글쓰기 스타일:
{style}

오늘의 주제 키워드: {seed_post.title}

{recent_block}

위 스타일과 주제를 바탕으로 Threads에 올릴 한국어 SNS 콘텐츠를 작성해 주세요.

요구사항:
- Denny가 친한 지인에게 직접 겪은 일을 털어놓듯 1인칭으로 씁니다.
- "고객 A", "고객 B", "사례 C" 같은 나열식 구성은 피합니다. 하나의 구체적인 장면이나 대화로 집중합니다.
- 광고 문구나 결론 요약 없이 이야기 자체가 메시지가 되게 씁니다.
- 줄바꿈을 포함해 Threads에 바로 올릴 수 있는 형태로 작성합니다.
- 전체 본문은 최대 글자 수를 넘기지 않습니다.
- JSON만 반환합니다.
""".strip()

    response = request_json(
        "POST",
        "https://api.openai.com/v1/responses",
        bearer_token=env("OPENAI_API_KEY"),
        json_body={
            "model": model,
            "input": [
                {
                    "role": "system",
                    "content": "You write concise Korean founder-story social posts for Problem Solver, Denny.",
                },
                {"role": "user", "content": prompt},
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "daily_social_post",
                    "schema": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "title": {"type": "string"},
                            "text": {"type": "string"},
                        },
                        "required": ["title", "text"],
                    },
                    "strict": True,
                }
            },
            "reasoning": {"effort": env("OPENAI_REASONING_EFFORT", "low")},
            "max_output_tokens": int(env("OPENAI_MAX_OUTPUT_TOKENS", "1400")),
        },
    )
    raw_text = output_text_from_response(response)
    if not raw_text:
        raise RuntimeError(f"OpenAI response did not include output text: {response}")

    try:
        generated = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"OpenAI response was not valid JSON: {raw_text}") from exc

    return SocialPost(
        date=date_text,
        title=str(generated["title"]).strip(),
        text=str(generated["text"]).strip(),
        source="openai",
        model=model,
    )


def select_post(date_text: str, platforms: list[str]) -> SocialPost:
    seed_post = select_static_post(date_text)
    if content_source() == "static":
        return seed_post
    return generate_openai_post(date_text, platforms, seed_post)


def enabled_platforms() -> list[str]:
    raw = env("ENABLED_PLATFORMS", "x,threads,instagram")
    platforms = [item.strip().lower() for item in raw.split(",") if item.strip()]
    valid = {"x", "threads", "instagram"}
    invalid = sorted(set(platforms) - valid)
    if invalid:
        raise ConfigError(f"Unsupported platform(s): {', '.join(invalid)}")
    return platforms


def validate_post(post: SocialPost, platforms: list[str]) -> None:
    limits = {
        "x": (post.x_text, 280),
        "threads": (post.threads_text, 500),
        "instagram": (post.instagram_caption, 2200),
    }
    for platform in platforms:
        text, limit = limits[platform]
        if len(text) > limit:
            raise ConfigError(
                f"{platform} post is {len(text)} characters, over the {limit} character limit."
            )


def already_posted(date_text: str) -> bool:
    if not LOG_FILE.exists():
        return False
    for line in LOG_FILE.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue
        if entry.get("date") == date_text and entry.get("status") == "success":
            return True
    return False


def append_log(entry: dict[str, Any]) -> None:
    LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOG_FILE.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(entry, ensure_ascii=False, sort_keys=True) + "\n")


def request_json(
    method: str,
    url: str,
    *,
    bearer_token: str | None = None,
    data: dict[str, str] | None = None,
    json_body: dict[str, Any] | None = None,
    timeout: int = 30,
) -> dict[str, Any]:
    headers: dict[str, str] = {"User-Agent": "problem-solver-denny-social-bot/1.0"}
    body: bytes | None = None

    if bearer_token:
        headers["Authorization"] = f"Bearer {bearer_token}"

    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    elif data is not None:
        body = urlencode(data).encode("utf-8")
        headers["Content-Type"] = "application/x-www-form-urlencoded"

    request = Request(url, data=body, headers=headers, method=method.upper())
    try:
        with urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"{method} {url} failed with HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise RuntimeError(f"{method} {url} failed: {exc}") from exc

    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{method} {url} returned non-JSON response: {raw}") from exc


def require_env(names: list[str]) -> None:
    missing = [name for name in names if not env(name)]
    if missing:
        raise ConfigError(f"Missing required environment variable(s): {', '.join(missing)}")


def post_to_x(post: SocialPost) -> dict[str, Any]:
    require_env(["X_BEARER_TOKEN"])
    return request_json(
        "POST",
        "https://api.x.com/2/tweets",
        bearer_token=env("X_BEARER_TOKEN"),
        json_body={"text": post.x_text},
    )


def post_to_threads(post: SocialPost) -> dict[str, Any]:
    require_env(["THREADS_USER_ID", "THREADS_ACCESS_TOKEN"])
    user_id = env("THREADS_USER_ID")
    token = env("THREADS_ACCESS_TOKEN")

    container = request_json(
        "POST",
        f"https://graph.threads.net/v1.0/{user_id}/threads",
        data={
            "media_type": "TEXT",
            "text": post.threads_text,
            "access_token": token,
        },
    )
    creation_id = str(container.get("id") or "")
    if not creation_id:
        raise RuntimeError(f"Threads container response did not include id: {container}")

    published = request_json(
        "POST",
        f"https://graph.threads.net/v1.0/{user_id}/threads_publish",
        data={
            "creation_id": creation_id,
            "access_token": token,
        },
    )
    return {"container": container, "published": published}


def post_to_instagram(post: SocialPost) -> dict[str, Any]:
    require_env(["INSTAGRAM_USER_ID", "INSTAGRAM_ACCESS_TOKEN", "INSTAGRAM_IMAGE_URL"])
    user_id = env("INSTAGRAM_USER_ID")
    token = env("INSTAGRAM_ACCESS_TOKEN")
    version = env("GRAPH_API_VERSION", "v21.0")
    base_url = f"https://graph.facebook.com/{version}/{user_id}"

    container = request_json(
        "POST",
        f"{base_url}/media",
        data={
            "image_url": env("INSTAGRAM_IMAGE_URL"),
            "caption": post.instagram_caption,
            "access_token": token,
        },
    )
    creation_id = str(container.get("id") or "")
    if not creation_id:
        raise RuntimeError(f"Instagram media response did not include id: {container}")

    last_status: dict[str, Any] = {}
    for attempt in range(1, 7):
        time.sleep(2 if attempt > 1 else 0)
        last_status = request_json(
            "GET",
            f"https://graph.facebook.com/{version}/{creation_id}?fields=status_code&access_token={token}",
        )
        if last_status.get("status_code") in {"FINISHED", "PUBLISHED"}:
            break
        if last_status.get("status_code") == "ERROR":
            raise RuntimeError(f"Instagram media container failed: {last_status}")

    published = request_json(
        "POST",
        f"{base_url}/media_publish",
        data={
            "creation_id": creation_id,
            "access_token": token,
        },
    )
    return {"container": container, "status": last_status, "published": published}


def publish(post: SocialPost, platforms: list[str]) -> dict[str, Any]:
    clients = {
        "x": post_to_x,
        "threads": post_to_threads,
        "instagram": post_to_instagram,
    }
    results: dict[str, Any] = {}
    failures: dict[str, str] = {}

    for platform in platforms:
        try:
            results[platform] = clients[platform](post)
            print(f"published {platform}")
        except Exception as exc:  # noqa: BLE001 - surface all platform failures in one report.
            failures[platform] = str(exc)
            print(f"failed {platform}: {exc}", file=sys.stderr)
            if bool_env("REQUIRE_ALL_PLATFORMS", True):
                break

    if failures:
        raise RuntimeError(json.dumps(failures, ensure_ascii=False, indent=2))
    return results


def main() -> int:
    parser = argparse.ArgumentParser(description="Publish Denny's daily social post.")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Print the selected post without publishing.")
    mode.add_argument("--publish", action="store_true", help="Publish the selected post.")
    parser.add_argument("--force", action="store_true", help="Publish even if today's success log already exists.")
    args = parser.parse_args()

    load_dotenv()
    date_text = post_date()
    platforms = enabled_platforms()
    post = select_post(date_text, platforms)
    validate_post(post, platforms)

    print(f"date: {post.date}")
    print(f"title: {post.title}")
    print(f"source: {post.source}" + (f" ({post.model})" if post.model else ""))
    print(f"platforms: {', '.join(platforms)}")
    print("")
    print(post.text)

    if not args.publish:
        print("")
        print("dry-run complete; nothing was published.")
        return 0

    if already_posted(date_text) and not args.force:
        print(f"{date_text} already has a successful post log; skipping.")
        return 0

    try:
        results = publish(post, platforms)
    except Exception as exc:  # noqa: BLE001
        append_log(
            {
                "date": date_text,
                "status": "failed",
                "title": post.title,
                "source": post.source,
                "model": post.model,
                "platforms": platforms,
                "error": str(exc),
                "created_at": datetime.now(KST).isoformat(),
            }
        )
        raise

    append_log(
        {
            "date": date_text,
            "status": "success",
            "title": post.title,
            "source": post.source,
            "model": post.model,
            "platforms": platforms,
            "results": results,
            "created_at": datetime.now(KST).isoformat(),
        }
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
