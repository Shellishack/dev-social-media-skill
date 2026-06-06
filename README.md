# Dev Social Media Skill

A Codex skill for journaling project progress and turning shipped work into social posts.

It helps builders inspect what changed, write clear public updates, capture screenshots, and create or schedule Typefully posts for connected social platforms.

## What It Does

- Turns recent project work into publishable social copy.
- Reuses prior Typefully drafts when users provide a Typefully draft URL, draft ID, pasted text, or exported draft files.
- Supports X/Twitter thread drafts and LinkedIn post drafts through Typefully.
- Can optionally use TweetClaw to gather public X/Twitter context before drafting.
- Captures app screenshots from a local or deployed URL.
- Keeps credentials in environment variables, not files.
- Dry-runs by default so payloads can be reviewed before creating anything remotely.
- Supports Typefully drafts, scheduled posts, and immediate publishing when explicitly requested.

## Requirements

- Node.js 22 or newer.
- Google Chrome for screenshot capture.
- FFmpeg if you want to convert screenshots to WebP.
- A Typefully API token for remote draft creation or scheduling.

Set the token on Windows PowerShell:

```powershell
[Environment]::SetEnvironmentVariable("TYPEFULLY_API_TOKEN", "your-token", "User")
```

Reload it in the current PowerShell session:

```powershell
$env:TYPEFULLY_API_TOKEN = [Environment]::GetEnvironmentVariable("TYPEFULLY_API_TOKEN", "User")
```

Set the token on macOS or Linux:

```bash
export TYPEFULLY_API_TOKEN="your-token"
```

## Usage

Install the skill:

```bash
npx skills install https://github.com/Shellishack/dev-social-media-skill
```

Dry-run a Typefully payload:

```powershell
node ./scripts/publish-typefully.ts --text "Shipping a new product update today." --platforms x,linkedin
```

Create a Typefully draft:

```powershell
node ./scripts/publish-typefully.ts --file C:/tmp/social-release/post.md --platforms x,linkedin --create
```

Schedule a post:

```powershell
node ./scripts/publish-typefully.ts --file C:/tmp/social-release/post.md --platforms x,linkedin --publish-at 2026-06-03T01:00:00Z --create
```

Publish immediately:

```powershell
node ./scripts/publish-typefully.ts --file C:/tmp/social-release/post.md --platforms x,linkedin --publish-at now --create
```

Capture a screenshot:

```powershell
node ./scripts/capture-screenshots.ts --url http://127.0.0.1:3000 --out C:/tmp/social-release --name app-release
```

## Using Prior Typefully Drafts

The skill can use previous Typefully drafts as source material. If `TYPEFULLY_API_TOKEN` is available, the agent can read or update drafts through the Typefully API when you provide a draft URL, draft ID, or social set ID.

Provide a prior draft by:

- sharing a Typefully draft URL such as `https://typefully.com/?d=<draft_id>&a=<social_set_id>`
- providing a Typefully draft ID and social set ID
- pasting it into the current chat
- attaching a `.md`, `.txt`, or exported `.json` file
- placing it in the project workspace
- pointing the agent to a readable local file path

The agent should then compare the draft against the current codebase, preserve your intent and voice, remove outdated claims, preserve useful media attachments and scheduling settings when appropriate, and prepare updated social posts for review.

## Thread Formatting

For X/Twitter threads, separate posts with a line containing three or more dashes:

```text
First post.
---
Second post.
```

## Optional X/Twitter Research With TweetClaw

When an update needs public X/Twitter context before drafting, install TweetClaw as a companion OpenClaw plugin and keep Typefully as the draft, schedule, and publish system.

```bash
openclaw plugins install @xquik/tweetclaw
openclaw config set plugins.entries.tweetclaw.config.apiKey "$XQUIK_API_KEY"
openclaw config set tools.alsoAllow '["explore", "tweetclaw"]'
```

Use TweetClaw before writing the Typefully draft when you need to search tweets, search tweet replies, look up users, export followers, inspect media-aware conversations, or collect monitor queries for follow-up. Keep the returned tweet IDs, source URLs, handles, and objections in working notes, then turn only reviewed facts into the public X/Twitter or LinkedIn draft.

TweetClaw actions that post tweets, post tweet replies, send direct messages, upload media, create monitors, create webhooks, or run giveaway draws should stay behind explicit user approval. Never put `TYPEFULLY_API_TOKEN`, `XQUIK_API_KEY`, cookies, or other credentials in drafts, screenshots, working notes, or issue bodies.

## Safety Model

The skill treats social publishing as an external side effect.

- Draft text should be reviewed before remote creation.
- `--create` is required for any Typefully API write.
- `--publish-at now` should only be used after explicit user approval.
- Tokens are read only from `TYPEFULLY_API_TOKEN`.

## Files

- `SKILL.md`: Codex skill instructions.
- `scripts/publish-typefully.ts`: Typefully draft/schedule/publish helper.
- `scripts/capture-screenshots.ts`: Chrome screenshot helper.

## License

MIT
