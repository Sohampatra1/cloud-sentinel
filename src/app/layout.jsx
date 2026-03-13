import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata = {
  title: 'CloudSentinel — AI-Powered CSPM',
  description: 'Cloud Security Posture Management with AI-driven attack path analysis',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} min-h-screen bg-[#0a0e1a] text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}
