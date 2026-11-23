/**
 * 教材音声の鍵を配る。
 *
 * 音声と原稿は暗号化した状態で GitHub Pages に置いてある。鍵はここにしか無く、
 * 次のどちらかのときだけ返す。それ以外には 403 を返し、理由も中身も出さない。
 *   - 許可した IP から来た（GET）
 *   - 正しいパスワードを送ってきた（POST。本文は {"password": "..."}）
 * パスワードは secret の LESSON_PASSWORD。未設定ならパスワードでは入れない。
 */

/** 長さや一致位置が応答時間に出ないよう、ハッシュどうしを比べる */
async function samePassword(given, expected) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(given)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

/** IPv6 を 8 つの 16bit 値に展開する。IPv4 や不正な文字列は null */
function parseV6(text) {
  if (!text.includes(":")) return null;
  const [head, tail] = text.split("::");
  if (text.split("::").length > 2) return null;
  const h = head ? head.split(":") : [];
  const t = tail !== undefined && tail !== "" ? tail.split(":") : [];
  const fill = tail === undefined ? 0 : 8 - h.length - t.length;
  if (fill < 0 || (tail === undefined && h.length !== 8)) return null;
  const parts = [...h, ...new Array(fill).fill("0"), ...t].map((p) =>
    parseInt(p, 16)
  );
  if (parts.length !== 8 || parts.some((n) => !(n >= 0 && n <= 0xffff))) {
    return null;
  }
  return parts;
}

function matches(ip, rule) {
  const [base, bitsText] = rule.split("/");
  const a = parseV6(ip);
  const b = parseV6(base);
  if (a === null || b === null) {
    // IPv4 は完全一致だけを見る
    return bitsText === undefined && ip === base;
  }
  const bits = bitsText === undefined ? 128 : Number(bitsText);
  if (!(bits >= 0 && bits <= 128)) return false;
  for (let i = 0; i < 8; i++) {
    const take = Math.min(16, Math.max(0, bits - i * 16));
    if (take === 0) break;
    const mask = (0xffff << (16 - take)) & 0xffff;
    if ((a[i] & mask) !== (b[i] & mask)) return false;
  }
  return true;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const allowedOrigins = (env.ALLOWED_ORIGINS ?? "").split(",");
    const headers = {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      Vary: "Origin",
    };
    if (allowedOrigins.includes(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
    }

    if (request.method === "OPTIONS") {
      headers["Access-Control-Allow-Methods"] = "GET, POST";
      headers["Access-Control-Allow-Headers"] = "Content-Type";
      headers["Access-Control-Max-Age"] = "86400";
      return new Response(null, { status: 204, headers });
    }

    let ok = false;
    if (request.method === "GET") {
      const ip = request.headers.get("CF-Connecting-IP") ?? "";
      const rules = (env.ALLOWED_IPS ?? "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      ok = ip !== "" && rules.some((r) => matches(ip, r));
    } else if (request.method === "POST") {
      let given = "";
      try {
        const body = await request.json();
        if (typeof body?.password === "string") given = body.password.slice(0, 200);
      } catch {
        // 本文が読めなければ不一致として扱う
      }
      ok =
        !!env.LESSON_PASSWORD &&
        given !== "" &&
        (await samePassword(given, env.LESSON_PASSWORD));
      // 総当たりを遅くする
      if (!ok) await new Promise((r) => setTimeout(r, 1000));
    } else {
      return new Response("{}", { status: 405, headers });
    }

    if (!ok || !env.LESSON_KEY) {
      return new Response(JSON.stringify({ ok: false }), { status: 403, headers });
    }
    return new Response(JSON.stringify({ ok: true, key: env.LESSON_KEY }), {
      headers,
    });
  },
};
