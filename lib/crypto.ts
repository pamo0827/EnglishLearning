/**
 * 問題データの難読化。サーバー・ブラウザのどちらでも動く。
 *
 * 【この暗号化が守るもの / 守らないもの】
 * 静的サイトでは採点をブラウザで行うため、正解英文は最終的に端末へ届く。
 * これは原理的に避けられない。ここでの暗号化が防ぐのは次まで:
 *   - DevTools の Network タブや view-source で正解が「うっかり目に入る」こと
 *   - public/data/enc/*.json を直接開いて読まれること
 * 逆に、コンソールから復号関数を呼べば取り出せる。意図的に覗く人は止められない。
 * 「原理的に不可能」ではなく「意図的な手間をかけないと読めない」水準である。
 */

/** 鍵導出に使う定数。クライアントバンドルにも含まれる（上記の但し書きのとおり） */
const SALT = "english-listening/v1/answer-obfuscation";
/**
 * 反復回数は少なめでよい。PBKDF2 の反復が効くのは「秘密のパスワードを総当たりされる」
 * 場面だが、ここでは鍵の材料がバンドル内にあり誰でも読める。反復を増やしても安全性は
 * 1ミリも上がらず、端末（特にスマホ）での待ち時間が延びるだけになる。
 */
const ITERATIONS = 10_000;

const enc = new TextEncoder();
const dec = new TextDecoder();

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c?.subtle) {
    throw new Error("WebCrypto が利用できません");
  }
  return c.subtle;
}

/** 問題ごとに異なる鍵を導出する。1問の鍵が漏れても他問には波及しない */
async function deriveKey(questionId: number): Promise<CryptoKey> {
  const base = await subtle().importKey(
    "raw",
    enc.encode(`${SALT}|${questionId}`),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return subtle().deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(SALT),
      iterations: ITERATIONS,
      hash: "SHA-256",
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromBase64(text: string): Uint8Array {
  const s = atob(text);
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}

export type Sealed = { iv: string; data: string };

export async function seal(questionId: number, payload: unknown): Promise<Sealed> {
  const key = await deriveKey(questionId);
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cipher = await subtle().encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(payload))
  );
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(cipher)) };
}

export async function unseal<T>(questionId: number, sealed: Sealed): Promise<T> {
  const key = await deriveKey(questionId);
  const plain = await subtle().decrypt(
    { name: "AES-GCM", iv: fromBase64(sealed.iv) as BufferSource },
    key,
    fromBase64(sealed.data) as BufferSource
  );
  return JSON.parse(dec.decode(plain)) as T;
}
