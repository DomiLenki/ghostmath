import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOMYX AI — Make room for brilliant ideas",
  description: "Your personal AI workspace for conversations, creative work and custom AI agents.",
  applicationName: "DOMYX AI",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#090a0f" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
