/**
 * 学習の進捗。ブラウザの localStorage に置く。
 *
 * 端末ごとの控えであって、同期はしない。読み書きは必ず try/catch で包む。
 * プライベートウィンドウやサイトデータの制限で、アクセスそのものが
 * 例外を投げる場合があるため。
 */

const KEY = "dictation-progress-v1";

/** 問題 id → 直近のスコア（0〜100） */
export type Progress = Record<number, number>;

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Progress = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const id = Number(k);
      if (Number.isFinite(id) && typeof v === "number") out[id] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    // 保存できなくても学習そのものは続けられる
  }
}

export function clearChapterProgress(progress: Progress, ids: number[]): Progress {
  const next = { ...progress };
  for (const id of ids) delete next[id];
  return next;
}
