import Link from 'next/link';
import { ClayIcon, type ClayIconName } from '@pinpoint/ui';

export function ComingSoon({ icon, title, body, milestone }: { icon: ClayIconName; title: string; body: string; milestone: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="clay flex max-w-lg flex-col items-center p-10 text-center" data-elev="3" style={{ borderRadius: 'var(--radius-xl)' }}>
        <div style={{ rotate: '-6deg' }}>
          <ClayIcon name={icon} size={120} />
        </div>
        <span className="mt-7 pill-accent rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ">
          {milestone}
        </span>
        <h1 className="mt-3 text-3xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 text-balance font-semibold leading-relaxed text-[var(--ink-2)]">{body}</p>
        <Link href="/" className="clay-tint tint-accent clay-focus mt-7 inline-flex h-12 items-center rounded-full px-6 font-bold">
          Back to all modes
        </Link>
      </div>
    </div>
  );
}
