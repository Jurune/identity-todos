import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "身份待办",
  description: "AI 帮你规划每一天",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full bg-gray-50">{children}</body>
    </html>
  );
}
