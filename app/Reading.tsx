"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { unseal, type Sealed } from "@/lib/crypto";
import {
  gradeReading,
  formatDuration,
  type ReadingAnswerKey,
  type ReadingResult,
  type SpeedRank,
} from "@/lib/reading";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (p: string) => `${BASE}/${p}`;

type ReadingChapterMeta = {
  id: number;
  title: string;
  setCount: number;
  questionCount: number;
};

type ReadingSetMeta = {
  id: number;
  chapter: number;
  format: "single" | "double" | "triple";
  docType: string;
  title: string;
  passages: { label: string; body: string }[];
  questions: { stem: string; choices: [string, string, string, string] }[];
  targetSecPerQuestion: number;
  wordCount: number;
};

type ReadingData = {
  chapters: ReadingChapterMeta[];
  sets: ReadingSetMeta[];
  ranks: SpeedRank[];
};

const FORMAT_LABEL: Record<ReadingSetMeta["format"], string> = {
  single: "単一文書",
  double: "二重文書",
  triple: "三重文書",
};

export function Reading() {
  const [data, setData] = useState<ReadingData | null>(null);
  const [setId, setSetId] = useState<number | null>(null);
  const [chosen, setChosen] = useState<(number | null)[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [result, setResult] = useState<ReadingResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(asset("data/reading.json"))
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("問題データを読み込めませんでした。"));
  }, []);

  // 経過時間を1秒ごとに進める。制限ではなく現在地の表示。
  useEffect(() => {
    if (startedAt === null || result !== null) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [startedAt, result]);

  const current = data?.sets.find((s) => s.id === setId) ?? null;
  const elapsedSec = startedAt === null ? 0 : (now - startedAt) / 1000;

  const start = (s: ReadingSetMeta) => {
    setSetId(s.id);
    setChosen(new Array(s.questions.length).fill(null));
    setStartedAt(Date.now());
    setNow(Date.now());
    setResult(null);
    setError(null);
    window.scrollTo(0, 0);
  };

  const submit = useCallback(async () => {
    if (!current || !data || startedAt === null) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(asset(`data/reading-enc/${current.id}.json`));
      if (!res.ok) throw new Error("解説を取得できませんでした");
      const keys = await unseal<{ questions: ReadingAnswerKey[] }>(
        `reading:${current.id}`,
        (await res.json()) as Sealed
      );
      setResult(
        gradeReading(
          keys.questions,
          chosen,
          (Date.now() - startedAt) / 1000,
          current.targetSecPerQuestion,
          data.ranks
        )
      );
      window.scrollTo(0, 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "採点に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [current, data, chosen, startedAt]);

  const back = () => {
    setSetId(null);
    setResult(null);
    setStartedAt(null);
  };

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">読み込み中…</p>;

  if (!current) return <SetList data={data} onStart={start} />;

  return (
    <div className="stack-xl">
      {result === null ? (
        <SolveView
          set={current}
          chosen={chosen}
          onChoose={(qi, ci) =>
            setChosen((prev) => prev.map((v, i) => (i === qi ? ci : v)))
          }
          elapsedSec={elapsedSec}
          busy={busy}
          onSubmit={submit}
          onBack={back}
        />
      ) : (
        <ReadingResultView
          set={current}
          result={result}
          onBack={back}
          onRetry={() => start(current)}
        />
      )}
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * セットの一覧
 * ------------------------------------------------------------------ */

function SetList({
  data,
  onStart,
}: {
  data: ReadingData;
  onStart: (s: ReadingSetMeta) => void;
}) {
  return (
    <div className="stack-xl">
      {data.chapters.map((c) => (
        <div key={c.id} className="stack-md">
          {/* 章の見出し。ディクテーションの章カードと同じ形にそろえる */}
          <div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{c.title}</div>
            <div className="label" style={{ marginTop: 4 }}>
              全{c.setCount}セット {c.questionCount}問
            </div>
          </div>

          {data.sets
            .filter((s) => s.chapter === c.id)
            .map((s) => (
              <section key={s.id} className="card stack-md">
                <div>
                  <div style={{ fontWeight: 600, fontSize: 17 }}>{s.title}</div>
                  <div className="label" style={{ marginTop: 4 }}>
                    {FORMAT_LABEL[s.format]} ・ {s.docType} ・ {s.wordCount}語 ・{" "}
                    {s.questions.length}問
                  </div>
                </div>

                <div className="actions">
                  <button className="btn-primary" onClick={() => onStart(s)}>
                    始める
                  </button>
                </div>

                <div className="stack-sm">
                  <div className="label">目標</div>
                  <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
                    <span className="chip">
                      {s.targetSecPerQuestion}秒 / 問
                    </span>
                    <span className="chip">
                      全体{" "}
                      {formatDuration(
                        s.questions.length * s.targetSecPerQuestion
                      )}
                    </span>
                  </div>
                </div>
              </section>
            ))}
        </div>
      ))}

      <RankTable ranks={data.ranks} />
    </div>
  );
}

function RankTable({ ranks }: { ranks: SpeedRank[] }) {
  return (
    <section className="stack-sm">
      <div className="label">速読ランク（1問あたりの秒数で判定）</div>
      <div className="rank-table">
        {ranks.map((r, i) => (
          <div key={r.rank} className="rank-row">
            <span className={`rank-badge rank-${r.rank}`}>{r.rank}</span>
            <span className="label" style={{ minWidth: 78 }}>
              {r.maxSec === null
                ? `${(ranks[i - 1]?.maxSec ?? 0) + 1}秒〜`
                : `〜${r.maxSec}秒`}
            </span>
            <span className="muted" style={{ fontSize: 14 }}>
              {r.label}
            </span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>
        基準は TOEIC Part 7 の 54問／54分＝1問60秒。制限時間は設けていません。
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 解答画面
 * ------------------------------------------------------------------ */

function SolveView({
  set,
  chosen,
  onChoose,
  elapsedSec,
  busy,
  onSubmit,
  onBack,
}: {
  set: ReadingSetMeta;
  chosen: (number | null)[];
  onChoose: (questionIndex: number, choiceIndex: number) => void;
  elapsedSec: number;
  busy: boolean;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const answered = chosen.filter((c) => c !== null).length;

  return (
    <div className="stack-xl">
      <div className="row-between">
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="question-no">{set.title}</span>
          <span className="label">
            {FORMAT_LABEL[set.format]} ・ {set.wordCount}語
          </span>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <span className="timer">{formatDuration(elapsedSec)}</span>
          <button className="btn-secondary" onClick={onBack}>
            やめる
          </button>
        </div>
      </div>

      {set.passages.map((p, i) => (
        <section key={i} className="stack-sm">
          {set.passages.length > 1 && <div className="label">{p.label}</div>}
          <pre className="passage">{p.body}</pre>
        </section>
      ))}

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
                  name={`q${qi}`}
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

      <div className="stack-sm">
        <div className="label">
          {answered} / {set.questions.length} 問に解答済み
        </div>
        <div className="actions">
          <button className="btn-primary" onClick={onSubmit} disabled={busy}>
            {busy ? "採点中…" : "採点する"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 結果画面
 * ------------------------------------------------------------------ */

function ReadingResultView({
  set,
  result,
  onBack,
  onRetry,
}: {
  set: ReadingSetMeta;
  result: ReadingResult;
  onBack: () => void;
  onRetry: () => void;
}) {
  const scoreColor =
    result.score >= 85
      ? "var(--color-success)"
      : result.score >= 55
        ? "var(--color-warning)"
        : "var(--color-danger)";

  const faster = result.vsTargetSec <= 0;

  return (
    <div className="stack-xl">
      <section className="card stack-md">
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="question-no">{set.title}</span>
          <span className="label">の結果</span>
        </div>

        <div className="row" style={{ gap: 32, flexWrap: "wrap" }}>
          <div>
            <div className="label">正解</div>
            <div className="row" style={{ alignItems: "baseline", gap: 6 }}>
              <span className="score" style={{ color: scoreColor }}>
                {result.correct}
              </span>
              <span className="muted" style={{ fontSize: 20 }}>
                / {result.total}
              </span>
            </div>
          </div>

          <div>
            <div className="label">速読ランク</div>
            <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
              <span className={`score rank-${result.rank.rank}`}>
                {result.rank.rank}
              </span>
            </div>
          </div>
        </div>

        <p className="muted" style={{ margin: 0, fontSize: 14 }}>
          {result.rank.label}
        </p>

        <hr className="divider" />

        <div className="stack-sm">
          <div className="row" style={{ gap: 24, flexWrap: "wrap" }}>
            <span className="label">所要 {formatDuration(result.elapsedSec)}</span>
            <span className="label">
              1問あたり {result.secPerQuestion.toFixed(1)}秒
            </span>
            <span className="label">
              目標 {set.targetSecPerQuestion}秒/問
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 14 }}>
            目標より
            <strong style={{ color: faster ? "var(--color-success)" : "var(--color-danger)" }}>
              {" "}
              {Math.abs(result.vsTargetSec).toFixed(1)}秒
              {faster ? " 速い" : " 遅い"}
            </strong>
            （1問あたり）。
          </p>
        </div>
      </section>

      <section className="stack-xl">
        {result.questions.map((q) => {
          const stem = set.questions[q.index];
          return (
            <div key={q.index} className="stack-sm">
              <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
                <span className={q.correct ? "w-ok" : "w-miss"}>
                  {q.correct ? "✓" : "✗"}
                </span>
                <span style={{ fontWeight: 600 }}>
                  {q.index + 1}. {stem.stem}
                </span>
              </div>
              <div className="label">設問タイプ：{q.type}</div>

              {stem.choices.map((c, ci) => {
                const isAnswer = ci === q.answer;
                const isChosen = ci === q.chosen;
                return (
                  <div
                    key={ci}
                    className={`choice-result${isAnswer ? " is-answer" : ""}${
                      isChosen && !isAnswer ? " is-wrong" : ""
                    }`}
                  >
                    <div className="row" style={{ gap: 8, alignItems: "baseline" }}>
                      <span className="choice-letter">{"ABCD"[ci]}</span>
                      <span>{c}</span>
                      {isChosen && <span className="label">あなたの解答</span>}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
                      {q.choiceNotes[ci]}
                    </div>
                  </div>
                );
              })}

              <div className="card stack-sm">
                <div className="label">本文の根拠</div>
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
