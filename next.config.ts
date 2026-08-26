import path from "node:path";
import type { NextConfig } from "next";

/**
 * GitHub Pages のプロジェクトページは https://<user>.github.io/<repo>/ に置かれるため、
 * basePath を repo 名に合わせる必要がある。GitHub Actions 側で自動的に渡している。
 * ルートドメインや独自ドメインで配信する場合は空のままでよい。
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // 完全な静的サイトとして書き出す（GitHub Pages にはサーバーが無い）
  output: "export",
  basePath,
  // GitHub Pages は /foo を /foo/index.html として配信するため
  trailingSlash: true,
  images: { unoptimized: true },

  // ホームディレクトリにも package-lock.json があるため、Next.js が
  // ワークスペースのルートを ~ と誤検出する。このプロジェクトに固定する。
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
