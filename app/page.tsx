"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { grade, type GradeResult } from "@/lib/grade";
import { unseal, type Sealed } from "@/lib/crypto";
import { Reading } from "./Reading";
import { Listening } from "./Listening";
import { PlayControls, RATES } from "./PlayControls";
import {
  loadProgress,
  saveProgress,
  clearChapterProgress,
  DICTATION_KEY,
  type Progress,
} from "@/lib/progress";

/** GitHub Pages のプロジェクトページ配下で動かすための接頭辞 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const asset = (p: string) => `${BASE}/${p}`;

type ChapterMeta = {
  id: number;
  title: string;
  questionCount: number;
  ready: boolean;
};

type QuestionMeta = {
  id: number;
  chapter: number;
  level: string;
  difficulty: number;
  audio: boolean;
};

type Index = { chapters: ChapterMeta[]; questions: QuestionMeta[] };

/** 復号して初めて手に入る正解データ。採点ボタンを押すまで取得しない */
type Answer = {
  transcript: string;
  translation: string;
  hints: { phrase: string; note: string }[];
};

const chapterCacheName = (id: number) => `chapter-${id}-v1`;

function chapterUrls(index: Index, chapterId: number): string[] {
  return index.questions
    .filter((q) => q.chapter === chapterId)
    .flatMap((q) => [asset(`audio/${q.id}.mp3`), asset(`data/enc/${q.id}.json`)]);
}

async function fetchAnswer(id: number): Promise<Answer> {
  const res = await fetch(asset(`data/enc/${id}.json`));
  if (!res.ok) throw new Error("問題データを取得できませんでした");
  return unseal<Answer>(id, (await res.json()) as Sealed);
}

type Mode = "dictation" | "reading" | "listening";

export default function Page() {
  const [mode, setMode] = useState<Mode>("dictation");
  const [index, setIndex] = useState<Index | null>(null);
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [position, setPosition] = useState(0);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [progress, setProgress] = useState<Progress>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setProgress(loadProgress(DICTATION_KEY));
  }, []);

  useEffect(() => {
    fetch(asset("data/index.json"))
      .then((r) => r.json())
      .then(setIndex)
      .catch(() => setError("問題データを読み込めませんでした。"));

    // オフラインで使えるようにするためのサービスワーカー
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(asset("sw.js"), { scope: `${BASE}/` })
        .catch(() => {
          // HTTP 経由の LAN アクセスなどでは登録できない。オフライン保存が使えないだけ。
        });
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const order = useMemo(() => {
    if (!index || chapterId === null) return [];
    return index.questions
      .filter((q) => q.chapter === chapterId)
      .map((q) => q.id)
      .sort((a, b) => a - b);
  }, [index, chapterId]);

  const currentId = order[position];
  const current = index?.questions.find((q) => q.id === currentId);
  const chapter = index?.chapters.find((c) => c.id === chapterId);

  /** 章を開始する。at を渡すとその問題から再開する */
  const startChapter = (id: number, at = 0) => {
    setChapterId(id);
    setPosition(at);
    setPlays(0);
    setAnswer("");
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

  /** 採点。正解データを取得するのはこの瞬間が初めて */
  const submit = useCallback(async () => {
    if (currentId === undefined || answer.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const a = await fetchAnswer(currentId);
      const r = grade(a, answer);
      setResult(r);
      // 進捗は端末に残す。閉じても続きから再開できるようにするため。
      setProgress((prev) => {
        const next = { ...prev, [currentId]: r.score };
        saveProgress(DICTATION_KEY, next);
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "採点に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [currentId, answer]);

  const next = () => {
    setPosition((p) => p + 1);
    setPlays(0);
    setAnswer("");
    setResult(null);
  };

  const backToChapters = () => {
    setChapterId(null);
    setResult(null);
    setAnswer("");
  };

  const finished = chapterId !== null && position >= order.length;

  return (
    <main className="stack-xl">
      <header className="stack-md">
        <div className="row-between">
          <div>
            <div className="app-title">英語学習</div>
            {mode === "dictation" && chapter && (
              <div className="muted" style={{ fontSize: 14 }}>
                {chapter.title}
              </div>
            )}
          </div>
          {mode === "dictation" && chapterId !== null && (
            <button className="btn-secondary" onClick={backToChapters}>
              章を選び直す
            </button>
          )}
        </div>

        <div className="modes" role="group" aria-label="学習モード">
          <button
            className={`mode-btn${mode === "dictation" ? " is-active" : ""}`}
            onClick={() => setMode("dictation")}
            aria-pressed={mode === "dictation"}
          >
            ディクテーション
          </button>
          <button
            className={`mode-btn${mode === "listening" ? " is-active" : ""}`}
            onClick={() => setMode("listening")}
            aria-pressed={mode === "listening"}
          >
            リスニング
          </button>
          <button
            className={`mode-btn${mode === "reading" ? " is-active" : ""}`}
            onClick={() => setMode("reading")}
            aria-pressed={mode === "reading"}
          >
            長文読解
          </button>
        </div>
      </header>

      {mode === "reading" ? (
        <Reading />
      ) : mode === "listening" ? (
        <Listening />
      ) : (
        <>
      {currentId !== undefined && !finished && (
        <audio
          ref={audioRef}
          src={asset(`audio/${currentId}.mp3`)}
          onEnded={() => setPlaying(false)}
          onError={() => setError("音声を読み込めませんでした。")}
          preload="auto"
        />
      )}

      {index === null ? (
        <p className="muted">読み込み中…</p>
      ) : chapterId === null ? (
        <ChapterList index={index} progress={progress} onStart={startChapter} />
      ) : finished ? (
        <ChapterDone
          chapter={chapter}
          ids={order}
          progress={progress}
          onRestart={() => {
            setProgress((prev) => {
              const next = clearChapterProgress(prev, order);
              saveProgress(DICTATION_KEY, next);
              return next;
            });
            startChapter(chapterId);
          }}
          onBack={backToChapters}
        />
      ) : result === null ? (
        <QuestionView
          position={position}
          total={order.length}
          question={current}
          plays={plays}
          playing={playing}
          rate={rate}
          onRate={setRate}
          answer={answer}
          busy={busy}
          onPlay={play}
          onAnswer={setAnswer}
          onSubmit={submit}
        />
      ) : (
        <ResultView
          result={result}
          answer={answer}
          position={position}
          total={order.length}
          onNext={next}
          playing={playing}
          plays={plays}
          rate={rate}
          onRate={setRate}
          onPlay={play}
        />
      )}

      {error && <p className="error">{error}</p>}
        </>
      )}
    </main>
  );
}

/* ------------------------------------------------------------------ *
 * 章の一覧。ダウンロードはここにだけ置く
 * ------------------------------------------------------------------ */

function ChapterList({
  index,
  progress,
  onStart,
}: {
  index: Index;
  progress: Progress;
  onStart: (id: number, at?: number) => void;
}) {
  return (
    <div className="stack-md">
      {index.chapters.map((c) => (
        <ChapterCard
          key={c.id}
          chapter={c}
          index={index}
          progress={progress}
          onStart={onStart}
        />
      ))}
    </div>
  );
}

function ChapterCard({
  chapter,
  index,
  progress,
  onStart,
}: {
  chapter: ChapterMeta;
  index: Index;
  progress: Progress;
  onStart: (id: number, at?: number) => void;
}) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [downloading, setDownloading] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const urls = useMemo(() => chapterUrls(index, chapter.id), [index, chapter.id]);

  const ids = useMemo(
    () =>
      index.questions
        .filter((q) => q.chapter === chapter.id)
        .map((q) => q.id)
        .sort((a, b) => a - b),
    [index, chapter.id]
  );
  // 未解答の最初の問題から再開する。全問済みなら先頭に戻る。
  const firstUnanswered = ids.findIndex((id) => progress[id] === undefined);
  const resumeAt = firstUnanswered === -1 ? 0 : firstUnanswered;

  // 端末に保存済みかどうかを調べる
  useEffect(() => {
    if (!("caches" in window)) {
      setSaved(false);
      return;
    }
    void (async () => {
      try {
        const cache = await caches.open(chapterCacheName(chapter.id));
        const keys = await cache.keys();
        setSaved(keys.length >= urls.length && urls.length > 0);
      } catch {
        setSaved(false);
      }
    })();
  }, [chapter.id, urls.length]);

  /** 章の音声と問題データを端末へ保存し、電波が無くても練習できるようにする */
  const download = async () => {
    if (!("caches" in window)) {
      setNote("このブラウザはオフライン保存に対応していません。");
      return;
    }
    setNote(null);
    setDownloading({ done: 0, total: urls.length });
    try {
      const cache = await caches.open(chapterCacheName(chapter.id));
      for (let i = 0; i < urls.length; i++) {
        await cache.add(urls[i]);
        setDownloading({ done: i + 1, total: urls.length });
      }
      setSaved(true);
    } catch {
      setNote("保存に失敗しました。通信状況を確認してください。");
    } finally {
      setDownloading(null);
    }
  };

  const remove = async () => {
    await caches.delete(chapterCacheName(chapter.id));
    setSaved(false);
  };

  /** 解説をひとつの HTML にまとめて書き出す。正解を含むので明示的な操作でのみ実行する */
  const downloadNotes = async () => {
    setNote(null);
    setDownloading({ done: 0, total: chapter.questionCount });
    try {
      const answers: (Answer & { id: number; level: string; difficulty: number })[] =
        [];
      for (let i = 0; i < ids.length; i++) {
        const meta = index.questions.find((q) => q.id === ids[i])!;
        answers.push({
          ...(await fetchAnswer(ids[i])),
          id: ids[i],
          level: meta.level,
          difficulty: meta.difficulty,
        });
        setDownloading({ done: i + 1, total: ids.length });
      }

      const html = buildNotesHtml(chapter, answers);
      const url = URL.createObjectURL(
        new Blob([html], { type: "text/html;charset=utf-8" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `第${chapter.id}章_解説.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setNote("解説の書き出しに失敗しました。");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="card stack-md">
      <div>
        <div style={{ fontWeight: 600, fontSize: 17 }}>{chapter.title}</div>
        <div className="label" style={{ marginTop: 4 }}>
          全{chapter.questionCount}問
        </div>
      </div>

      {chapter.ready ? (
        <>
          <div className="actions">
            <button
              className="btn-primary"
              onClick={() => onStart(chapter.id, resumeAt)}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5Z" />
              </svg>
              {resumeAt > 0 ? `第${resumeAt + 1}問から続ける` : "始める"}
            </button>
          </div>

          {/* どの問題からでも入れるようにする。閉じても続きから戻れる。
              升目が番号と点数を示すので、見出しは置かない。 */}
          <div className="q-grid">
              {ids.map((qid, i) => {
                const score = progress[qid];
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
                    key={qid}
                    className={`q-cell${state}`}
                    onClick={() => onStart(chapter.id, i)}
                    title={
                      score === undefined
                        ? `第${i + 1}問（未解答）`
                        : `第${i + 1}問（${score}点）`
                    }
                  >
                    <span className="q-cell-no">{i + 1}</span>
                    <span className="q-cell-score">
                      {score === undefined ? "—" : score}
                    </span>
                  </button>
                );
              })}
          </div>

          <div className="stack-sm">
            <div className="label">オフラインでダウンロード</div>
            <div className="actions">
              <button
                className={`btn-secondary${saved ? " is-done" : ""}`}
                onClick={saved ? remove : download}
                disabled={downloading !== null}
                title={saved ? "もう一度押すと端末から削除します" : undefined}
              >
                {downloading
                  ? `ダウンロード中 ${downloading.done} / ${downloading.total}`
                  : saved
                    ? "✓ ダウンロード済み"
                    : "音声"}
              </button>
              <button
                className="btn-secondary"
                onClick={downloadNotes}
                disabled={downloading !== null}
              >
                解説
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="chip" style={{ color: "var(--color-on-surface-muted)" }}>
          準備中（音声を生成すると選べるようになります）
        </div>
      )}

      {note && <p className="error">{note}</p>}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * 出題画面：問題番号・再生ボタン・再生回数・再生速度・入力欄・採点ボタンのみ
 * ------------------------------------------------------------------ */

function QuestionView({
  position,
  total,
  question,
  plays,
  playing,
  rate,
  onRate,
  answer,
  busy,
  onPlay,
  onAnswer,
  onSubmit,
}: {
  position: number;
  total: number;
  question: QuestionMeta | undefined;
  plays: number;
  playing: boolean;
  rate: number;
  onRate: (v: number) => void;
  answer: string;
  busy: boolean;
  onPlay: () => void;
  onAnswer: (v: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="stack-xl">
      {/* 出題画面はカードで囲まない。この画面には要素が1組しかなく、
          何かと区切るための枠が要らない。 */}
      <section className="stack-md">
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="question-no">第{position + 1}問</span>
          <span className="label">
            / {total}
            {question ? ` ・ Lv${question.difficulty} ・ ${question.level}` : ""}
          </span>
        </div>

        <PlayControls
          playing={playing}
          plays={plays}
          rate={rate}
          onRate={onRate}
          onPlay={onPlay}
          disabled={!question}
          showCount
        />
      </section>

      <section className="stack-md">
        <div className="label">聞き取った英語</div>
        <textarea
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          aria-label="聞き取った英語の入力欄"
        />
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>
          正しい英作文である必要はありません。聞こえた音をそのまま書いてください。
        </p>
        <button
          className="btn-primary"
          onClick={onSubmit}
          disabled={busy || answer.trim().length === 0}
        >
          {busy ? "採点中…" : "採点する"}
        </button>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 結果画面：ここではじめて正解・訳・解説を出す
 * ------------------------------------------------------------------ */

function ResultView({
  result,
  answer,
  position,
  total,
  onNext,
  playing,
  plays,
  rate,
  onRate,
  onPlay,
}: {
  result: GradeResult;
  answer: string;
  position: number;
  total: number;
  onNext: () => void;
  playing: boolean;
  plays: number;
  rate: number;
  onRate: (v: number) => void;
  onPlay: () => void;
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
        <div className="label">
          第{position + 1}問 / {total} の結果
        </div>
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="score" style={{ color: scoreColor }}>
            {result.score}
          </span>
          <span className="muted" style={{ fontSize: 20 }}>
            / 100
          </span>
        </div>

        <hr className="divider" />

        <div className="label">正解英文</div>
        <p className="transcript" style={{ margin: 0 }}>
          {result.words.map((w, i) => (
            <span key={i}>
              <span className={`w-${w.status}`}>{w.word}</span>
              {w.status !== "ok" && (
                <span className="mark" aria-hidden="true">
                  {w.status === "near" ? "△" : "✗"}
                </span>
              )}
              <span>{w.trailing} </span>
            </span>
          ))}
        </p>

        <div className="label" style={{ marginTop: 8 }}>
          日本語訳
        </div>
        <p style={{ margin: 0 }}>{result.translation}</p>

        {/* 正解を読みながら聞き直せるようにする。速度を落として
            聞き取れなかった箇所を確かめるのがこの画面の主目的。 */}
        <PlayControls
          playing={playing}
          plays={plays}
          rate={rate}
          onRate={onRate}
          onPlay={onPlay}
        />
      </section>

      <section className="card stack-md">
        <div className="label">あなたの入力</div>
        <p className="transcript muted" style={{ margin: 0 }}>
          {answer}
        </p>
      </section>

      {result.caught.length > 0 && (
        <section className="stack-sm">
          <div className="label" style={{ color: "var(--color-success)" }}>
            ✓ 聞き取れていたところ
          </div>
          <div>
            {result.caught.map((s, i) => (
              <span className="chip" key={i}>
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {result.missed.length > 0 && (
        <section className="stack-sm">
          <div className="label" style={{ color: "var(--color-danger)" }}>
            ✗ 間違っていたところ
          </div>
          <div>
            {result.missed.map((s, i) => (
              <span className="chip" key={i}>
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {result.dropped.length > 0 && (
        <section className="stack-sm">
          <div className="label">脱落（書かれていなかった語）</div>
          <div>
            {result.dropped.map((s, i) => (
              <span className="chip" key={i}>
                {s}
              </span>
            ))}
          </div>
        </section>
      )}

      {result.confusions.length > 0 && (
        <section className="stack-sm">
          <div className="label">誤認識（別の音として聞こえた語）</div>
          <div>
            {result.confusions.map((c, i) => (
              <span className="chip" key={i}>
                <span className="muted">{c.heard}</span>
                {" → "}
                <span style={{ color: "var(--color-success)" }}>{c.expected}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {result.points.length > 0 && (
        <section className="card stack-md">
          <div className="label">聞き取りのポイント</div>
          {result.points.map((p, i) => (
            <div key={i} className="stack-sm">
              <div style={{ fontWeight: 600 }}>{p.phrase}</div>
              <div className="muted" style={{ fontSize: 14 }}>
                {p.note}
              </div>
            </div>
          ))}
        </section>
      )}

      <button className="btn-primary" onClick={onNext}>
        {position + 1 >= total ? "章を終える" : "次の問題に進む"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 章の終わり
 * ------------------------------------------------------------------ */

function ChapterDone({
  chapter,
  ids,
  progress,
  onRestart,
  onBack,
}: {
  chapter: ChapterMeta | undefined;
  ids: number[];
  progress: Progress;
  onRestart: () => void;
  onBack: () => void;
}) {
  const values = ids
    .map((id) => progress[id])
    .filter((v): v is number => v !== undefined);
  const average =
    values.length === 0
      ? 0
      : Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  return (
    <div className="stack-xl">
      <section className="card stack-md">
        <div className="label">{chapter?.title} を終えました</div>
        <div className="row" style={{ alignItems: "baseline", gap: 8 }}>
          <span className="score">{average}</span>
          <span className="muted" style={{ fontSize: 20 }}>
            / 100（平均）
          </span>
        </div>
        <div>
          {ids.map((id, i) =>
            progress[id] === undefined ? null : (
              <span className="chip" key={id}>
                第{i + 1}問 {progress[id]}
              </span>
            )
          )}
        </div>
      </section>

      <div className="actions">
        <button className="btn-primary" onClick={onRestart}>
          記録を消してもう一度始める
        </button>
        <button className="btn-secondary" onClick={onBack}>
          章を選び直す
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 解説の書き出し
 * ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : "&quot;"
  );
}

function buildNotesHtml(
  chapter: ChapterMeta,
  answers: (Answer & { id: number; level: string; difficulty: number })[]
): string {
  const items = answers
    .map(
      (a, i) => `
  <article>
    <h2>第${i + 1}問 <span class="meta">Lv${a.difficulty} ・ ${escapeHtml(a.level)}</span></h2>
    <p class="en">${escapeHtml(a.transcript)}</p>
    <p class="ja">${escapeHtml(a.translation)}</p>
    <h3>聞き取りのポイント</h3>
    <dl>
${a.hints
  .map(
    (h) =>
      `      <dt>${escapeHtml(h.phrase)}</dt>\n      <dd>${escapeHtml(h.note)}</dd>`
  )
  .join("\n")}
    </dl>
  </article>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(chapter.title)} 解説</title>
<style>
  :root { color-scheme: light; }
  body {
    max-width: 720px; margin: 0 auto; padding: 40px 20px 80px;
    font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP", sans-serif;
    line-height: 1.8; color: #14171f; background: #fff;
  }
  h1 { font-size: 24px; letter-spacing: -0.02em; }
  h2 { font-size: 17px; margin-top: 40px; border-top: 1px solid currentColor; padding-top: 20px; }
  h3 { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; opacity: .6; margin-bottom: 4px; }
  .meta { font-size: 12px; font-weight: 400; opacity: .6; }
  .en { font-size: 19px; line-height: 1.9; margin: 8px 0 4px; }
  .ja { margin: 0 0 16px; opacity: .75; }
  dt { font-weight: 600; margin-top: 12px; }
  dd { margin: 2px 0 0; opacity: .8; font-size: 14px; }
  .lead { opacity: .7; font-size: 14px; }
  @media print { body { color: #000; background: #fff; } h2 { break-inside: avoid; } }
</style>
</head>
<body>
<h1>${escapeHtml(chapter.title)}</h1>
<p class="lead">全${chapter.questionCount}問</p>
${items}
</body>
</html>
`;
}
