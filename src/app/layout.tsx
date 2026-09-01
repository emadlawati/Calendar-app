import type { Metadata, Viewport } from "next";
import {
  Cormorant_Garamond, Karla,
  Bricolage_Grotesque, DM_Mono,
  Marcellus, Space_Grotesk,
} from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import ThemeProvider from "@/components/ThemeProvider";
import LedgerDueProvider from "@/components/LedgerDueProvider";

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

/**
 * The other two themes' faces.
 *
 * All six are declared here, but a browser only downloads the faces the page
 * actually renders text in — and only one theme's pair is ever referenced at
 * a time, because --font-display and --font-ui are re-pointed per theme in
 * globals.css. So the cost is one pair, not three.
 */

// Coffee & Matcha — sign-painted, friendly. No italic exists in this family.
const bricolage = Bricolage_Grotesque({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-coffee-display",
});
// Every small line in that theme is monospaced, like a receipt.
const dmMono = DM_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-coffee-ui",
});

// Observatory — engraved, one weight only.
const marcellus = Marcellus({
  weight: ["400"],
  subsets: ["latin"],
  variable: "--font-sky-display",
});
const spaceGrotesk = Space_Grotesk({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-sky-ui",
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
    <html
      lang="en"
      suppressHydrationWarning
      className={[
        cormorant.variable, karla.variable,
        bricolage.variable, dmMono.variable,
        marcellus.variable, spaceGrotesk.variable,
      ].join(" ")}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme-id");if(t==="coffee"||t==="observatory"||t==="reading-room")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <SessionProvider>
            {/* Inside the session, so the count is never fetched signed-out. */}
            <LedgerDueProvider>
              {children}
            </LedgerDueProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
