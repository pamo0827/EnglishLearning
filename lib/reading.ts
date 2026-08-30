/**
 * 長文読解の採点と速読ランクの判定。ブラウザでも動く純粋な関数。
 *
 * ランクは「1問あたりにかけた秒数」で決める。基準は TOEIC Part 7 の
 * 54問／54分＝60秒。制限時間は設けず、実測に対して段位だけを返す。
 */

export type SpeedRank = {
  rank: string;
  /** この秒数以下ならこのランク。null は上限なし */
  maxSec: number | null;
  label: string;
};

export type ReadingAnswerKey = {
  answer: 0 | 1 | 2 | 3;
  type: string;
  evidence: string;
  why: string;
  choiceNotes: [string, string, string, string];
};

export type ReadingQuestionResult = ReadingAnswerKey & {
  index: number;
  chosen: number | null;
  correct: boolean;
};

export type ReadingResult = {
  correct: number;
  total: number;
  /** 正答率（0〜100） */
  score: number;
  elapsedSec: number;
  secPerQuestion: number;
  rank: SpeedRank;
  /** このセットの目標秒数に対して何秒速い／遅いか。負なら速い */
  vsTargetSec: number;
  questions: ReadingQuestionResult[];
};

export function rankFor(secPerQuestion: number, ranks: SpeedRank[]): SpeedRank {
  for (const r of ranks) {
    if (r.maxSec === null || secPerQuestion <= r.maxSec) return r;
  }
  return ranks[ranks.length - 1];
}

export function gradeReading(
  keys: ReadingAnswerKey[],
  chosen: (number | null)[],
  elapsedSec: number,
  targetSecPerQuestion: number,
  ranks: SpeedRank[]
): ReadingResult {
  const questions: ReadingQuestionResult[] = keys.map((k, i) => ({
    ...k,
    index: i,
    chosen: chosen[i] ?? null,
    correct: chosen[i] === k.answer,
  }));

  const correct = questions.filter((q) => q.correct).length;
  const total = keys.length;
  const secPerQuestion = total === 0 ? 0 : elapsedSec / total;

  return {
    correct,
    total,
    score: total === 0 ? 0 : Math.round((correct / total) * 100),
    elapsedSec,
    secPerQuestion,
    rank: rankFor(secPerQuestion, ranks),
    vsTargetSec: secPerQuestion - targetSecPerQuestion,
    questions,
  };
}

/** 秒数を 3:05 の形にする */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
