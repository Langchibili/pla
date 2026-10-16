import Providers from '@/components/Providers';
import './globals.css';
export const metadata = { title: 'Pro League Africa', description: 'Own a club. Play the league.' };
export const viewport = {
    width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, viewportFit: 'cover', themeColor: '#07110b',
};
export default function RootLayout({ children }) {
    return (<html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>);
}
