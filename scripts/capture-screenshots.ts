#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';

type Args = Record<string, string | boolean>;
type JsonTarget = { type?: string; webSocketDebuggerUrl?: string };
type CdpMessage = { id?: number; result?: any; data?: string };
type CdpSender = (method: string, params?: Record<string, unknown>) => Promise<CdpMessage>;

const args = parseArgs(process.argv.slice(2));
const url = requiredString(optionalString(args.url), '--url');
const outDir = optionalString(args.out) ?? process.cwd();
const name = optionalString(args.name) ?? 'social-screenshot';
const click = optionalString(args.click);
const width = Number(optionalString(args.width) ?? 1440);
const height = Number(optionalString(args.height) ?? 960);
const chrome = optionalString(args.chrome) ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = Number(optionalString(args.port) ?? 9333);
const waitMs = Number(optionalString(args.wait) ?? 1000);

await fs.mkdir(outDir, { recursive: true });
const pngPath = path.join(outDir, `${name}.png`);

if (!click) {
  await run(chrome, ['--headless=new', '--disable-gpu', `--window-size=${width},${height}`, `--screenshot=${pngPath}`, url]);
  console.log(JSON.stringify({ pngPath }, null, 2));
  process.exit(0);
}

const userDataDir = path.join(outDir, `.chrome-${Date.now()}`);
const child = spawn(chrome, [
  '--headless=new',
  '--disable-gpu',
  `--remote-debugging-port=${port}`,
  `--window-size=${width},${height}`,
  `--user-data-dir=${userDataDir}`,
  url
], { stdio: 'ignore', detached: true });
child.unref();

try {
  await wait(1500);
  const pages = await retryJson<JsonTarget[]>(`http://127.0.0.1:${port}/json`, 20);
  const page = pages.find((item) => item.type === 'page');
  if (!page?.webSocketDebuggerUrl) throw new Error('No Chrome page target found.');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  const send = makeCdpSender(ws);
  await new Promise<void>((resolve) => { ws.onopen = () => resolve(); });
  await send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(click)})?.click()` });
  await wait(waitMs);
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  if (!shot.result?.data) throw new Error('Chrome did not return screenshot data.');
  await fs.writeFile(pngPath, Buffer.from(shot.result.data, 'base64'));
  ws.close();
  console.log(JSON.stringify({ pngPath, clicked: click }, null, 2));
} finally {
  await fs.rm(userDataDir, { recursive: true, force: true }).catch(() => {});
}

function parseArgs(argv: string[]): Args {
  const result: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) result[key] = true;
    else result[key] = argv[++i];
  }
  return result;
}

function requiredString(value: string | undefined, label: string): string {
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(command: string, commandArgs: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: 'inherit' });
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
    child.on('error', reject);
  });
}

function getJson<T>(requestUrl: string): Promise<T> {
  return new Promise((resolve, reject) => {
    http.get(requestUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve(JSON.parse(data) as T));
    }).on('error', reject);
  });
}

async function retryJson<T>(requestUrl: string, attempts: number): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try { return await getJson<T>(requestUrl); }
    catch (error) { lastError = error; await wait(250); }
  }
  throw lastError;
}

function makeCdpSender(ws: WebSocket): CdpSender {
  let id = 0;
  const pending = new Map<number, (message: CdpMessage) => void>();
  ws.onmessage = (event) => {
    const message = JSON.parse(String(event.data)) as CdpMessage;
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)?.(message);
      pending.delete(message.id);
    }
  };
  return (method, params = {}) => new Promise((resolve) => {
    const msgId = ++id;
    pending.set(msgId, resolve);
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

