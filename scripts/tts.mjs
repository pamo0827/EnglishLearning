/**
 * 音声合成（ビルド時専用）。
 * 静的サイトには実行時の合成が存在しないため、ここは事前生成スクリプトからのみ使われる。
 * 機械音声を成果物にしないよう、外部プロバイダが失敗したら例外を投げる（macOS の say へは退避しない）。
 */

/**
 * 問題データの voice 名を ElevenLabs の premade ボイスへ対応付ける。
 * 無料プランは library voice を API から使えないため premade に限定する。
 * 一覧: curl -s "https://api.elevenlabs.io/v2/voices?page_size=100" -H "xi-api-key: $KEY"
 */
const VOICES = {
  alloy: "EXAVITQu4vr4xnSDxMaL", // Sarah (US female)
  ash: "CwhRBWXzGAHq8TQ4Fs17", // Roger (US male, laid-back)
  ballad: "cjVigY5qzO86Huf0OWal", // Eric (US male)
  coral: "cgSgspJ2msm6clMCkdW9", // Jessica (US female, bright)
  echo: "iP95p4xoKVk53GoZ742B", // Chris (US male, down-to-earth)
  sage: "FGY2WhTYpPnrIDTdsKH5", // Laura (US female, quirky)
  shimmer: "XrExE9yKIg1WjnnlVkGX", // Matilda (US female)
  verse: "bIHbv24MWmeRgasZH58o", // Will (US male, relaxed)
};

async function synthesizeElevenLabs(q) {
  const voiceId = VOICES[q.voice];
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: q.transcript,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          // stability を下げると読み上げ調が抜け、会話らしい抑揚になる
          stability: 0.35,
          similarity_boost: 0.75,
          style: 0.45,
          use_speaker_boost: true,
          speed: Math.min(1.2, Math.max(0.7, q.speed)),
        },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function synthesizeOpenAI(q) {
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      voice: q.voice,
      input: q.transcript,
      speed: q.speed,
      response_format: "mp3",
      instructions:
        "Speak like a native English speaker talking casually to a friend. " +
        "Use natural connected speech, contractions, weak forms and reductions. " +
        "Do not over-enunciate; this is real conversational speech, not a textbook recording.",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`OpenAI TTS failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

/** ElevenLabs → OpenAI の順に試す。両方失敗したら例外を投げる。戻り値は mp3 の Buffer */
export async function synthesize(q) {
  const providers = [];
  if (process.env.ELEVENLABS_API_KEY) {
    providers.push({ name: "ElevenLabs", run: () => synthesizeElevenLabs(q) });
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push({ name: "OpenAI", run: () => synthesizeOpenAI(q) });
  }
  if (providers.length === 0) {
    throw new Error(
      "ELEVENLABS_API_KEY も OPENAI_API_KEY も設定されていません（.env を確認してください）"
    );
  }

  const failures = [];
  for (const p of providers) {
    try {
      return await p.run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${p.name}: ${message}`);
    }
  }
  throw new Error(failures.join(" / "));
}
