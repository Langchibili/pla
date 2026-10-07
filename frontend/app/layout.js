import { Bricolage_Grotesque } from 'next/font/google';
import { Suspense } from 'react';
import ThemeRegistry from '@/components/ThemeRegistry';
import AppShell from '@/components/AppShell';

const font = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', weight: ['400', '500', '600', '700', '800'] });

export const metadata = { title: 'ProLeague Africa', description: 'Compete. Win. Rise.', manifest: '/manifest.json', appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'ProLeague' } };
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#07100A' };

export default function RootLayout({ children }) {
  return (
    <html lang="en"><body className={font.className}>
      <ThemeRegistry fontFamily={font.style.fontFamily}>
        <Suspense fallback={<div style={{ minHeight: '100dvh' }} />}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </ThemeRegistry>
    </body></html>
  );
}
