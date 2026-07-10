import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prelegal — AI-drafted legal agreements",
  description:
    "Draft common legal agreements with an AI assistant. Sign in, chat to build "
    + "NDAs, service agreements, DPAs and more, then save and download them.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
