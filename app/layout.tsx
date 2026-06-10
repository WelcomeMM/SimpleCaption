import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SimpleCaption — Free Animated Captions',
  description: 'Add word-by-word animated captions to your videos. Free, no watermark, no limits.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
