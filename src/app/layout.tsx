import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { getViewer } from "@/lib/server/viewer";
import { Syne } from "next/font/google";

const syne = Syne({ subsets: ["latin"], weight: ["800"], variable: "--font-syne" });

export const metadata: Metadata = {
  title: "UNI-X | University Xplore",
  description:
    "The next-gen social platform for university students. Connect, collaborate, and explore your campus life with UNI-X.",
  keywords: ["university", "students", "social", "campus", "community", "events", "clubs"],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  openGraph: {
    title: "UNI-X | University Xplore",
    description: "Connect. Collaborate. Xplore.",
    type: "website",
    images: [{ url: "/logo.svg", width: 1200, height: 630 }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewer = await getViewer();

  return (
    <html lang="en" className={`dark ${syne.variable}`}>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </head>
      <body className="antialiased">
        <AppProviders initialUser={viewer.user} initialProfile={viewer.profile}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

