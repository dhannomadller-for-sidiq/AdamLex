import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AdamLex | Premium Legal CRM',
  description: 'Advanced lead tracking and case management for modern law firms.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg-main)] selection:bg-[var(--accent-gold)] selection:text-[#090c15]">
        {/* Background ambient glow effects for high-end feel */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[var(--accent-glow)] blur-[120px] opacity-50"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-[rgba(31,41,55,0.8)] blur-[100px] opacity-50"></div>
        </div>

        <main className="relative flex flex-col min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
