/**
 * 学習の進捗。ブラウザの localStorage に置く。
 *
 * 端末ごとの控えであって、同期はしない。読み書きは必ず try/catch で包む。
 * プライベートウィンドウやサイトデータの制限で、アクセスそのものが
 * 例外を投げる場合があるため。
 */

/** 保存先のキー。モードごとに分ける */
export const DICTATION_KEY = "dictation-progress-v1";
export const READING_KEY = "reading-progress-v1";

/** 問題（またはセット）id → 直近のスコア（0〜100） */
export type Progress = Record<number, number>;

export function loadProgress(key: string): Progress {
  try {
    const raw = localStorage.getItem(key);
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

export function saveProgress(key: string, progress: Progress): void {
  try {
    localStorage.setItem(key, JSON.stringify(progress));
  } catch {
    // 保存できなくても学習そのものは続けられる
  }
}

export function clearChapterProgress(progress: Progress, ids: number[]): Progress {
  const next = { ...progress };
  for (const id of ids) delete next[id];
  return next;
}
