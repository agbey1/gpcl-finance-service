import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GPCL Finance Service | Ghana Publishing Company Limited",
  description: "Financial Management and ERP System for Ghana Publishing Company Limited (GPCL)",
  icons: {
    icon: "/logo.jpg",
    shortcut: "/logo.jpg",
    apple: "/logo.jpg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="icon" href="/logo.jpg" type="image/jpeg" />
        <link rel="shortcut icon" href="/logo.jpg" type="image/jpeg" />
        <link rel="apple-touch-icon" href="/logo.jpg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('gpcl_theme');
                  if (saved === 'dark' || saved === 'light') {
                    document.documentElement.setAttribute('data-theme', saved);
                  }
                } catch(e) {}

                // Guard against browser extension / DevTools performance telemetry errors
                try {
                  if (typeof window !== 'undefined' && window.performance) {
                    var origGetEntriesByType = window.performance.getEntriesByType;
                    if (origGetEntriesByType) {
                      window.performance.getEntriesByType = function(type) {
                        var entries = origGetEntriesByType.call(window.performance, type) || [];
                        return entries.filter(function(e) { return e && typeof e.startTime !== 'undefined'; });
                      };
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
