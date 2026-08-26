#!/usr/bin/env node
/**
 * 問題音声を public/audio/ へ事前生成する。
 *
 *   npm run audio:generate           未生成のものだけ作る
 *   npm run audio:generate -- --force  すべて作り直す
 *
 * 事前生成しておくと実行時の TTS 呼び出しが無くなるため、Vercel のように
 * ファイルシステムが揮発する環境でも無料枠を消費しない。
 * 生成物は機械音声を含めないよう、外部プロバイダが使えない場合は失敗させる。
 *
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.join(ROOT, "public", "audio");

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
      // ファイルが無ければ無視
    }
  }
}

await loadEnv();

const { QUESTIONS } = await import("../content/questions.ts");
const { synthesize } = await import("./tts.mjs");

const force = process.argv.includes("--force");
await fs.mkdir(OUT_DIR, { recursive: true });

let created = 0;
let skipped = 0;
const failed = [];

for (const q of QUESTIONS) {
  const dest = path.join(OUT_DIR, `${q.id}.mp3`);
  if (!force) {
    try {
      const stat = await fs.stat(dest);
      console.log(`Q${q.id}\tskip\t${stat.size} bytes（既存）`);
      skipped++;
      continue;
    } catch {
      // 未生成なので作る
    }
  }

  try {
    const mp3 = await synthesize(q);
    await fs.writeFile(dest, mp3);
    console.log(`Q${q.id}\tok\t${mp3.length} bytes\t第${q.chapter}章 Lv${q.difficulty} ${q.voice}`);
    created++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Q${q.id}\tFAILED\t${message}`);
    failed.push(q.id);
  }
}

console.log(`\n生成 ${created} 件 / スキップ ${skipped} 件 / 失敗 ${failed.length} 件`);
if (failed.length > 0) {
  console.error(`失敗した問題: ${failed.join(", ")}`);
  process.exit(1);
}
