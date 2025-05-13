import '../styles/globals.css';
import '../styles/dashboard.css';
import '@livekit/components-styles';
import '@livekit/components-styles/prefabs';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'meeting application',
    template: '%s',
  },
  description: "",
  twitter: {
    creator: '@livekitted',
    site: '@livekitted',
    card: 'summary_large_image',
  },
  icons: {
    icon: {
      rel: 'icon',
      url: '/favicon.ico',
    },
  },
};

// Updated viewport settings with better defaults for scrolling
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#070707',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ height: 'auto', overflowY: 'auto' }}>
      <head>
        {/* Additional meta tag for better mobile handling */}
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body style={{ height: 'auto', overflowY: 'auto' }}>{children}</body>
    </html>
  );
}