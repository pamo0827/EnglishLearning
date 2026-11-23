#!/usr/bin/env node
/**
 * 教材音声を暗号化して public/lessons/ へ書き出す。
 *
 *   npm run lessons:build
 *
 * 入力（どちらもコミットしない。.gitignore 済み）:
 *   private/lessons/lessons.json   原稿・日本語訳・文ごとの開始秒
 *   private/lessons/audio/*.mp3    音源
 *   .env の LESSON_KEY             AES-256 の鍵（base64）。無ければ作って追記する
 *
 * 出力（コミットする。CI には原本が無いので、ここで作ったものをそのまま配る）:
 *   public/lessons/manifest.bin    暗号化した原稿一式
 *   public/lessons/{trackId}.bin   暗号化した音声
 *
 * 鍵は Worker（worker/）の secret にも同じ値を入れる。鍵を作り直したら両方を更新する。
 */
import { promises as fs } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webcrypto } from "node:crypto";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "private", "lessons");
const OUT = path.join(ROOT, "public", "lessons");
const ENV = path.join(ROOT, ".env");

async function readKey() {
  let env = "";
  try {
    env = await fs.readFile(ENV, "utf8");
  } catch {}
  const m = env.match(/^LESSON_KEY=(.+)$/m);
  if (m) return Buffer.from(m[1].trim(), "base64");
  const key = Buffer.from(webcrypto.getRandomValues(new Uint8Array(32)));
  await fs.writeFile(
    ENV,
    `${env}${env.endsWith("\n") || env === "" ? "" : "\n"}LESSON_KEY=${key.toString("base64")}\n`
  );
  console.log("LESSON_KEY を作って .env に追記しました（Worker の secret にも入れること）");
  return key;
}

const raw = await readKey();
if (raw.length !== 32) throw new Error("LESSON_KEY は 32 バイトの base64 であること");
const key = await webcrypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);

async function encrypt(plain) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const cipher = await webcrypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  return Buffer.concat([Buffer.from(iv), Buffer.from(cipher)]);
}

const source = JSON.parse(await fs.readFile(path.join(SRC, "lessons.json"), "utf8"));

await fs.rm(OUT, { recursive: true, force: true });
await fs.mkdir(OUT, { recursive: true });
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "lessons-"));

const lessons = [];
let bytes = 0;
for (const lesson of source.lessons) {
  const tracks = [];
  for (const track of lesson.tracks) {
    const input = path.join(SRC, "audio", track.file);
    // 音読用の音源は 320kbps と重いので、声に十分な 96kbps へ揃える。
    // 再エンコードしても時刻はずれない。
    const encoded = path.join(tmp, `${track.id}.mp3`);
    execFileSync("ffmpeg", [
      "-v", "error", "-y", "-i", input,
      "-map", "0:a", "-map_metadata", "-1",
      "-c:a", "libmp3lame", "-b:a", "96k", encoded,
    ]);
    const sealed = await encrypt(await fs.readFile(encoded));
    await fs.writeFile(path.join(OUT, `${track.id}.bin`), sealed);
    bytes += sealed.length;

    for (const s of track.sentences) {
      if (typeof s.t !== "number" || !s.en || !s.ja) {
        throw new Error(`${track.id}: 文のデータが欠けています ${JSON.stringify(s)}`);
      }
    }
    tracks.push({
      id: track.id,
      label: track.label,
      duration: track.duration,
      sentences: track.sentences.map(({ t, e, no, en, ja }) => ({ t, e, no, en, ja })),
    });
  }
  lessons.push({ no: lesson.no, title: lesson.title, tracks });
}
await fs.rm(tmp, { recursive: true, force: true });

await fs.writeFile(
  path.join(OUT, "manifest.bin"),
  await encrypt(Buffer.from(JSON.stringify({ lessons })))
);

// 平文が紛れ込んでいないことを確かめる。mp3 の同期ヘッダと、原稿の一節を探す。
const probe = source.lessons[0].tracks[0].sentences[0].en.slice(0, 20);
for (const name of await fs.readdir(OUT)) {
  const buf = await fs.readFile(path.join(OUT, name));
  if (buf.includes(probe) || buf.subarray(0, 3).toString() === "ID3") {
    throw new Error(`${name} に平文が含まれています`);
  }
}

console.log(
  `${lessons.length} レッスン / ${lessons.reduce((n, l) => n + l.tracks.length, 0)} 音声 / ${(bytes / 1e6).toFixed(1)} MB を public/lessons/ に書き出しました`
);
