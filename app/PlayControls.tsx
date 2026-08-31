"use client";

/**
 * 再生の操作。ディクテーションとリスニングの両方で使う。
 * 同じ操作が画面ごとに違う形をしていると、どこで何ができるのかを覚え直すことになる。
 */

/** 再生速度。音の高さは変えずに速さだけを変える（preservesPitch の既定は true） */
export const RATES = [
  { value: 0.75, label: "×0.75" },
  { value: 0.9, label: "×0.9" },
  { value: 1, label: "等速" },
];

export function PlayControls({
  playing,
  plays,
  rate,
  onRate,
  onPlay,
  disabled,
  showCount,
}: {
  playing: boolean;
  plays: number;
  rate: number;
  onRate: (v: number) => void;
  onPlay: () => void;
  disabled?: boolean;
  showCount?: boolean;
}) {
  return (
    <>
      <div className="play-row">
        <button className="btn-primary btn-play" onClick={onPlay} disabled={disabled}>
          {playing ? (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5Z" />
            </svg>
          )}
          {playing ? "再生中" : plays === 0 ? "再生する" : "もう一回再生する"}
        </button>
      </div>

      {showCount && <div className="label">再生回数 {plays}</div>}

      {/* 再生ボタンとは別の行に置く。どちらも inline-flex なので、
          包まないと横に並んでしまう。 */}
      <div>
        <div className="speed" role="group" aria-label="再生速度">
          {RATES.map((r) => (
            <button
              key={r.value}
              className={`speed-btn${r.value === rate ? " is-active" : ""}`}
              onClick={() => onRate(r.value)}
              aria-pressed={r.value === rate}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
