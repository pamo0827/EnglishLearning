#!/usr/bin/env node
/**
 * リスニングの音声を public/listening/ へ事前生成する。
 *
 *   npm run listening:audio            未生成のものだけ作る
 *   npm run listening:audio -- --force すべて作り直す
 *
 * 会話（Part 3）は話者ごとに別のボイスで合成し、間に無音を挟んで ffmpeg で
 * 連結する。1つのボイスで全部読ませると、誰が話しているのかが音から分からず、
 * Part 3 の「話者を追う」という要素が失われるため。
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "listening");

/** 発話の間に挟む無音の長さ（秒）。会話のテンポを作る */
const GAP_SEC = 0.45;

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = await fs.readFile(path.join(ROOT, file), "utf8");
      for (const line of text.split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    } catch {
      // 無ければ無視
    }
  }
}

await loadEnv();

const { LISTENING_SETS } = await import("../content/listening.ts");
const { synthesize } = await import("./tts.mjs");

const force = process.argv.includes("--force");
await fs.mkdir(OUT_DIR, { recursive: true });

/** 連結できるよう、発話と同じ形式（mp3 44.1kHz 128kbps）の無音を作る */
async function makeSilence(dest) {
  await exec("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "lavfi",
    "-i", `anullsrc=r=44100:cl=mono`,
    "-t", String(GAP_SEC),
    "-c:a", "libmp3lame", "-b:a", "128k",
    dest,
  ]);
}

let created = 0;
let skipped = 0;
const failed = [];

for (const set of LISTENING_SETS) {
  const dest = path.join(OUT_DIR, `${set.id}.mp3`);
  if (!force) {
    try {
      const stat = await fs.stat(dest);
      console.log(`Set${set.id}\tskip\t${stat.size} bytes（既存）`);
      skipped++;
      continue;
    } catch {
      // 未生成なので作る
    }
  }

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "listening-"));
  try {
    const parts = [];
    const silence = path.join(tmp, "gap.mp3");
    await makeSilence(silence);

    for (const [i, line] of set.lines.entries()) {
      const mp3 = await synthesize({
        transcript: line.text,
        voice: line.voice,
        speed: set.speed,
      });
      const file = path.join(tmp, `${i}.mp3`);
      await fs.writeFile(file, mp3);
      if (i > 0) parts.push(silence);
      parts.push(file);
    }

    const listFile = path.join(tmp, "list.txt");
    await fs.writeFile(
      listFile,
      parts.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join("\n")
    );
    await exec("ffmpeg", [
      "-y", "-loglevel", "error",
      "-f", "concat", "-safe", "0",
      "-i", listFile,
      "-c", "copy",
      dest,
    ]);

    const stat = await fs.stat(dest);
    const { stdout } = await exec("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      dest,
    ]);
    console.log(
      `Set${set.id}\tok\t${stat.size} bytes\t${Number(stdout).toFixed(1)}秒\tPart${set.part} ${set.lines.length}発話`
    );
    created++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Set${set.id}\tFAILED\t${message.slice(0, 200)}`);
    failed.push(set.id);
  } finally {
    await fs.rm(tmp, { recursive: true, force: true });
  }
}

console.log(`\n生成 ${created} 件 / スキップ ${skipped} 件 / 失敗 ${failed.length} 件`);
if (failed.length > 0) {
  console.error(`失敗したセット: ${failed.join(", ")}`);
  process.exit(1);
}
