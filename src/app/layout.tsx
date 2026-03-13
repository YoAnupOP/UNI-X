import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { getViewer } from "@/lib/server/viewer";

export const metadata: Metadata = {
  title: "UNI-X | University Xplore",
  description:
    "The next-gen social platform for university students. Connect, collaborate, and explore your campus life with UNI-X.",
  keywords: ["university", "students", "social", "campus", "community", "events", "clubs"],
  openGraph: {
    title: "UNI-X | University Xplore",
    description: "Connect. Collaborate. Xplore.",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const viewer = await getViewer();

  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <AppProviders initialUser={viewer.user} initialProfile={viewer.profile}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

