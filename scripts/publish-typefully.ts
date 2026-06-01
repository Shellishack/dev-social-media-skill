#!/usr/bin/env node

type Platform = "x" | "linkedin";

type ParsedArgs = {
  [key: string]: string | boolean | undefined;
};

const TYPEFULLY_API_BASE = "https://api.typefully.com/v2";

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (!arg.startsWith("--")) {
      continue;
    }

    const key = arg.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    index += 1;
  }

  return parsed;
}

function asString(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) {
    return "";
  }

  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function resolveText(args: ParsedArgs): Promise<string> {
  const inlineText = asString(args.text);

  if (inlineText) {
    return inlineText.trim();
  }

  const filePath = asString(args.file);

  if (filePath) {
    const fs = await import("node:fs/promises");
    return (await fs.readFile(filePath, "utf8")).trim();
  }

  return (await readStdin()).trim();
}

function parsePlatforms(input: string | undefined): Platform[] {
  const rawPlatforms = (input ?? "twitter,linkedin")
    .split(",")
    .map((platform) => platform.trim().toLowerCase())
    .filter(Boolean);

  const normalized = rawPlatforms.map((platform) =>
    platform === "twitter" ? "x" : platform,
  );

  const platforms = normalized.filter(
    (platform): platform is Platform =>
      platform === "x" || platform === "linkedin",
  );

  if (platforms.length === 0) {
    throw new Error("Use --platforms twitter,linkedin, twitter, linkedin, or x.");
  }

  return Array.from(new Set(platforms));
}

function splitTwitterThread(text: string): Array<{ text: string }> {
  return text
    .split(/\n-{3,}\n/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({ text: part }));
}

function buildDraftBody(text: string, platforms: Platform[]) {
  const platformPayload: Record<string, unknown> = {};

  if (platforms.includes("x")) {
    platformPayload.x = {
      enabled: true,
      posts: splitTwitterThread(text),
    };
  }

  if (platforms.includes("linkedin")) {
    platformPayload.linkedin = {
      enabled: true,
      posts: [{ text }],
    };
  }

  return { platforms: platformPayload };
}

function addScheduling(body: ReturnType<typeof buildDraftBody>, publishAt?: string) {
  if (!publishAt) {
    return body;
  }

  return {
    ...body,
    publish_at: publishAt,
  };
}

async function requestJson<T>(url: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const responseText = await response.text();
  const payload = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new Error(
      `Typefully request failed (${response.status}): ${JSON.stringify(payload)}`,
    );
  }

  return payload as T;
}

async function resolveSocialSetId(token: string, explicitSocialSetId?: string): Promise<string> {
  if (explicitSocialSetId) {
    return explicitSocialSetId;
  }

  const socialSetResponse = await requestJson<{
    results?: Array<{ id: string | number; default?: boolean }>;
  }>(
    `${TYPEFULLY_API_BASE}/social-sets`,
    token,
  );
  const socialSets = socialSetResponse.results ?? [];
  const selected = socialSets.find((socialSet) => socialSet.default) ?? socialSets[0];

  if (!selected?.id) {
    throw new Error("No Typefully social set is available for this API token.");
  }

  return String(selected.id);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const text = await resolveText(args);

  if (!text) {
    throw new Error("Provide post text with --text, --file, or stdin.");
  }

  const platforms = parsePlatforms(asString(args.platforms));
  const body = addScheduling(buildDraftBody(text, platforms), asString(args["publish-at"]));

  if (!args.create) {
    console.log(
      JSON.stringify(
        {
          service: "typefully",
          mode: args["publish-at"] ? "dry-run-scheduled" : "dry-run",
          body,
        },
        null,
        2,
      ),
    );
    return;
  }

  const token = process.env.TYPEFULLY_API_TOKEN;

  if (!token) {
    throw new Error("TYPEFULLY_API_TOKEN is required when using --create.");
  }

  const socialSetId = await resolveSocialSetId(token, asString(args["social-set-id"]));
  const result = await requestJson<unknown>(
    `${TYPEFULLY_API_BASE}/social-sets/${encodeURIComponent(socialSetId)}/drafts`,
    token,
    {
      method: "POST",
      body: JSON.stringify(body),
    },
  );

  console.log(
    JSON.stringify(
      {
        service: "typefully",
        mode: args["publish-at"] ? "scheduled-or-created" : "created",
        socialSetId,
        result,
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
