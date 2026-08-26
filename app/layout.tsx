import type { Metadata } from "next";
import "./globals.css";

/**
 * Cloudflare Web Analytics のサイトトークン。
 * 未設定なら計測スクリプトを一切読み込まない（開発中やフォーク時に勝手に計測しないため）。
 * Cookie も localStorage も使わず個人データを保存しないため、同意バナーは不要。
 */
const CF_BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN ?? "";

export const metadata: Metadata = {
  title: "ディクテーション",
  description: "ネイティブの自然な英語を聞き取って書き取り、聞き取れなかった原因を確かめる練習",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {children}
        {/*
          next/script ではなく素の script タグを使う。next/script はタグを
          クライアント側で生成するため、beacon が読む data-cf-beacon 属性が
          静的 HTML に現れない。属性は Cloudflare が配布するスニペットに揃えてある
          （type="module" は defer と同じく解析をブロックしない）。
        */}
        {CF_BEACON_TOKEN !== "" && (
          <script
            type="module"
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}
          />
        )}
      </body>
    </html>
  );
}
