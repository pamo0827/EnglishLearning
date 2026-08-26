#!/usr/bin/env node
/**
 * content/questions.ts から静的配信用のデータを書き出す。
 *
 *   npm run content:build
 *
 * 出力:
 *   public/data/index.json     章と問題の公開メタデータ（正解を含まない）
 *   public/data/enc/{id}.json  暗号化した正解データ（採点時にだけ取得・復号する）
 *
 * 正解英文・日本語訳・ヒントは index.json には一切入れない。
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA_DIR = path.join(ROOT, "public", "data");
const ENC_DIR = path.join(DATA_DIR, "enc");
const AUDIO_DIR = path.join(ROOT, "public", "audio");

const { CHAPTERS, QUESTIONS } = await import("../content/questions.ts");
const { seal } = await import("../lib/crypto.ts");

async function hasAudio(id) {
  try {
    const stat = await fs.stat(path.join(AUDIO_DIR, `${id}.mp3`));
    return stat.size > 0;
  } catch {
    return false;
  }
}

await fs.rm(ENC_DIR, { recursive: true, force: true });
await fs.mkdir(ENC_DIR, { recursive: true });

const questions = [];
for (const q of QUESTIONS) {
  questions.push({
    id: q.id,
    chapter: q.chapter,
    level: q.level,
    difficulty: q.difficulty,
    audio: await hasAudio(q.id),
  });

  // 正解データは暗号化してから書き出す
  const sealed = await seal(q.id, {
    transcript: q.transcript,
    translation: q.translation,
    hints: q.hints,
  });
  await fs.writeFile(
    path.join(ENC_DIR, `${q.id}.json`),
    JSON.stringify(sealed)
  );
}

const chapters = CHAPTERS.map((c) => {
  const inChapter = questions.filter((q) => q.chapter === c.id);
  return {
    id: c.id,
    title: c.title,
    questionCount: inChapter.length,
    // 音声が全問そろっている章だけ選択できるようにする
    ready: inChapter.length > 0 && inChapter.every((q) => q.audio),
  };
});

await fs.writeFile(
  path.join(DATA_DIR, "index.json"),
  JSON.stringify({ chapters, questions }, null, 2)
);

// 書き出した公開データに正解が混ざっていないことを検査する
const publicText = await fs.readFile(path.join(DATA_DIR, "index.json"), "utf8");
const leaked = QUESTIONS.filter(
  (q) =>
    publicText.includes(q.transcript.slice(0, 24)) ||
    publicText.includes(q.translation.slice(0, 12))
);
if (leaked.length > 0) {
  console.error(`正解が index.json へ漏れています: Q${leaked.map((q) => q.id).join(", ")}`);
  process.exit(1);
}

console.log(`章 ${chapters.length} / 問題 ${questions.length}`);
for (const c of chapters) {
  const missing = questions.filter((q) => q.chapter === c.id && !q.audio);
  console.log(
    `  ${c.title}  ${c.questionCount}問  ${
      c.ready ? "音声そろい" : `音声未生成 ${missing.length}問（Q${missing.map((q) => q.id).join(", ")}）`
    }`
  );
}
console.log("正解の漏洩チェック: OK");
