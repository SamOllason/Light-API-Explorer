import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Light Faux SDK Demo',
  description: 'Demo application for the Light Faux SDK',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
