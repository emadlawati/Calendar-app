import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Karla } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import ThemeProvider from "@/components/ThemeProvider";

// Display / content nouns — titles, entries, quotes.
const cormorant = Cormorant_Garamond({
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-display",
});

// UI, labels, numbers.
const karla = Karla({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ui",
});

export const metadata: Metadata = {
  title: "Our Calendar",
  description: "A private library of days kept together.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Our Calendar",
  },
};

export const viewport: Viewport = {
  themeColor: "#3F5136",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark-roast")document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${cormorant.variable} ${karla.variable}`}>
        <ThemeProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
