import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";

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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
