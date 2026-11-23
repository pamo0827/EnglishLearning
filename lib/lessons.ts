/**
 * 教材音声（市販教材の音源と原稿）の取得と復号。
 *
 * ほかのモードの lib/crypto.ts は「うっかり目に入らない」ための難読化で、鍵の材料が
 * バンドルに入っている。こちらは別物で、鍵はバンドルにもリポジトリにも無い。
 * 許可した IP から来たときか、正しいパスワードを送ったときだけ
 * Worker（worker/src/index.js）が鍵を返す。鍵が取れなければログインの欄を出す。
 *
 * 鍵そのものは保存しない。端末に残すのはログインに使ったパスワードだけで、
 * Worker 側のパスワードを変えれば、次に開いたときから入れなくなる。
 */

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** 鍵を配る Worker。URL 自体は秘密ではない（許可外の IP には 403 しか返さない） */
const KEY_URL =
  process.env.NEXT_PUBLIC_LESSON_KEY_URL ??
  "https://english-learning-key.pamo0827.workers.dev/";

export type Sentence = {
  /** この文が始まる秒 */
  t: number;
  /** この文が終わる秒。1文のくり返しはここで折り返す。無ければ次の文の頭まで */
  e?: number;
  /** 番号つきの短文で、その番号の最初の文にだけ付く */
  no?: string;
  en: string;
  ja: string;
};

export type Track = {
  id: string;
  label: string;
  duration: number;
  sentences: Sentence[];
};

export type Lesson = {
  no: number;
  title: string;
  tracks: Track[];
};

export type Manifest = { lessons: Lesson[] };

function fromBase64(text: string): Uint8Array {
  const s = atob(text);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

const PASSWORD_KEY = "lessons-password-v1";

async function requestKey(password?: string): Promise<CryptoKey | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(KEY_URL, {
      signal: ctrl.signal,
      cache: "no-store",
      ...(password === undefined
        ? {}
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          }),
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; key?: string };
    if (!body.ok || !body.key) return null;
    return await crypto.subtle.importKey(
      "raw",
      fromBase64(body.key) as BufferSource,
      "AES-GCM",
      false,
      ["decrypt"]
    );
  } catch {
    return null;
  }
}

/**
 * 起動時に呼ぶ。許可された IP ならそのまま鍵が返る。そうでなければ、前回ログインに
 * 使ったパスワードが端末に残っていればそれで試す。どちらも駄目なら null。
 */
export async function fetchLessonKey(): Promise<CryptoKey | null> {
  const byIp = await requestKey();
  if (byIp) return byIp;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(PASSWORD_KEY);
  } catch {
    // 保存領域が使えない端末では、毎回入力してもらう
  }
  return saved ? requestKey(saved) : null;
}

/** パスワードでログインする。通ったら次回から入力が要らないよう端末に残す */
export async function loginWithPassword(password: string): Promise<CryptoKey | null> {
  const key = await requestKey(password);
  if (key) {
    try {
      localStorage.setItem(PASSWORD_KEY, password);
    } catch {
      // 残せなくてもこの回は使える
    }
  }
  return key;
}

/** ファイルの形は「IV 12バイト + AES-GCM の暗号文」 */
async function fetchDecrypted(key: CryptoKey, file: string): Promise<ArrayBuffer> {
  const res = await fetch(`${BASE}/lessons/${file}`);
  if (!res.ok) throw new Error("教材のデータを取得できませんでした");
  const buf = new Uint8Array(await res.arrayBuffer());
  return crypto.subtle.decrypt(
    { name: "AES-GCM", iv: buf.subarray(0, 12) as BufferSource },
    key,
    buf.subarray(12) as BufferSource
  );
}

export async function loadManifest(key: CryptoKey): Promise<Manifest> {
  const plain = await fetchDecrypted(key, "manifest.bin");
  return JSON.parse(new TextDecoder().decode(plain)) as Manifest;
}

/** 復号した音声を Blob URL にして返す。使い終わったら revokeObjectURL すること */
export async function loadAudioUrl(key: CryptoKey, trackId: string): Promise<string> {
  const plain = await fetchDecrypted(key, `${trackId}.bin`);
  return URL.createObjectURL(new Blob([plain], { type: "audio/mpeg" }));
}
