#!/usr/bin/env node
/**
 * 採点エンジンの総当たりテスト。
 *
 *   npm run grade:test          結果を表示し、test/grading-report.md を更新する
 *   npm run grade:test -- --quiet  失敗だけ表示する
 *
 * 全問題について、現実に起こりうる聞き間違いを機械的に作って採点させ、
 *   1. 同義とみなすべき入力が満点になるか
 *   2. 落とした語が正しく検出されるか
 *   3. 間違えたときに必ず解説が出るか（解説の穴を洗い出す）
 * を検査する。3 の結果は解説を書き足す指針になる。
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { QUESTIONS } = await import("../content/questions.ts");
const { grade, FUNCTION_WORDS } = await import("../lib/grade.ts");

const quiet = process.argv.includes("--quiet");

/** 音が似ていて実際に混同されやすい語の対応表 */
const CONFUSIONS = {
  pulled: "polled", meet: "meat", with: "width", to: "too", of: "off",
  been: "bin", then: "than", their: "there", would: "wood", could: "good",
  say: "sale", catch: "cash", first: "fast", head: "had", train: "rain",
  friend: "front", work: "walk", got: "gut", call: "cool", heard: "hurt",
  home: "hold", plans: "plants", tickets: "tick it", stay: "stay up",
  bill: "build", whole: "hole", last: "lost", made: "make", late: "later",
  know: "no", tell: "told", check: "chick", split: "spit", ages: "age",
  text: "test", address: "dress", deal: "dill", cover: "covered",
  shift: "ship", file: "final", tried: "try", worth: "worse", top: "tap",
  look: "luck", hang: "hand", into: "in to", longer: "long", wrong: "long",
};

const equivalents = [
  { name: "そのまま", fn: (t) => t },
  { name: "小文字・句読点なし", fn: (t) => t.toLowerCase().replace(/[.,—?!]/g, "") },
  { name: "アポストロフィ抜き", fn: (t) => t.replace(/[''’]/g, "") },
  { name: "短縮形を展開", fn: (t) =>
      t.replace(/\bI'm\b/g, "I am").replace(/\bI'll\b/g, "I will")
       .replace(/\bhe'd\b/gi, "he would").replace(/\bshe'd\b/gi, "she would")
       .replace(/\bI'd\b/g, "I had").replace(/\bit's\b/gi, "it is")
       .replace(/\bcouldn't\b/gi, "could not").replace(/\bhaven't\b/gi, "have not")
       .replace(/\bdidn't\b/gi, "did not").replace(/\bdon't\b/gi, "do not")
       .replace(/\bwasn't\b/gi, "was not").replace(/\bcould've\b/gi, "could have")
       .replace(/\bwould've\b/gi, "would have").replace(/\bgonna\b/gi, "going to")
       .replace(/\bwanna\b/gi, "want to").replace(/\bkinda\b/gi, "kind of")
       .replace(/\bsorta\b/gi, "sort of").replace(/\bdunno\b/gi, "do not know")
       .replace(/\blemme\b/gi, "let me").replace(/\by'know\b/gi, "you know"),
  },
  { name: "フィラー混入", fn: (t) => "um, " + t.replace(/ /, " uh ") },
];

const words = (t) => t.match(/[A-Za-z0-9''’\-]+/g) ?? [];

const results = [];
let failures = 0;

for (const q of QUESTIONS) {
  const record = {
    id: q.id,
    chapter: q.chapter,
    difficulty: q.difficulty,
    transcript: q.transcript,
    cases: [],
    hintGaps: [],
  };

  const check = (name, answer, assert) => {
    const r = grade(q, answer);
    const problems = assert(r) ?? [];
    record.cases.push({ name, answer, score: r.score, problems });
    if (problems.length > 0) {
      failures++;
      console.error(`Q${q.id} [${name}] ${problems.join(" / ")}\n     入力: ${answer}`);
    }
    return r;
  };

  // 1. 同義とみなすべき入力は満点でなければならない
  for (const v of equivalents) {
    check(`同義:${v.name}`, v.fn(q.transcript), (r) => {
      const p = [];
      if (r.score !== 100) p.push(`満点にならない (${r.score})`);
      if (!r.perfect) {
        const bad = r.words.filter((w) => w.status !== "ok").map((w) => w.word);
        p.push(`誤判定: ${bad.join(", ")}`);
      }
      return p;
    });
  }

  // 2. 語を1つ落としたら、その語が検出されなければならない
  const ws = words(q.transcript);
  for (let i = 0; i < ws.length; i++) {
    const dropped = ws[i];
    const answer = [...ws.slice(0, i), ...ws.slice(i + 1)].join(" ");
    const occurrences = ws.filter(
      (w) => w.toLowerCase() === dropped.toLowerCase()
    ).length;
    const r = check(`脱落:${dropped}`, answer, (res) => {
      const p = [];
      if (res.score >= 100) p.push("満点のまま（脱落を見逃した）");
      // 同じ綴りが複数あるので、ok と判定された個数が1つ減っているかで見る
      const okCount = res.words.filter(
        (w) => w.word.toLowerCase() === dropped.toLowerCase() && w.status === "ok"
      ).length;
      if (okCount >= occurrences) p.push(`${dropped} の脱落を検出できていない`);
      if (res.points.length === 0) p.push("解説が出ない");
      return p;
    });

    // 3. 落とした語に対応する解説があるかを記録する（無ければ書き足す候補）
    const covered = q.hints.some((h) =>
      h.phrase.toLowerCase().split(/\s+/).includes(dropped.toLowerCase())
    );
    if (!covered && r.points.length > 0) {
      const bare = dropped.toLowerCase().replace(/[^a-z0-9']/g, "");
      // 機能語は一般的なポイントで足りるので、内容語だけを穴として扱う
      if (!FUNCTION_WORDS.has(bare)) record.hintGaps.push(dropped);
    }
  }

  // 4. 音の似た語への置き換えは △ 以下になり、誤認識として報告されること
  for (const [correct, misheard] of Object.entries(CONFUSIONS)) {
    const re = new RegExp(`\\b${correct}\\b`, "i");
    if (!re.test(q.transcript)) continue;
    check(`誤認識:${correct}→${misheard}`, q.transcript.replace(re, misheard), (r) => {
      const p = [];
      if (r.perfect) p.push("満点のまま（誤認識を見逃した）");
      if (r.points.length === 0) p.push("解説が出ない");
      return p;
    });
  }

  // 5. 冠詞の余分な挿入は △ になること（挿入が起きた問題だけ検査する）
  const withExtra = q.transcript.replace(/\b(after|to|at|in|on)\b /i, "$1 the ");
  if (withExtra !== q.transcript) {
    check("余分な the", withExtra, (r) =>
      r.perfect ? ["満点のまま（余分な語を見逃した）"] : []
    );
  }

  // 6. 全く違う文は低得点になること
  check("無関係な文", "the weather is nice today and I like cats", (r) =>
    r.score > 35 ? [`高すぎる (${r.score})`] : []
  );

  results.push(record);
}

// 空入力
const empty = grade(QUESTIONS[0], "   ");
if (empty.score !== 0) {
  failures++;
  console.error(`空入力が 0 点にならない (${empty.score})`);
}

const total = results.reduce((n, r) => n + r.cases.length, 0);
const gaps = results.filter((r) => r.hintGaps.length > 0);

console.log(`\n問題 ${results.length} 件 / 検査 ${total} 件 / 失敗 ${failures} 件`);
console.log(`解説が対応していない語を含む問題: ${gaps.length} 件`);

if (!quiet) {
  for (const r of gaps) {
    console.log(`  Q${r.id}: ${r.hintGaps.join(", ")}`);
  }
}

// レポートを保存する
const lines = [
  "# 採点エンジン検査レポート",
  "",
  `自動生成: \`npm run grade:test\`。問題 ${results.length} 件 / 検査 ${total} 件 / 失敗 ${failures} 件。`,
  "",
  "各問題について、同義入力・語の脱落・音の似た語への誤認識・余分な語の挿入を",
  "機械的に作って採点させた結果。「解説なし」の列は、その語を落としたときに",
  "専用の解説が出ないことを示す（一般的なポイントは表示される）。",
  "",
];
for (const r of results) {
  const failed = r.cases.filter((c) => c.problems.length > 0);
  lines.push(`## Q${r.id}（第${r.chapter}章 Lv${r.difficulty}）`);
  lines.push("");
  lines.push(`> ${r.transcript}`);
  lines.push("");
  lines.push(`- 検査 ${r.cases.length} 件 / 失敗 ${failed.length} 件`);
  const scores = r.cases.filter((c) => c.name.startsWith("脱落:"));
  if (scores.length > 0) {
    const min = Math.min(...scores.map((c) => c.score));
    const max = Math.max(...scores.map((c) => c.score));
    lines.push(`- 1語脱落時のスコア: ${min}〜${max}`);
  }
  lines.push(
    `- 解説なし: ${r.hintGaps.length === 0 ? "なし" : r.hintGaps.join(", ")}`
  );
  for (const c of failed) {
    lines.push(`- **失敗** ${c.name}: ${c.problems.join(" / ")}`);
  }
  lines.push("");
}
await fs.mkdir(path.join(ROOT, "test"), { recursive: true });
await fs.writeFile(path.join(ROOT, "test", "grading-report.md"), lines.join("\n"));
console.log("test/grading-report.md を更新しました");

process.exit(failures > 0 ? 1 : 0);
