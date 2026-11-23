"use client";

/**
 * 教材音声。原稿を目で追いながら、同じ音源を何度も聞くための画面。
 *
 * ほかのモードと違って採点が無く、原稿は最初から見せる。その代わり操作を増やしてある。
 * 再生の操作は画面の下端に固定し、原稿をどこまで読み進めても指が届くようにする。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  loadAudioUrl,
  loadManifest,
  type Manifest,
  type Track,
} from "@/lib/lessons";

const SKIP = 10;
const PREFS_KEY = "lessons-prefs-v1";

type Prefs = {
  lesson: number;
  track: string;
  showJa: boolean;
  /** 選んだレッスンをくり返すか。picked を番号順に聞いたら頭に戻る */
  repeat: boolean;
  picked: number[];
};

const DEFAULT_PREFS: Prefs = {
  lesson: 1,
  track: "",
  showJa: false,
  repeat: false,
  picked: [],
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    const prefs = { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) };
    // 選んだレッスンが無いのにくり返しだけ入っている状態は作らない
    if (!Array.isArray(prefs.picked)) prefs.picked = [];
    if (prefs.picked.length === 0) prefs.repeat = false;
    return prefs;
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // 保存できなくても再生はできる
  }
}

/** 音声ごとの、最後まで聞いた回数。この端末のブラウザに保存する */
const PLAYS_KEY = "lessons-plays-v1";
type Plays = Record<string, number>;
/** 早送りで終わりまで飛ばしただけのものは数えない。実際に鳴らした時間がこの割合を超えたら 1 回 */
const COUNT_RATIO = 0.6;

function loadPlays(): Plays {
  try {
    const raw = localStorage.getItem(PLAYS_KEY);
    return raw ? (JSON.parse(raw) as Plays) : {};
  } catch {
    return {};
  }
}

function savePlays(plays: Plays): void {
  try {
    localStorage.setItem(PLAYS_KEY, JSON.stringify(plays));
  } catch {
    // 保存できなくても再生はできる
  }
}

function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** いま鳴っている文の番号。最初の文が始まる前は 0 として扱う */
function sentenceAt(track: Track, time: number): number {
  let idx = 0;
  for (let i = 0; i < track.sentences.length; i++) {
    if (track.sentences[i].t <= time + 0.05) idx = i;
    else break;
  }
  return idx;
}

export function Lessons({ lessonKey }: { lessonKey: CryptoKey }) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [src, setSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [plays, setPlays] = useState<Plays>({});

  /** いまの音声を実際に鳴らした秒数と、直前に見た再生位置 */
  const listened = useRef(0);
  const lastTime = useRef(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** 復号済みの音声。同じ音源を聞き直すたびに取り直さない */
  const urlCache = useRef(new Map<string, Promise<string>>());
  /** 音声を差し替えたあと、読み込めたらすぐ鳴らすかどうか */
  const autoplay = useRef(false);
  const lineRefs = useRef<(HTMLLIElement | null)[]>([]);

  const update = useCallback((patch: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    setPrefs(loadPrefs());
    setPlays(loadPlays());
    loadManifest(lessonKey)
      .then((m) =>
        // 音読用の音声は Part 1 と同じ文なので、一覧には出さない
        setManifest({
          ...m,
          lessons: m.lessons.map((l) => ({
            ...l,
            tracks: l.tracks.filter((t) => !t.id.endsWith("-r")),
          })),
        })
      )
      .catch(() => setError("教材のデータを読み込めませんでした。"));
  }, [lessonKey]);

  useEffect(() => {
    const cache = urlCache.current;
    return () => {
      for (const p of cache.values()) void p.then(URL.revokeObjectURL, () => {});
    };
  }, []);

  /** レッスンをまたいで順に並べた全音声。「次へ続けて再生する」で使う */
  const playlist = useMemo(
    () =>
      manifest?.lessons.flatMap((l) =>
        l.tracks.map((t) => ({ lesson: l.no, track: t }))
      ) ?? [],
    [manifest]
  );

  const lesson =
    manifest?.lessons.find((l) => l.no === prefs.lesson) ?? manifest?.lessons[0];
  const track = lesson?.tracks.find((t) => t.id === prefs.track) ?? lesson?.tracks[0];
  const trackId = track?.id;

  const getUrl = useCallback(
    (id: string) => {
      const cache = urlCache.current;
      let p = cache.get(id);
      if (!p) {
        p = loadAudioUrl(lessonKey, id);
        cache.set(id, p);
        p.catch(() => cache.delete(id));
      }
      return p;
    },
    [lessonKey]
  );

  // 音声を選び直したら復号して差し替える。次の音声も先に用意しておく。
  useEffect(() => {
    if (!trackId) return;
    let stale = false;
    setSrc(null);
    listened.current = 0;
    lastTime.current = 0;
    setTime(0);
    setDuration(0);
    setError(null);
    getUrl(trackId)
      .then((url) => {
        if (!stale) setSrc(url);
      })
      .catch(() => {
        if (!stale) setError("音声を読み込めませんでした。");
      });
    const at = playlist.findIndex((p) => p.track.id === trackId);
    const upcoming = playlist[at + 1];
    if (upcoming) void getUrl(upcoming.track.id).catch(() => {});
    return () => {
      stale = true;
    };
  }, [trackId, getUrl, playlist]);

  const active = track ? sentenceAt(track, time) : 0;

  /* ---------------- 操作 ---------------- */

  const seek = useCallback((to: number) => {
    const el = audioRef.current;
    if (!el) return;
    const max = Number.isFinite(el.duration) ? el.duration : to;
    el.currentTime = Math.min(Math.max(0, to), Math.max(0, max - 0.05));
    setTime(el.currentTime);
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el || !src) return;
    if (el.paused) {
      if (el.ended) el.currentTime = 0;
      void el.play().catch(() => setError("音声を再生できませんでした。"));
    } else {
      el.pause();
    }
  }, [src]);

  const skip = useCallback(
    (delta: number) => {
      const el = audioRef.current;
      if (el) seek(el.currentTime + delta);
    },
    [seek]
  );

  /** 文の頭へ飛ぶ。止まっていたら鳴らし始める（押したら聞こえる、を保つ） */
  const playSentence = useCallback(
    (i: number) => {
      const el = audioRef.current;
      if (!el || !track) return;
      const s = track.sentences[Math.min(Math.max(0, i), track.sentences.length - 1)];
      seek(s.t);
      if (el.paused) {
        void el.play().catch(() => setError("音声を再生できませんでした。"));
      }
    },
    [track, seek]
  );

  /** 前の文へ。文の途中（頭から1.5秒以降）なら、まずその文の頭に戻る */
  const prevSentence = useCallback(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    const i = sentenceAt(track, el.currentTime);
    const intoSentence = el.currentTime - track.sentences[i].t;
    playSentence(intoSentence > 1.5 ? i : i - 1);
  }, [track, playSentence]);

  const nextSentence = useCallback(() => {
    const el = audioRef.current;
    if (!el || !track) return;
    playSentence(sentenceAt(track, el.currentTime) + 1);
  }, [track, playSentence]);

  const select = useCallback(
    (lessonNo: number, id: string, andPlay: boolean) => {
      autoplay.current = andPlay;
      update({ lesson: lessonNo, track: id });
    },
    [update]
  );

  const selectLesson = (no: number) => {
    const l = manifest?.lessons.find((x) => x.no === no);
    if (!l) return;
    // 同じ Part を選んだままレッスンだけ替える。無ければ Part 1
    const same = l.tracks.find((t) => t.label === track?.label);
    select(no, (same ?? l.tracks[0]).id, playing);
  };

  /** くり返しの入り切り。入れるときは、いま開いているレッスンを必ず含める */
  const toggleRepeat = () => {
    if (prefs.repeat || !lesson) {
      update({ repeat: false });
      return;
    }
    const picked = prefs.picked.includes(lesson.no)
      ? prefs.picked
      : [...prefs.picked, lesson.no].sort((a, b) => a - b);
    update({ repeat: true, picked });
  };

  /** くり返しの間は、升目を押すとそのレッスンを足したり外したりする */
  const togglePicked = (no: number) => {
    if (!lesson) return;
    if (!prefs.picked.includes(no)) {
      update({ picked: [...prefs.picked, no].sort((a, b) => a - b) });
      return;
    }
    const rest = prefs.picked.filter((n) => n !== no);
    if (rest.length === 0) return; // 最後の1つは外せない
    update({ picked: rest });
    if (no === lesson.no) {
      // 開いているレッスンを外したら、残りのうち次のレッスンへ移る
      const nextNo = rest.find((n) => n > no) ?? rest[0];
      const l = manifest?.lessons.find((x) => x.no === nextNo);
      if (l) select(l.no, l.tracks[0].id, playing);
    }
  };

  /* ---------------- 再生の進行 ---------------- */

  // timeupdate は 1 秒に 4 回ほどしか来ない。原稿の追従が遅れて見えるので、
  // 再生中は描画ごとに時刻を見る。
  useEffect(() => {
    if (!playing || !track) return;
    let frame = 0;
    const tick = () => {
      const el = audioRef.current;
      if (el) {
        const now = el.currentTime;
        setTime(now);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, track]);

  const onEnded = () => {
    const el = audioRef.current;
    if (!el || !track) return;
    if (listened.current >= (el.duration || track.duration) * COUNT_RATIO) {
      // 保存済みの値に足す。別のタブで聞いた分を消さない
      const next = loadPlays();
      next[track.id] = (next[track.id] ?? 0) + 1;
      savePlays(next);
      setPlays(next);
    }
    listened.current = 0;
    // 終わったら次の音声へ続けて再生する。最後まで行ったら止まる。
    // くり返しのときは選んだレッスンだけを回り、最後まで行ったら頭に戻る
    const list = prefs.repeat
      ? playlist.filter((p) => prefs.picked.includes(p.lesson))
      : playlist;
    const at = list.findIndex((p) => p.track.id === track.id);
    const upcoming = list[at + 1] ?? (prefs.repeat ? list[0] : undefined);
    if (upcoming && upcoming.track.id === track.id) {
      // 選んだ中に音声が1つしか無い。同じ音声なので差し替えは起きない。頭から鳴らし直す
      el.currentTime = 0;
      void el.play().catch(() => setPlaying(false));
      return;
    }
    if (upcoming) {
      select(upcoming.lesson, upcoming.track.id, true);
      return;
    }
    setPlaying(false);
  };

  // 鳴っている文が画面の外へ出たら、見える位置まで原稿を送る
  useEffect(() => {
    if (!playing) return;
    const el = lineRefs.current[active];
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const bottomLimit = window.innerHeight - 150; // 下端の操作パネルに隠れる分
    if (rect.top < 16 || rect.bottom > bottomLimit) {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [active, playing, trackId]);

  // キーボード。原稿を見たまま手元だけで操作できるようにする
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === " " && tag === "BUTTON") return; // ボタン自身の動作に任せる
      switch (e.key) {
        case " ":
          toggle();
          break;
        case "ArrowLeft":
          skip(-SKIP);
          break;
        case "ArrowRight":
          skip(SKIP);
          break;
        case "ArrowUp":
          prevSentence();
          break;
        case "ArrowDown":
          nextSentence();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle, skip, prevSentence, nextSentence]);

  // ロック画面やイヤホンのボタンからも同じ操作ができるようにする
  useEffect(() => {
    if (!("mediaSession" in navigator) || !lesson || !track) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: `Lesson ${lesson.no} ${track.label}`,
      album: "教材音声",
    });
    const set = (action: MediaSessionAction, handler: (() => void) | null) => {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // 対応していない操作は無視する
      }
    };
    set("play", toggle);
    set("pause", toggle);
    set("seekbackward", () => skip(-SKIP));
    set("seekforward", () => skip(SKIP));
    set("previoustrack", prevSentence);
    set("nexttrack", nextSentence);
    return () => {
      for (const a of [
        "play",
        "pause",
        "seekbackward",
        "seekforward",
        "previoustrack",
        "nexttrack",
      ] as MediaSessionAction[]) {
        set(a, null);
      }
    };
  }, [lesson, track, toggle, skip, prevSentence, nextSentence]);

  /* ---------------- 画面 ---------------- */

  if (error && !manifest) return <p className="error">{error}</p>;
  if (!manifest || !lesson || !track) return <p className="muted">読み込み中…</p>;

  const total = duration || track.duration;
  /** 番号つきの短文か。そうなら番号を出し、番号の変わり目で行間を空ける */
  const numbered = track.sentences.some((s) => s.no !== undefined);

  return (
    <div className="stack-lg lessons">
      <audio
        ref={audioRef}
        src={src ?? undefined}
        preload="auto"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          if (autoplay.current) {
            autoplay.current = false;
            void e.currentTarget.play().catch(() => setPlaying(false));
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={(e) => {
          // 音声の終わりでも pause が来る。続けて再生するときに表示を揺らさない
          if (!e.currentTarget.ended) setPlaying(false);
        }}
        onTimeUpdate={(e) => {
          const now = e.currentTarget.currentTime;
          // 聞いた時間を足す。画面を消していても届くので、描画ごとの処理とは別に数える。
          // 飛ばした分（10秒送りなど）は差が大きいので入らない
          const d = now - lastTime.current;
          if (!e.currentTarget.paused && d > 0 && d < 3) listened.current += d;
          lastTime.current = now;
          if (e.currentTarget.paused) setTime(now);
        }}
        onEnded={onEnded}
        onError={() => {
          if (src) setError("音声を読み込めませんでした。");
        }}
      />

      <section className="stack-sm">
        <div className="lesson-head">
          <div className="label">レッスン</div>
          <button
            className={`repeat-btn${prefs.repeat ? " is-active" : ""}`}
            onClick={toggleRepeat}
            aria-pressed={prefs.repeat}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 2l4 4-4 4" />
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
              <path d="M7 22l-4-4 4-4" />
              <path d="M21 13v1a4 4 0 0 1-4 4H3" />
            </svg>
            くり返し
          </button>
        </div>
        <div className="lesson-grid" role="group" aria-label="レッスン">
          {manifest.lessons.map((l) => (
            <button
              key={l.no}
              className={`lesson-cell${l.no === lesson.no ? " is-active" : ""}${
                prefs.repeat && prefs.picked.includes(l.no) ? " is-picked" : ""
              }`}
              onClick={() => (prefs.repeat ? togglePicked(l.no) : selectLesson(l.no))}
              aria-pressed={prefs.repeat ? prefs.picked.includes(l.no) : l.no === lesson.no}
              aria-label={`レッスン${l.no}`}
            >
              {l.no}
            </button>
          ))}
        </div>
      </section>

      <section className="stack-sm">
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="question-no">Lesson {lesson.no}</span>
          <span className="lesson-title">{lesson.title}</span>
        </div>
        {/* いま選んでいる音声を最後まで聞いた回数 */}
        <div className="plays">
          聞いた回数 <strong>{plays[track.id] ?? 0}</strong>回
        </div>
        <div className="track-row">
          {/* 音声が1つだけのレッスンでは選ぶものが無いので出さない */}
          {lesson.tracks.length > 1 && (
            <div className="speed" role="group" aria-label="音声">
              {lesson.tracks.map((t) => (
                <button
                  key={t.id}
                  className={`track-btn${t.id === track.id ? " is-active" : ""}`}
                  onClick={() => select(lesson.no, t.id, playing)}
                  aria-pressed={t.id === track.id}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
          {/* 英文はいつも出す。切り替えるのは日本語訳だけ。
              押すと何が起きるかをラベルに書く */}
          <button
            className="ja-toggle"
            onClick={() => update({ showJa: !prefs.showJa })}
            aria-pressed={prefs.showJa}
          >
            {prefs.showJa ? "日本語訳を隠す" : "日本語訳を出す"}
          </button>
        </div>
      </section>

      <ol className="lines">
        {track.sentences.map((s, i) => (
          <li
            key={`${track.id}-${i}`}
            className={numbered && s.no !== undefined && i > 0 ? "is-item-start" : undefined}
            ref={(el) => {
              lineRefs.current[i] = el;
            }}
          >
            <button
              className={`line${i === active ? " is-active" : ""}`}
              onClick={() => playSentence(i)}
              aria-current={i === active ? "true" : undefined}
            >
              <span className="line-no">{numbered ? (s.no ?? "") : i + 1}</span>
              <span className="line-body">
                <span className="line-en">{s.en}</span>
                {prefs.showJa && <span className="line-ja">{s.ja}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {error && <p className="error">{error}</p>}

      {/* 再生の操作。下端に固定する */}
      <div className="player" role="region" aria-label="再生の操作">
        <div className="player-inner">
          <div className="player-seek">
            <span className="player-time">{clock(time)}</span>
            <input
              type="range"
              min={0}
              max={total || 1}
              step={0.1}
              value={Math.min(time, total || 1)}
              onChange={(e) => {
                seek(Number(e.target.value));
              }}
              aria-label="再生位置"
              style={{
                ["--fill" as string]: `${total ? (time / total) * 100 : 0}%`,
              }}
            />
            <span className="player-time">{clock(total)}</span>
          </div>

          <div className="player-main">
            <button
              className="player-btn"
              onClick={() => {
                prevSentence();
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="5" y="5" width="2.5" height="14" rx="1" />
                <path d="M19 6.2v11.6a.8.8 0 0 1-1.2.7l-9.3-5.8a.8.8 0 0 1 0-1.4l9.3-5.8a.8.8 0 0 1 1.2.7Z" />
              </svg>
              <span>前の文</span>
            </button>
            <button
              className="player-btn"
              onClick={() => {
                skip(-SKIP);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M4 5v5h5" />
                <path d="M4.6 10A8 8 0 1 1 4 13" />
              </svg>
              <span>10秒戻る</span>
            </button>
            <button
              className="player-play"
              onClick={toggle}
              disabled={!src}
              aria-label={playing ? "一時停止する" : "再生する"}
            >
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
              <span>{!src ? "準備中" : playing ? "止める" : "再生する"}</span>
            </button>
            <button
              className="player-btn"
              onClick={() => {
                skip(SKIP);
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 5v5h-5" />
                <path d="M19.4 10A8 8 0 1 0 20 13" />
              </svg>
              <span>10秒進む</span>
            </button>
            <button
              className="player-btn"
              onClick={() => {
                nextSentence();
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="16.5" y="5" width="2.5" height="14" rx="1" />
                <path d="M5 6.2v11.6a.8.8 0 0 0 1.2.7l9.3-5.8a.8.8 0 0 0 0-1.4L6.2 5.5a.8.8 0 0 0-1.2.7Z" />
              </svg>
              <span>次の文</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
