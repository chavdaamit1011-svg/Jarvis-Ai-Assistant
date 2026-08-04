import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/context/theme-context';
import { ChatProvider } from '@/context/chat-context';
import { SettingsModal } from '@/components/settings/settings-modal';

export const metadata: Metadata = {
  title: 'Jarvis AI • Stark Assistant Core',
  description: 'Production-ready enterprise AI Assistant frontend powered by Next.js 15.',
  keywords: ['Jarvis AI', 'Ultron', 'Iron Man', 'AI Assistant', 'Stark Industries', 'Next.js', 'TypeScript', 'Tailwind CSS'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] select-none">
        <ThemeProvider>
          <ChatProvider>
            {children}
            <SettingsModal />
          </ChatProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
