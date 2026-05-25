# Repository Guidelines

## Project Structure & Module Organization

This repository automates daily social posts for Problem Solver, Denny.

- `scripts/post_daily.py`: main Python script for selecting, validating, and publishing posts.
- `content/daily_posts.json`: rotating daily post bank.
- `content/report_summary.md`: source summary derived from the PDF report.
- `.github/workflows/daily-social.yml`: GitHub Actions schedule for 09:00 KST posting.
- `.env.example`: required local and CI configuration variables.
- `*.png`, `*.webp`, `*.pdf`: brand assets and source report.

No test suite exists yet. Add tests under `tests/` when introducing non-trivial logic.

## Build, Test, and Development Commands

Run from the repository root:

```bash
python3 scripts/post_daily.py --dry-run
```

Prints the selected post for the current Korea date without publishing.

```bash
POST_DATE=2026-05-25 python3 scripts/post_daily.py --dry-run
```

Checks a specific date’s content selection.

```bash
python3 -m py_compile scripts/post_daily.py
```

Performs a basic Python syntax check.

```bash
python3 -m json.tool content/daily_posts.json
```

Validates post content JSON formatting.

## Coding Style & Naming Conventions

Use Python 3.12-compatible code and standard library dependencies unless there is a clear need for an external package. Keep functions small and explicit. Use `snake_case` for functions, variables, and file names. Prefer typed function signatures for new Python code.

Content entries in `content/daily_posts.json` must include `title` and `text`. Keep social copy within X’s 280-character limit unless platform-specific handling is added.

## Testing Guidelines

Before changes are considered ready, run:

```bash
python3 scripts/post_daily.py --dry-run
python3 -m py_compile scripts/post_daily.py
python3 -m json.tool content/daily_posts.json
```

If tests are added, use `pytest`, place files under `tests/`, and name them `test_*.py`. Focus coverage on date rotation, character limits, environment validation, and duplicate-post logging.

## Commit & Pull Request Guidelines

This directory currently has no Git history, so use clear Conventional Commit-style messages, for example:

- `feat: add new social post templates`
- `fix: handle missing Instagram image URL`
- `docs: update setup instructions`

Pull requests should include a short summary, verification commands run, configuration changes, and any platform/API behavior affected. For content changes, include one or two sample generated posts.

## Security & Configuration Tips

Never commit `.env`, access tokens, or platform account IDs. Use GitHub Actions secrets for production values. Instagram publishing requires a publicly reachable image URL, not a local file path.
