'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ClayIcon, Dock, TabBar, type DockItem } from '@pinpoint/ui';
import { useFocusMode } from '@/lib/focus';
import { useSettings } from '@/lib/settings';
import { Header } from './Header';
import { Palette } from './Palette';
import { RewardWatcher } from './RewardWatcher';
import { Tour } from './Tour';
import { WorldBackdrop } from './WorldBackdrop';

const DOCK: DockItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: <ClayIcon name="home" /> },
  { id: 'party', label: 'Party', href: '/party', icon: <ClayIcon name="party" /> },
  { id: 'explore', label: 'Explore', href: '/explore', icon: <ClayIcon name="explore" /> },
  // the passport is the player's profile
  { id: 'passport', label: 'Passport', href: '/passport', icon: <ClayIcon name="passport" /> },
  { id: 'leaderboard', label: 'Leaderboard', href: '/leaderboard', icon: <ClayIcon name="trophy" /> },
  { id: 'play', label: 'Games', href: '/play', icon: <ClayIcon name="play" /> },
];

// phones: five tabs fit comfortably, leaderboard stays reachable from Games and the home grid
const TABS: DockItem[] = [
  { id: 'home', label: 'Home', href: '/', icon: <ClayIcon name="home" /> },
  { id: 'party', label: 'Party', href: '/party', icon: <ClayIcon name="party" /> },
  { id: 'explore', label: 'Explore', href: '/explore', icon: <ClayIcon name="explore" /> },
  { id: 'passport', label: 'Passport', href: '/passport', icon: <ClayIcon name="passport" /> },
  { id: 'play', label: 'Games', href: '/play', icon: <ClayIcon name="play" /> },
];

function activeIdFor(path: string) {
  if (path === '/') return 'home';
  const exact = DOCK.find((d) => d.href !== '/' && path === d.href);
  if (exact) return exact.id;
  return DOCK.find((d) => d.href !== '/' && path.startsWith(d.href))?.id;
}

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const dockPosition = useSettings((s) => s.dockPosition);
  // settings come from browser storage: render the default until hydrated
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const pos = hydrated ? dockPosition : 'bottom';
  const active = activeIdFor(path);
  // during a game the app chrome steps aside so the game is its own screen
  const focus = useFocusMode((s) => s.focus);

  return (
    <>
      <div className="clay-wallpaper" aria-hidden />
      {!path.startsWith('/explore') && !focus && <WorldBackdrop />}
      <a href="#main" className="clay sr-only z-50 px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4">
        Skip to content
      </a>
      {!focus && <Header />}
      <main
        id="main"
        className={`mx-auto w-full max-w-6xl px-4 pb-32 pt-24 sm:px-6 md:pb-36 ${pos === 'left' ? 'md:pl-32 md:pb-16' : ''}`}
      >
        {children}
      </main>
      {!focus && <Dock items={DOCK} activeId={active} position={pos} Link={Link} />}
      {!focus && <TabBar items={TABS} activeId={active === 'guess-flag' || active === 'pin-drop' ? 'play' : active} Link={Link} />}
      <Palette />
      <Tour />
      <RewardWatcher />
    </>
  );
}
