"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { unseal, type Sealed } from "@/lib/crypto";
import {
  loadProgress,
  saveProgress,
  LISTENING_KEY,
  type Progress,
} from "@/lib/progress";
import { PlayControls } from "./PlayControls";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (p: string) => `${BASE}/${p}`;

type ListeningChapterMeta = {
  id: number;
  title: string;
  setCount: number;
  questionCount: number;
  ready: boolean;
};

type ListeningSetMeta = {
  id: number;
  chapter: number;
  part: 3 | 4;
  scene: string;
  title: string;
  speakerCount: number;
  questions: { stem: string; choices: [string, string, string, string] }[];
  audio: boolean;
};

type ListeningData = {
  chapters: ListeningChapterMeta[];
  sets: ListeningSetMeta[];
};

/** 採点ボタンを押して初めて手に入る、台本と解説 */
type ListeningKey = {
  lines: { speaker: string; text: string; ja: string }[];
  questions: {
    answer: number;
    type: string;
    evidence: string;
    why: string;
    choiceNotes: [string, string, string, string];
  }[];
};

type ListeningResult = {
  correct: number;
  total: number;
  score: number;
  key: ListeningKey;
};

const PART_LABEL: Record<3 | 4, string> = { 3: "会話", 4: "説明文" };

export function Listening() {
  const [data, setData] = useState<ListeningData | null>(null);
  const [setId, setSetId] = useState<number | null>(null);
  const [chosen, setChosen] = useState<(number | null)[]>([]);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [result, setResult] = useState<ListeningResult | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setProgress(loadProgress(LISTENING_KEY));
  }, []);

  useEffect(() => {
    fetch(asset("data/listening.json"))
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("問題データを読み込めませんでした。"));
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const current = data?.sets.find((s) => s.id === setId) ?? null;

  const start = (s: ListeningSetMeta) => {
    setSetId(s.id);
    setChosen(new Array(s.questions.length).fill(null));
    setPlays(0);
    setResult(null);
    setError(null);
    window.scrollTo(0, 0);
  };

  const play = () => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = 0;
    el.playbackRate = rate;
    setError(null);
    void el
      .play()
      .then(() => {
        setPlaying(true);
        setPlays((n) => n + 1);
      })
      .catch(() => setError("音声を再生できませんでした。"));
  };

  const submit = useCallback(async () => {
    if (!current) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(asset(`data/listening-enc/${current.id}.json`));
      if (!res.ok) throw new Error("台本と解説を取得できませんでした");
      const key = await unseal<ListeningKey>(
        `listening:${current.id}`,
        (await res.json()) as Sealed
      );
      const correct = key.questions.filter(
        (q, i) => chosen[i] === q.answer
      ).length;
      const total = key.questions.length;
      const score = total === 0 ? 0 : Math.round((correct / total) * 100);
      setResult({ correct, total, score, key });
      setProgress((prev) => {
        const next = { ...prev, [current.id]: score };
        saveProgress(LISTENING_KEY, next);
        return next;
      });
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "採点に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [current, chosen]);

  const back = () => {
    setSetId(null);
    setResult(null);
  };

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">読み込み中…</p>;

  return (
    <div className="stack-xl">
      {current && (
        <audio
          ref={audioRef}
          src={asset(`listening/${current.id}.mp3`)}
          onEnded={() => setPlaying(false)}
          onError={() => setError("音声を読み込めませんでした。")}
          preload="auto"
        />
      )}

      {!current ? (
        <SetList data={data} progress={progress} onStart={start} />
      ) : result === null ? (
        <SolveView
          set={current}
          chosen={chosen}
          onChoose={(qi, ci) =>
            setChosen((prev) => prev.map((v, i) => (i === qi ? ci : v)))
          }
          plays={plays}
          playing={playing}
          rate={rate}
          onRate={setRate}
          onPlay={play}
          busy={busy}
          onSubmit={submit}
          onBack={back}
        />
      ) : (
        <ResultView
          set={current}
          result={result}
          chosen={chosen}
          plays={plays}
          playing={playing}
          rate={rate}
          onRate={setRate}
          onPlay={play}
          onRetry={() => start(current)}
          onBack={back}
        />
      )}

      {error && <p className="error">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * セットの一覧。ディクテーション・長文読解と同じ骨格
 * ------------------------------------------------------------------ */

function SetList({
  data,
  progress,
  onStart,
}: {
  data: ListeningData;
  progress: Progress;
  onStart: (s: ListeningSetMeta) => void;
}) {
  return (
    <div className="stack-md">
      {data.chapters.map((c) => {
        const sets = data.sets.filter((s) => s.chapter === c.id);
        const firstUnanswered = sets.findIndex(
          (s) => progress[s.id] === undefined
        );
        const resumeAt = firstUnanswered === -1 ? 0 : firstUnanswered;

        return (
          <section key={c.id} className="card stack-md">
            <div>
              <div style={{ fontWeight: 600, fontSize: 17 }}>{c.title}</div>
              <div className="label" style={{ marginTop: 4 }}>
                全{c.setCount}セット {c.questionCount}問
              </div>
            </div>

            {c.ready ? (
              <>
                <div className="actions">
                  <button
                    className="btn-primary"
                    onClick={() => onStart(sets[resumeAt])}
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5Z" />
                    </svg>
                    {resumeAt > 0 ? `第${resumeAt + 1}セットから続ける` : "始める"}
                  </button>
                </div>

                <div className="q-grid">
                  {sets.map((s, i) => {
                    const score = progress[s.id];
                    const state =
                      score === undefined
                        ? ""
                        : score >= 85
                          ? " is-good"
                          : score >= 55
                            ? " is-mid"
                            : " is-low";
                    return (
                      <button
                        key={s.id}
                        className={`q-cell${state}`}
                        onClick={() => onStart(s)}
                        title={`第${i + 1}セット ${PART_LABEL[s.part]}・${s.scene}・${s.questions.length}問${
                          score === undefined ? "（未挑戦）" : `（正答率${score}%）`
                        }`}
                      >
                        <span className="q-cell-no">{i + 1}</span>
                        <span className="q-cell-score">
                          {score === undefined ? "—" : score}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="chip" style={{ color: "var(--color-on-surface-muted)" }}>
                準備中（音声を生成すると選べるようになります）
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 解答画面。台本は出さない
 * ------------------------------------------------------------------ */

function SolveView({
  set,
  chosen,
  onChoose,
  plays,
  playing,
  rate,
  onRate,
  onPlay,
  busy,
  onSubmit,
  onBack,
}: {
  set: ListeningSetMeta;
  chosen: (number | null)[];
  onChoose: (qi: number, ci: number) => void;
  plays: number;
  playing: boolean;
  rate: number;
  onRate: (v: number) => void;
  onPlay: () => void;
  busy: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="stack-xl">
      <div className="row-between">
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="question-no">{set.title}</span>
          <span className="label">
            {PART_LABEL[set.part]} ・ 話者{set.speakerCount}人 ・{" "}
            {set.questions.length}問
          </span>
        </div>
        <button className="btn-secondary" onClick={onBack}>
          やめる
        </button>
      </div>

      <section className="stack-md">
        <PlayControls
          playing={playing}
          plays={plays}
          rate={rate}
          onRate={onRate}
          onPlay={onPlay}
          showCount
        />
      </section>

      {/* 設問と選択肢は本番でも印刷されている。聞きながら読む */}
      <section className="stack-xl">
        {set.questions.map((q, qi) => (
          <div key={qi} className="stack-sm">
            <div style={{ fontWeight: 600 }}>
              {qi + 1}. {q.stem}
            </div>
            {q.choices.map((c, ci) => (
              <label
                key={ci}
                className={`choice${chosen[qi] === ci ? " is-chosen" : ""}`}
              >
                <input
                  type="radio"
                  name={`lq${qi}`}
                  checked={chosen[qi] === ci}
                  onChange={() => onChoose(qi, ci)}
                />
                <span className="choice-letter">{"ABCD"[ci]}</span>
                <span>{c}</span>
              </label>
            ))}
          </div>
        ))}
      </section>

      <div className="actions">
        <button className="btn-primary" onClick={onSubmit} disabled={busy}>
          {busy ? "採点中…" : "採点する"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 結果画面。ここではじめて台本を出す
 * ------------------------------------------------------------------ */

function ResultView({
  set,
  result,
  chosen,
  plays,
  playing,
  rate,
  onRate,
  onPlay,
  onRetry,
  onBack,
}: {
  set: ListeningSetMeta;
  result: ListeningResult;
  chosen: (number | null)[];
  plays: number;
  playing: boolean;
  rate: number;
  onRate: (v: number) => void;
  onPlay: () => void;
  onRetry: () => void;
  onBack: () => void;
}) {
  const scoreColor =
    result.score >= 85
      ? "var(--color-success)"
      : result.score >= 55
        ? "var(--color-warning)"
        : "var(--color-danger)";

  return (
    <div className="stack-xl">
      <section className="card stack-md">
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="question-no">{set.title}</span>
          <span className="label">の結果</span>
        </div>

        <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
          <span className="score" style={{ color: scoreColor }}>
            {result.correct}
          </span>
          <span className="muted" style={{ fontSize: 20 }}>
            / {result.total}
          </span>
        </div>

        <hr className="divider" />

        {/* 台本を読みながら聞き直せるようにする */}
        <div className="label">台本</div>
        <div className="script">
          {result.key.lines.map((l, i) => (
            <div key={i} className="script-line">
              <div className="label">{l.speaker}</div>
              <p className="script-en">{l.text}</p>
              <p className="script-ja">{l.ja}</p>
            </div>
          ))}
        </div>

        <PlayControls
          playing={playing}
          plays={plays}
          rate={rate}
          onRate={onRate}
          onPlay={onPlay}
        />
      </section>

      <section className="stack-xl">
        {result.key.questions.map((q, qi) => {
          const stem = set.questions[qi];
          const isCorrect = chosen[qi] === q.answer;
          return (
            <div key={qi} className="stack-sm">
              <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
                <span className={isCorrect ? "w-ok" : "w-miss"}>
                  {isCorrect ? "✓" : "✗"}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {qi + 1}. {stem.stem}
                </span>
              </div>
              <div className="label">設問タイプ：{q.type}</div>

              {stem.choices.map((c, ci) => {
                const isAnswer = ci === q.answer;
                const picked = ci === chosen[qi];
                return (
                  <div
                    key={ci}
                    className={`choice-result${isAnswer ? " is-answer" : ""}${
                      picked && !isAnswer ? " is-wrong" : ""
                    }`}
                  >
                    <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
                      <span className="choice-letter">{"ABCD"[ci]}</span>
                      <span>{c}</span>
                      {picked && <span className="label">あなたの解答</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {q.choiceNotes[ci]}
                    </div>
                  </div>
                );
              })}

              <div className="card stack-sm">
                <div className="label">台本の根拠</div>
                <p className="evidence">{q.evidence}</p>
                <div className="label">解き方</div>
                <p className="muted" style={{ margin: 0, fontSize: 14 }}>
                  {q.why}
                </p>
              </div>
            </div>
          );
        })}
      </section>

      <div className="actions">
        <button className="btn-primary" onClick={onRetry}>
          もう一度解く
        </button>
        <button className="btn-secondary" onClick={onBack}>
          一覧へ戻る
        </button>
      </div>
    </div>
  );
}
