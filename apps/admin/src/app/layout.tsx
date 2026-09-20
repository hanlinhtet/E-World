import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'E-World · Admin',
  description: 'Operations dashboard for E-World.',
};

const NAV = [
  'Players', 'NPCs', 'Monsters', 'World', 'Items', 'Resources', 'Quests',
  'Recipes', 'Maps', 'Weather', 'Economy', 'Analytics', 'Live Players',
  'Server Health', 'Announcements', 'Events', 'Bans', 'Moderation',
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <aside className="w-56 shrink-0 border-r border-white/10 bg-white/5 p-4">
            <div className="mb-6 text-lg font-bold">E-World Admin</div>
            <nav className="flex flex-col gap-1 text-sm">
              {NAV.map((item) => (
                <span
                  key={item}
                  className="cursor-pointer rounded-lg px-3 py-2 text-white/70 hover:bg-white/10 hover:text-white"
                >
                  {item}
                </span>
              ))}
            </nav>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
