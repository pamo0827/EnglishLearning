/**
 * オフライン用のサービスワーカー。
 *
 * 章の音声と問題データは、画面側の「オフライン用に保存」で chapter-<id>-v1 という
 * キャッシュへ入る。ここではその中身を配信し、加えてアプリ本体（HTML と JS）を
 * 訪問時に控えておくことで、電波が無くても起動できるようにする。
 */
const SHELL_CACHE = "shell-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 古い世代のシェルキャッシュを片付ける（章のキャッシュは消さない）
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("shell-") && n !== SHELL_CACHE)
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

/** 章のキャッシュを含め、どこかに保存済みなら取り出す */
async function findInCaches(request) {
  const hit = await caches.match(request, { ignoreSearch: true });
  return hit ?? null;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isContent =
    url.pathname.includes("/audio/") || url.pathname.includes("/data/");

  if (isContent) {
    // 音声と問題データは保存済みを最優先する。通信を待たずに再生できる。
    event.respondWith(
      (async () => {
        const cached = await findInCaches(request);
        if (cached) return cached;
        return fetch(request);
      })()
    );
    return;
  }

  // アプリ本体は通信を優先し、取れたら控えておく。オフラインでは控えを使う。
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        const cached = await findInCaches(request);
        if (cached) return cached;
        throw new Error("offline and not cached");
      }
    })()
  );
});
