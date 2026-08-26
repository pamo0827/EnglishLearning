/**
 * 採点エンジン。サーバー・ブラウザのどちらでも動く純粋な関数群。
 * 外部依存は無く、入力は「正解データ」と「ユーザーの回答」だけ。
 */

/** 採点に必要な正解データ。復号後の問題から渡される */
export type Answerable = {
  transcript: string;
  translation: string;
  hints: { phrase: string; note: string }[];
};

/* ------------------------------------------------------------------ *
 * トークン化と正規化
 * ------------------------------------------------------------------ */

/**
 * 会話体の短縮形を、比較用に展開する辞書。
 * "would|had" のように "|" で区切ったものは、どちらに解釈しても正解とみなす。
 * I'd は I would とも I had とも取れるため、音だけからは決められない。
 */
const CONTRACTIONS: Record<string, string[]> = {
  "i'm": ["i", "am"],
  "i've": ["i", "have"],
  "i'll": ["i", "will"],
  "i'd": ["i", "would|had"],
  "you're": ["you", "are"],
  "you've": ["you", "have"],
  "you'll": ["you", "will"],
  "you'd": ["you", "would|had"],
  "he's": ["he", "is|has"],
  "he'll": ["he", "will"],
  "he'd": ["he", "would|had"],
  "she's": ["she", "is|has"],
  "she'll": ["she", "will"],
  "she'd": ["she", "would|had"],
  "it's": ["it", "is|has"],
  "it'll": ["it", "will"],
  "we're": ["we", "are"],
  "we've": ["we", "have"],
  "we'll": ["we", "will"],
  "we'd": ["we", "would|had"],
  "they're": ["they", "are"],
  "they've": ["they", "have"],
  "they'll": ["they", "will"],
  "they'd": ["they", "would|had"],
  "that's": ["that", "is|has"],
  "there's": ["there", "is|has"],
  "here's": ["here", "is"],
  "what's": ["what", "is|has"],
  "let's": ["let", "us"],
  "don't": ["do", "not"],
  "doesn't": ["does", "not"],
  "didn't": ["did", "not"],
  "isn't": ["is", "not"],
  "aren't": ["are", "not"],
  "wasn't": ["was", "not"],
  "weren't": ["were", "not"],
  "haven't": ["have", "not"],
  "hasn't": ["has", "not"],
  "hadn't": ["had", "not"],
  "won't": ["will", "not"],
  "wouldn't": ["would", "not"],
  "can't": ["can", "not"],
  "cannot": ["can", "not"],
  "couldn't": ["could", "not"],
  "shouldn't": ["should", "not"],
  "mustn't": ["must", "not"],
  "could've": ["could", "have"],
  "would've": ["would", "have"],
  "should've": ["should", "have"],
  "might've": ["might", "have"],
  // 会話体の崩れた形
  gonna: ["going", "to"],
  wanna: ["want", "to"],
  gotta: ["got", "to"],
  kinda: ["kind", "of"],
  sorta: ["sort", "of"],
  lemme: ["let", "me"],
  gimme: ["give", "me"],
  dunno: ["do", "not", "know"],
  "y'know": ["you", "know"],
  yknow: ["you", "know"],
  "y'all": ["you", "all"],
  outta: ["out", "of"],
  hafta: ["have", "to"],
  oughta: ["ought", "to"],
  gotcha: ["got", "you"],
  coulda: ["could", "have"],
  woulda: ["would", "have"],
  shoulda: ["should", "have"],
  musta: ["must", "have"],
  cuz: ["because"],
  cos: ["because"],
  ya: ["you"],
  yeah: ["yes"],
  yep: ["yes"],
  nope: ["no"],
  til: ["until"],
  "'til": ["until"],
};

/** アポストロフィ抜きで書かれた短縮形（dont, couldnt など）も引けるようにする */
const CONTRACTIONS_NO_APOSTROPHE: Record<string, string[]> = Object.fromEntries(
  Object.entries(CONTRACTIONS).map(([k, v]) => [k.replace(/'/g, ""), v])
);

/** 入力の書き起こしノイズ。採点対象から外す */
const FILLERS = new Set(["um", "uh", "er", "ah", "hmm", "mm", "eh", "oh"]);

/** 弱く発音され、聞き取れなくても減点を軽くする機能語 */
export const FUNCTION_WORDS = new Set([
  "a", "an", "the", "to", "of", "in", "on", "at", "for", "with", "and", "but",
  "or", "so", "is", "am", "are", "was", "were", "be", "been", "do", "does",
  "did", "have", "has", "had", "will", "would", "can", "could", "should",
  "that", "it", "i", "you", "he", "she", "we", "they", "my", "your", "his",
  "her", "our", "their", "me", "him", "us", "them", "just", "not", "up",
  "out", "over", "about", "there", "here", "as", "if", "then",
]);

export type RawToken = {
  /** 表示用の原形（句読点を除いたもの） */
  surface: string;
  /** 直後に続く句読点（表示の復元用） */
  trailing: string;
};

/** 文を表示用トークンに分解する */
function tokenize(text: string): RawToken[] {
  const out: RawToken[] = [];
  // アポストロフィとハイフンは語の一部として残す
  const re = /[A-Za-z0-9'’\-]+|[^\sA-Za-z0-9'’\-]+/g;
  const parts = text.match(re) ?? [];
  for (const p of parts) {
    if (/[A-Za-z0-9]/.test(p)) {
      out.push({ surface: p, trailing: "" });
    } else if (out.length > 0) {
      out[out.length - 1].trailing += p;
    }
  }
  return out;
}

/** 比較用の基本正規化。アポストロフィの種類差やケース差を吸収する */
function normalize(word: string): string {
  return word
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

type Unit = {
  /** 比較に使う正規化済みの語 */
  word: string;
  /** 同じ音になりうる別解釈（I'd の would / had など）。word を必ず含む */
  alts: string[];
  /** 由来する RawToken の index */
  src: number;
};

/** RawToken 列を、短縮形を展開した比較単位（Unit）列に変換する */
function toUnits(tokens: RawToken[]): Unit[] {
  const units: Unit[] = [];
  tokens.forEach((t, i) => {
    const n = normalize(t.surface);
    if (!n) return;
    if (FILLERS.has(n)) return;
    const expanded = CONTRACTIONS[n] ?? CONTRACTIONS_NO_APOSTROPHE[n];
    if (expanded) {
      for (const w of expanded) {
        const alts = w.split("|");
        units.push({ word: alts[0], alts, src: i });
      }
    } else if (n.includes("-")) {
      // last-minute → last, minute
      for (const w of n.split("-").filter(Boolean)) {
        units.push({ word: w, alts: [w], src: i });
      }
    } else {
      // 所有格の 's は、アポストロフィの有無で差が出ないよう畳む
      // （someone's と someones を同じ語として扱う）
      const w = n.replace(/'s$/, "s");
      units.push({ word: w, alts: [w], src: i });
    }
  });
  return units;
}

/* ------------------------------------------------------------------ *
 * 音の近さの判定
 * ------------------------------------------------------------------ */

/** 綴りの違いを吸収した簡易的な音素キー。pulled と polled が同じキーになる */
function phoneticKey(w: string): string {
  let s = w.replace(/'/g, "");
  s = s
    .replace(/^kn/, "n")
    .replace(/^wr/, "r")
    .replace(/^ps/, "s")
    .replace(/ough/g, "o")
    .replace(/augh/g, "a")
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/qu/g, "kw")
    .replace(/x/g, "ks")
    .replace(/sh/g, "S")
    .replace(/ch/g, "C")
    .replace(/th/g, "T")
    .replace(/gh/g, "")
    .replace(/([a-z])\1+/g, "$1")
    .replace(/e$/, "");
  // 母音は聞き取り違いが起きやすいので一律に潰す
  s = s.replace(/[aeiou]+/g, "a");
  s = s.replace(/c/g, "k").replace(/z/g, "s");
  return s || w;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  const cur = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = cur.slice();
  }
  return prev[n];
}

function ratio(a: string, b: string): number {
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

/** 0（無関係）〜1（一致）。綴りと音素キーの両面から近さを測る */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const spell = ratio(a, b);
  const sound = ratio(phoneticKey(a), phoneticKey(b));
  return Math.max(spell, sound * 0.97);
}

/** 候補どうしを総当たりし、最も近い組み合わせの類似度を採る */
function unitSimilarity(a: Unit, b: Unit): number {
  let best = 0;
  for (const x of a.alts) {
    for (const y of b.alts) {
      const s = similarity(x, y);
      if (s > best) best = s;
      if (best >= 1) return 1;
    }
  }
  return best;
}

const EXACT = 0.999;
const NEAR = 0.62;

/* ------------------------------------------------------------------ *
 * アライメント（Needleman-Wunsch）
 * ------------------------------------------------------------------ */

type Pair = { c: number | null; u: number | null; sim: number };

const GAP = -0.55;

function align(correct: Unit[], user: Unit[]): Pair[] {
  const m = correct.length;
  const n = user.length;
  const score: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) score[i][0] = score[i - 1][0] + GAP;
  for (let j = 1; j <= n; j++) score[0][j] = score[0][j - 1] + GAP;

  const sub = (i: number, j: number) =>
    unitSimilarity(correct[i - 1], user[j - 1]) * 2 - 1;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      score[i][j] = Math.max(
        score[i - 1][j - 1] + sub(i, j),
        score[i - 1][j] + GAP,
        score[i][j - 1] + GAP
      );
    }
  }

  const pairs: Pair[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && score[i][j] === score[i - 1][j - 1] + sub(i, j)) {
      pairs.push({
        c: i - 1,
        u: j - 1,
        sim: unitSimilarity(correct[i - 1], user[j - 1]),
      });
      i--;
      j--;
    } else if (i > 0 && score[i][j] === score[i - 1][j] + GAP) {
      pairs.push({ c: i - 1, u: null, sim: 0 });
      i--;
    } else {
      pairs.push({ c: null, u: j - 1, sim: 0 });
      j--;
    }
  }
  return pairs.reverse();
}

/* ------------------------------------------------------------------ *
 * 採点結果の型
 * ------------------------------------------------------------------ */

export type WordStatus = "ok" | "near" | "miss";

export type WordResult = {
  /** 正解側の表示用の語 */
  word: string;
  trailing: string;
  status: WordStatus;
  /** near / miss のとき、ユーザーがそこに書いた語 */
  heard: string | null;
};

export type GradeResult = {
  score: number;
  transcript: string;
  translation: string;
  words: WordResult[];
  /** 完全に聞き取れていた区間（連続する ok をまとめたもの） */
  caught: string[];
  /** 聞き取れていなかった区間 */
  missed: string[];
  /** 脱落（何も書かれなかった語） */
  dropped: string[];
  /** 誤認識（別の語として聞き取った箇所） */
  confusions: { expected: string; heard: string }[];
  /** ユーザーが余分に書いた語 */
  extras: string[];
  /** 聞き取りのポイント（間違えた箇所に関係するものを優先） */
  points: { phrase: string; note: string }[];
  /** 全語正解かどうか */
  perfect: boolean;
};

/* ------------------------------------------------------------------ *
 * 採点本体
 * ------------------------------------------------------------------ */

export function grade(question: Answerable, answer: string): GradeResult {
  const cTokens = tokenize(question.transcript);
  const uTokens = tokenize(answer);
  const cUnits = toUnits(cTokens);
  const uUnits = toUnits(uTokens);

  const pairs = align(cUnits, uUnits);

  // Unit 単位の判定を集める
  type UnitVerdict = { status: WordStatus; heard: string | null };
  const unitVerdicts: UnitVerdict[] = cUnits.map(() => ({
    status: "miss",
    heard: null,
  }));
  const extras: string[] = [];

  // 余分に書かれた語は、隣接する正解語の判定へ反映する
  // （"after work" を "after the work" と書いた場合、after work を △ として扱う）
  let pendingInsertions: string[] = [];
  let lastMatchedC: number | null = null;

  const attach = (target: number | null) => {
    if (pendingInsertions.length === 0) return;
    if (target !== null) {
      const v = unitVerdicts[target];
      const heard = [v.heard, ...pendingInsertions].filter(Boolean).join(" ");
      unitVerdicts[target] = {
        status: v.status === "ok" ? "near" : v.status,
        heard: heard || null,
      };
    }
    pendingInsertions = [];
  };

  for (const p of pairs) {
    if (p.c !== null && p.u !== null) {
      const heard = uUnits[p.u].word;
      unitVerdicts[p.c] =
        p.sim >= EXACT
          ? { status: "ok", heard: null }
          : p.sim >= NEAR
            ? { status: "near", heard }
            : { status: "miss", heard };
      if (p.sim < NEAR) extras.push(heard);
      attach(p.c);
      lastMatchedC = p.c;
    } else if (p.c !== null) {
      unitVerdicts[p.c] = { status: "miss", heard: null };
      attach(p.c);
      lastMatchedC = p.c;
    } else if (p.u !== null) {
      const w = uUnits[p.u].word;
      extras.push(w);
      pendingInsertions.push(w);
    }
  }
  attach(lastMatchedC);

  // Unit の判定を、表示用の RawToken 単位へ畳み込む
  const bySrc = new Map<number, UnitVerdict[]>();
  cUnits.forEach((u, idx) => {
    const list = bySrc.get(u.src) ?? [];
    list.push(unitVerdicts[idx]);
    bySrc.set(u.src, list);
  });

  const words: WordResult[] = cTokens.map((t, i) => {
    const verdicts = bySrc.get(i);
    if (!verdicts || verdicts.length === 0) {
      return { word: t.surface, trailing: t.trailing, status: "ok", heard: null };
    }
    const okCount = verdicts.filter((v) => v.status === "ok").length;
    const missCount = verdicts.filter((v) => v.status === "miss").length;
    const heard =
      verdicts.map((v) => v.heard).filter((h): h is string => !!h).join(" ") ||
      null;
    let status: WordStatus;
    if (okCount === verdicts.length) status = "ok";
    else if (missCount === verdicts.length && !heard) status = "miss";
    else if (okCount === 0 && missCount === verdicts.length) status = "miss";
    else status = "near";
    return { word: t.surface, trailing: t.trailing, status, heard };
  });

  // スコア：内容語を重く、機能語を軽く重み付けする
  let earned = 0;
  let total = 0;
  cUnits.forEach((u, idx) => {
    const w = FUNCTION_WORDS.has(u.word) ? 1 : 1.8;
    total += w;
    const v = unitVerdicts[idx];
    if (v.status === "ok") earned += w;
    else if (v.status === "near") earned += w * 0.5;
  });
  const score = total === 0 ? 0 : Math.round((earned / total) * 100);

  // 連続する区間にまとめる
  const caught: string[] = [];
  const missed: string[] = [];
  let run: string[] = [];
  let runOk: boolean | null = null;
  const flush = () => {
    if (run.length > 0 && runOk !== null) {
      (runOk ? caught : missed).push(run.join(" "));
    }
    run = [];
  };
  for (const w of words) {
    const isOk = w.status === "ok";
    if (runOk === null || isOk === runOk) {
      run.push(w.word);
      runOk = isOk;
    } else {
      flush();
      run = [w.word];
      runOk = isOk;
    }
  }
  flush();

  const dropped = words
    .filter((w) => w.status === "miss" && !w.heard)
    .map((w) => w.word);
  const confusions = words
    .filter((w) => w.heard && w.status !== "ok")
    .map((w) => ({ expected: w.word, heard: w.heard as string }));

  // 間違えた箇所との関連が強い順にポイントを並べ、上位だけを出す。
  // 全部出すと結果画面が解説の壁になり、どこを直すべきかが読み取れなくなる。
  const wrongWords = new Set(
    words.filter((w) => w.status !== "ok").map((w) => normalize(w.word))
  );
  const scored = question.hints
    .map((h) => ({
      hint: h,
      matches: h.phrase
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => wrongWords.has(normalize(w))).length,
    }))
    .filter((x) => x.matches > 0)
    .sort((a, b) => b.matches - a.matches);

  const MAX_POINTS = 4;
  const points =
    scored.length > 0
      ? scored.slice(0, MAX_POINTS).map((x) => x.hint)
      : question.hints.slice(0, 2);

  return {
    score,
    transcript: question.transcript,
    translation: question.translation,
    words,
    caught: caught.filter((s) => s.trim().length > 0),
    missed: missed.filter((s) => s.trim().length > 0),
    dropped,
    confusions,
    extras: Array.from(new Set(extras)),
    points,
    perfect: words.every((w) => w.status === "ok"),
  };
}
