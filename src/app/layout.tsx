import type { Metadata } from "next";
import { Nunito_Sans, Open_Sans } from 'next/font/google';
import "./globals.css";
import "../styles/main.scss";

const nunito = Nunito_Sans({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '600', '700'],
  variable: '--font-nunito',
});

const openSans = Open_Sans({
  subsets: ['cyrillic', 'latin'],
  weight: ['400', '600', '700'],
  variable: '--font-open-sans',
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${openSans.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
