/**
 * 教材音声の鍵を配る。
 *
 * 音声と原稿は暗号化した状態で GitHub Pages に置いてある。鍵はここにしか無く、
 * 正しいパスワードを送ってきたときだけ返す（POST。本文は {"password": "..."}）。
 * それ以外には 403 を返し、理由も中身も出さない。
 * パスワードは secret の LESSON_PASSWORD。未設定なら誰も入れない。
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
      headers["Access-Control-Allow-Methods"] = "POST";
      headers["Access-Control-Allow-Headers"] = "Content-Type";
      headers["Access-Control-Max-Age"] = "86400";
      return new Response(null, { status: 204, headers });
    }

    let ok = false;
    if (request.method === "POST") {
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
