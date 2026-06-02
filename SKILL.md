---
name: dev-social-media
description: Journal shipped work, generate social release drafts, capture app screenshots, and create or schedule Typefully posts for the social platforms connected to a Typefully social set.
---

# Dev Social Media

Use this skill when a user wants to journal what they built, turn recent project or product work into public update posts, capture proof screenshots, and create or schedule posts through Typefully. It is intentionally project-agnostic and should work for web developers, indie hackers, product builders, open source maintainers, designers, and anyone else documenting progress in public. The commands are designed to work across Windows PowerShell, macOS, and Linux when Node.js and the required local tools are available.

## Environment

The Typefully script reads exactly one credential from the environment:

- `TYPEFULLY_API_TOKEN`

Do not paste tokens into commands, files, screenshots, or social drafts. Do not require environment variables for screenshot paths, post text, output folders, viewport size, publish time, or social set IDs. Use CLI arguments for those values.

## Default Workflow

1. Inspect the update.
   - Read recent commits, README, package metadata, changelogs, changed files, and any existing screenshots.
   - Identify what actually shipped. Do not invent metrics, users, integrations, or maturity.
   - Capture the user's personal story when they provide one, but keep it grounded in facts.
   - Reuse prior ChatGPT drafts when the user provides them as pasted text, attachments, exported files, or readable workspace files.

2. Capture screenshots when the update is visual.
   - Use `scripts/capture-screenshots.ts` with explicit CLI arguments.
   - Save temporary screenshots outside Git-tracked paths unless the user asks to commit them.
   - Convert committed README/social assets to WebP with FFmpeg when needed.

3. Draft platform-specific posts.
   - X/Twitter: short, concrete, skimmable. Use a thread when the story needs multiple beats.
   - LinkedIn: slightly longer. Explain product intent, what changed, why it matters, and what comes next.
   - Include recommended screenshot paths for the user to attach when screenshots exist.

4. Verify before creating remote drafts.
   - Show final text, links, target platforms, media paths, and publish timing.
   - Dry-run `scripts/publish-typefully.ts` before creating or scheduling a Typefully post.
   - Ask for explicit approval before running `--create`.

5. Create or schedule Typefully posts only after approval.
   - The script uses `TYPEFULLY_API_TOKEN`.
   - Text is passed as `--text`, `--file`, or stdin. Do not load post text from environment variables.
   - If `--social-set-id` is omitted, the script selects the default Typefully social set, or the first set if none is marked default.
   - Use `--publish-at` only when the user explicitly asks to schedule or publish.

## Useful Commands

Capture a screenshot from a running web app:

```bash
node C:/github/dev-social-media-skill/scripts/capture-screenshots.ts --url http://127.0.0.1:3000 --out C:/tmp/social-release --name app-release
```

On macOS or Linux, use the local path where this skill is installed:

```bash
node ./scripts/capture-screenshots.ts --url http://127.0.0.1:3000 --out /tmp/social-release --name app-release
```

Capture after clicking a UI element:

```bash
node C:/github/dev-social-media-skill/scripts/capture-screenshots.ts --url http://127.0.0.1:3000 --out C:/tmp/social-release --name app-preview --click ".preview-button"
```

Convert PNG to WebP with FFmpeg:

```bash
ffmpeg -y -i C:/tmp/social-release/app-release.png -vf scale=1440:-1 -c:v libwebp -quality 82 C:/tmp/social-release/app-release.webp
```

Dry-run a Typefully draft for both platforms:

```bash
node C:/github/dev-social-media-skill/scripts/publish-typefully.ts --text "Shipping a new product update today." --platforms x,linkedin
```

Dry-run from a file:

```bash
node C:/github/dev-social-media-skill/scripts/publish-typefully.ts --file C:/tmp/social-release/post.md --platforms x,linkedin
```

Create a Typefully draft after user approval:

```bash
node C:/github/dev-social-media-skill/scripts/publish-typefully.ts --file C:/tmp/social-release/post.md --platforms x,linkedin --create
```

macOS/Linux equivalent from the skill repository:

```bash
node ./scripts/publish-typefully.ts --file /tmp/social-release/post.md --platforms x,linkedin --create
```

Schedule through Typefully after user approval:

```bash
node C:/github/dev-social-media-skill/scripts/publish-typefully.ts --file C:/tmp/social-release/post.md --platforms x,linkedin --publish-at 2026-06-03T01:00:00Z --create
```

Publish immediately through Typefully after user approval:

```bash
node C:/github/dev-social-media-skill/scripts/publish-typefully.ts --file C:/tmp/social-release/post.md --platforms x,linkedin --publish-at now --create
```

Target a specific Typefully social set:

```bash
node C:/github/dev-social-media-skill/scripts/publish-typefully.ts --file C:/tmp/social-release/post.md --platforms x,linkedin --social-set-id 123 --create
```

Pipe text instead of using a file:

```bash
Get-Content C:/tmp/social-release/post.md | node C:/github/dev-social-media-skill/scripts/publish-typefully.ts --platforms x,linkedin
```

## Typefully Notes

- The CLI accepts `twitter` and `x`; the Typefully API payload uses platform key `x`.
- Typefully v2 uses `Authorization: Bearer <TYPEFULLY_API_TOKEN>`.
- For X/Twitter threads, separate posts with a line containing three or more dashes.
- Typefully can fan out to platforms connected to the selected social set. This skill currently builds payloads for X/Twitter and LinkedIn because those are the supported payloads in `publish-typefully.ts`.
- `--publish-at now` requests immediate publishing through Typefully.
- `--publish-at <ISO timestamp>` schedules through Typefully.

Thread input example:

```text
First post.
---
Second post.
```

## Prior ChatGPT Drafts

Use previous ChatGPT drafts as source material when available. Do not claim access to a user's private ChatGPT history unless the current environment exposes it. The user must provide the draft text directly, attach a file, point to a readable export, or place the draft in the workspace.

Good source forms:

- pasted draft text in the current chat
- Markdown, text, or JSON export files
- local draft files in the current repository or a temporary folder
- screenshots only when text extraction is practical and the user approves

When prior drafts are provided:

- Preserve the user's original intent and voice.
- Reconcile the draft against the current codebase before posting.
- Keep outdated claims out of the final post.
- Mention the source material in your working notes, not in the public post unless the user asks.
- Ask before publishing if the provided draft contains sensitive, private, or unfinished information.

## Drafting Rules

- Lead with the shipped thing, not the backstory.
- Prefer concrete product details over vague claims.
- Say "prototype", "early release", or "work in progress" when the product is not production-ready.
- Name the repo, app, product, or project once in the first sentence.
- Include the public repo, demo, or waitlist URL when available.
- Keep X posts under 260 characters when possible if no thread is requested.
- For LinkedIn, use 3-6 short paragraphs or a short bullet list.
- Do not post secrets, private repo URLs, local file paths, API keys, unreleased customer information, or claims the user did not make.

## Output Shape

When preparing a release, provide:

- `X/Twitter draft`: final text or thread.
- `LinkedIn draft`: final text.
- `Media`: screenshot/WebP paths and recommended image order.
- `Typefully commands`: dry-run command first, then the create or schedule command gated by approval.
- `Checks`: build/test/screenshot status and whether drafts/assets are ignored or committed.

## Publishing Safety

Creating, scheduling, or publishing Typefully posts is a live external action. Do not run `publish-typefully.ts --create` unless the user explicitly says to create, schedule, or publish through Typefully. If credentials are missing, stop at drafts and explain that `TYPEFULLY_API_TOKEN` is missing.
