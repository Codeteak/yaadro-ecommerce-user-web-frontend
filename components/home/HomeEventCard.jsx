'use client';

import Link from 'next/link';
import { formatEventDateRange } from '../../utils/homeSectionsApi';

export default function HomeEventCard({ section }) {
  if (!section?.id) return null;

  const dateLabel = formatEventDateRange(section.startsAt, section.endsAt);
  const cover = section.coverImageUrl || '';
  const href = `/events?id=${encodeURIComponent(section.id)}`;

  return (
    <section className="px-3 sm:px-6 md:px-8 py-3 sm:py-4">
      <Link
        href={href}
        className="relative block overflow-hidden rounded-[28px] min-h-[168px] sm:min-h-[200px] shadow-[0_12px_32px_rgba(88,28,135,0.18)] active:scale-[0.99] transition-transform"
        aria-label={section.title || 'Event'}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div
          className={`absolute inset-0 ${
            cover
              ? 'bg-gradient-to-r from-[#4c1d95]/92 via-[#6d28d9]/78 to-[#7c3aed]/40'
              : 'event-theme-wash'
          }`}
          aria-hidden
        />
        <div className="relative z-10 flex h-full min-h-[168px] sm:min-h-[200px] flex-col justify-between p-5 sm:p-7">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-violet-100/90">
              Event
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-headingnow leading-tight">
              {section.title || 'Event'}
            </h2>
            {dateLabel ? (
              <p className="mt-2 text-sm font-medium text-violet-100">{dateLabel}</p>
            ) : null}
          </div>
          <span className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/25">
            Shop event
            <span aria-hidden>→</span>
          </span>
        </div>
      </Link>
    </section>
  );
}
