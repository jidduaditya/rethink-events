import type { Metadata } from "next";
import { Source_Serif_4 } from "next/font/google";
import { Providers } from "@/lib/providers";
import "./globals.css";

// ponytail: single typeface system — Source Serif 4 only, full weight range per typography spec
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
  variable: "--font-source-serif",
});

export const metadata: Metadata = {
  title: "RETHINK EVENTS",
  description:
    "The centralized visibility layer for the Rethink ecosystem. Events, meetups, hackathons, workshops.",
};

// Inline script to prevent theme flash on load.
// Reads localStorage before React hydrates.
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (t === 'auto' || !t) {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sourceSerif.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
