#!/usr/bin/env node
/**
 * TTS の疎通確認。.env を読み、ElevenLabs / OpenAI の状態と残枠を報告する。
 *   node scripts/check-tts.mjs
 */
import { readFile, writeFile } from "node:fs/promises";

async function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    try {
      const text = await readFile(file, "utf8");
      for (const line of text.split("\n")) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const value = m[2].replace(/^["']|["']$/g, "");
        if (!process.env[m[1]]) process.env[m[1]] = value;
      }
    } catch {
      // ファイルが無ければ無視
    }
  }
}

const SAMPLE = "I was supposed to meet up with a friend after work, but my train got delayed.";

async function checkElevenLabs() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return console.log("ElevenLabs: ELEVENLABS_API_KEY が未設定");

  const sub = await fetch("https://api.elevenlabs.io/v1/user/subscription", {
    headers: { "xi-api-key": key },
  });
  if (!sub.ok) {
    return console.log(`ElevenLabs: 認証に失敗 (${sub.status}) ${await sub.text()}`);
  }
  const s = await sub.json();
  const used = s.character_count ?? 0;
  const limit = s.character_limit ?? 0;
  console.log(
    `ElevenLabs: OK  プラン=${s.tier}  使用 ${used}/${limit} 文字  残り ${limit - used}`
  );

  const res = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB?output_format=mp3_44100_128",
    {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: SAMPLE,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.35,
          similarity_boost: 0.75,
          style: 0.45,
          use_speaker_boost: true,
          speed: 1.0,
        },
      }),
    }
  );
  if (!res.ok) {
    return console.log(`ElevenLabs: 合成に失敗 (${res.status}) ${await res.text()}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile("tts-sample.mp3", buf);
  console.log(`ElevenLabs: 合成 OK  tts-sample.mp3 (${buf.length} bytes) を書き出しました`);
}

async function checkOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return console.log("OpenAI: OPENAI_API_KEY が未設定");
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: "ash",
      input: "test",
      response_format: "mp3",
    }),
  });
  if (res.ok) {
    console.log("OpenAI: OK");
  } else {
    const body = await res.text();
    const code = body.match(/"code":\s*"([^"]+)"/)?.[1] ?? res.status;
    console.log(`OpenAI: 使用不可 (${res.status} ${code})`);
  }
}

await loadEnv();
await checkElevenLabs();
await checkOpenAI();
