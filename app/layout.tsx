import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";

export const metadata: Metadata = {
  title: "Notedee - Practice Tool for Violin Students",
  description: "Listen, analyze, and improve your violin practice",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <main className="min-h-screen bg-background">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
