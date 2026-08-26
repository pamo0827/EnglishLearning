import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Listening Trainer",
  description: "ネイティブの自然な英語を聞き取って入力し、AIに採点させるリスニング練習",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
