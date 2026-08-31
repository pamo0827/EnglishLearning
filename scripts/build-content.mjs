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
const { READING_CHAPTERS, READING_SETS, SPEED_RANKS } = await import(
  "../content/reading.ts"
);
const { LISTENING_CHAPTERS, LISTENING_SETS } = await import(
  "../content/listening.ts"
);
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

/* ------------------------------------------------------------------ *
 * 長文読解
 *
 * 本文と設問文・選択肢は読むために必要なので公開する。
 * 隠すのは「どれが正解か」と解説だけ。
 * ------------------------------------------------------------------ */

const READING_ENC_DIR = path.join(DATA_DIR, "reading-enc");
await fs.rm(READING_ENC_DIR, { recursive: true, force: true });
await fs.mkdir(READING_ENC_DIR, { recursive: true });

const sets = [];
for (const set of READING_SETS) {
  sets.push({
    id: set.id,
    chapter: set.chapter,
    format: set.format,
    docType: set.docType,
    title: set.title,
    passages: set.passages,
    // 設問文と選択肢だけ。answer / evidence / why / choiceNotes は出さない
    questions: set.questions.map((q) => ({
      stem: q.stem,
      choices: q.choices,
    })),
    targetSecPerQuestion: set.targetSecPerQuestion,
    wordCount: set.passages
      .map((p) => p.body.trim().split(/\s+/).length)
      .reduce((a, b) => a + b, 0),
  });

  const sealed = await seal(`reading:${set.id}`, {
    questions: set.questions.map((q) => ({
      answer: q.answer,
      type: q.type,
      evidence: q.evidence,
      why: q.why,
      choiceNotes: q.choiceNotes,
    })),
  });
  await fs.writeFile(
    path.join(READING_ENC_DIR, `${set.id}.json`),
    JSON.stringify(sealed)
  );
}

const readingChapters = READING_CHAPTERS.map((c) => {
  const inChapter = sets.filter((s) => s.chapter === c.id);
  return {
    id: c.id,
    title: c.title,
    setCount: inChapter.length,
    questionCount: inChapter.reduce((n, s) => n + s.questions.length, 0),
  };
});

await fs.writeFile(
  path.join(DATA_DIR, "reading.json"),
  JSON.stringify(
    {
      chapters: readingChapters,
      sets,
      // Infinity は JSON にできないので、最後のランクは null（上限なし）にする
      ranks: SPEED_RANKS.map((r) => ({
        rank: r.rank,
        maxSec: Number.isFinite(r.maxSec) ? r.maxSec : null,
        label: r.label,
      })),
    },
    null,
    2
  )
);

// 公開データに解説が混ざっていないか検査する。
// 解説は本文の英語を引用するので、英語ごと照合すると引用部分に一致して
// 誤検知する。本文は英語しか含まないため、解説の「日本語だけの塊」で照合する。
const readingText = await fs.readFile(path.join(DATA_DIR, "reading.json"), "utf8");
const japaneseRuns = (text) =>
  (text.match(/[ぁ-んァ-ヴ一-龯ー]{8,}/g) ?? []);

const readingLeaks = [];
for (const set of READING_SETS) {
  for (const [i, q] of set.questions.entries()) {
    const check = (label, text) => {
      for (const run of japaneseRuns(text)) {
        if (readingText.includes(run)) {
          readingLeaks.push(`set${set.id} Q${i + 1} ${label}: ${run}`);
        }
      }
    };
    check("why", q.why);
    for (const n of q.choiceNotes) check("note", n);
    // 正解の添字が公開データに出ていないことも確かめる
    if (readingText.includes(`"answer"`)) readingLeaks.push(`set${set.id} answer`);
  }
}
if (readingLeaks.length > 0) {
  console.error(`解説が reading.json へ漏れています: ${readingLeaks.join(", ")}`);
  process.exit(1);
}

console.log(
  `\n長文読解: 章 ${readingChapters.length} / セット ${sets.length} / 設問 ${sets.reduce((n, s) => n + s.questions.length, 0)}`
);
for (const c of readingChapters) {
  console.log(`  ${c.title}  ${c.setCount}セット ${c.questionCount}問`);
}
console.log("解説の漏洩チェック: OK");

/* ------------------------------------------------------------------ *
 * 長文リスニング
 *
 * 音声・設問文・選択肢は公開する（本番でも設問は印刷されている）。
 * 隠すのは台本・正解・解説。台本を先に見せたら聞き取りの練習にならない。
 * ------------------------------------------------------------------ */

const LISTENING_ENC_DIR = path.join(DATA_DIR, "listening-enc");
const LISTENING_AUDIO_DIR = path.join(ROOT, "public", "listening");
await fs.rm(LISTENING_ENC_DIR, { recursive: true, force: true });
await fs.mkdir(LISTENING_ENC_DIR, { recursive: true });

const listeningSets = [];
for (const set of LISTENING_SETS) {
  let hasAudio = false;
  try {
    const stat = await fs.stat(path.join(LISTENING_AUDIO_DIR, `${set.id}.mp3`));
    hasAudio = stat.size > 0;
  } catch {
    hasAudio = false;
  }

  listeningSets.push({
    id: set.id,
    chapter: set.chapter,
    part: set.part,
    scene: set.scene,
    title: set.title,
    speakerCount: new Set(set.lines.map((l) => l.speaker)).size,
    questions: set.questions.map((q) => ({ stem: q.stem, choices: q.choices })),
    audio: hasAudio,
  });

  const sealed = await seal(`listening:${set.id}`, {
    lines: set.lines.map((l) => ({ speaker: l.speaker, text: l.text, ja: l.ja })),
    questions: set.questions.map((q) => ({
      answer: q.answer,
      type: q.type,
      evidence: q.evidence,
      why: q.why,
      choiceNotes: q.choiceNotes,
    })),
  });
  await fs.writeFile(
    path.join(LISTENING_ENC_DIR, `${set.id}.json`),
    JSON.stringify(sealed)
  );
}

const listeningChapters = LISTENING_CHAPTERS.map((c) => {
  const inChapter = listeningSets.filter((s) => s.chapter === c.id);
  return {
    id: c.id,
    title: c.title,
    setCount: inChapter.length,
    questionCount: inChapter.reduce((n, s) => n + s.questions.length, 0),
    ready: inChapter.length > 0 && inChapter.every((s) => s.audio),
  };
});

await fs.writeFile(
  path.join(DATA_DIR, "listening.json"),
  JSON.stringify({ chapters: listeningChapters, sets: listeningSets }, null, 2)
);

// 台本と解説が公開データへ出ていないことを検査する
const listeningText = await fs.readFile(
  path.join(DATA_DIR, "listening.json"),
  "utf8"
);
const listeningLeaks = [];
for (const set of LISTENING_SETS) {
  for (const line of set.lines) {
    if (listeningText.includes(line.text.slice(0, 24))) {
      listeningLeaks.push(`set${set.id} 台本(英語)`);
    }
    for (const run of japaneseRuns(line.ja)) {
      if (listeningText.includes(run)) listeningLeaks.push(`set${set.id} 台本(訳)`);
    }
  }
  for (const [i, q] of set.questions.entries()) {
    for (const run of japaneseRuns(q.why + " " + q.choiceNotes.join(" "))) {
      if (listeningText.includes(run)) {
        listeningLeaks.push(`set${set.id} Q${i + 1} 解説: ${run}`);
      }
    }
  }
}
if (listeningLeaks.length > 0) {
  console.error(`台本か解説が listening.json へ漏れています: ${listeningLeaks.join(", ")}`);
  process.exit(1);
}

console.log(
  `\n長文リスニング: 章 ${listeningChapters.length} / セット ${listeningSets.length} / 設問 ${listeningSets.reduce((n, s) => n + s.questions.length, 0)}`
);
for (const c of listeningChapters) {
  const missing = listeningSets.filter((s) => s.chapter === c.id && !s.audio);
  console.log(
    `  ${c.title}  ${c.setCount}セット ${c.questionCount}問  ${
      c.ready ? "音声そろい" : `音声未生成 ${missing.length}セット`
    }`
  );
}
console.log("台本・解説の漏洩チェック: OK");
