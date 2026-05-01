import type { Metadata } from "next";
import { Sniglet, Quicksand } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/components/UserProvider";

const sniglet = Sniglet({
  weight: ["400", "800"],
  subsets: ["latin"],
  variable: "--font-sniglet",
});

const quicksand = Quicksand({
  subsets: ["latin"],
  variable: "--font-quicksand",
});

export const metadata: Metadata = {
  title: "Purrfect Plans - Couple's Calendar",
  description: "A cute calendar for planning dates together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${sniglet.variable} ${quicksand.variable} font-quicksand bg-milk-white text-text-dark antialiased`}>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
