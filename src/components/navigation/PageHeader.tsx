import type { ReactNode } from "react";
import { BackButton } from "./BackButton";

type PageHeaderProps = {
  /** Back target. Omit when using `onBackClick`. */
  backHref?: string;
  onBackClick?: () => void;
  backLabel?: string;
  /** Centered title text. Ignored when `center` is given. */
  title?: string;
  /** Custom centered content (e.g. the brand logo on Login). */
  center?: ReactNode;
};

/**
 * One header pattern for every page so the back button always lands in the
 * same place: first item of an `h-11` row inside the page's `px-5` container
 * with `pt-[max(1rem,env(safe-area-inset-top))]` on that container.
 */
export function PageHeader({
  backHref,
  onBackClick,
  backLabel,
  title,
  center,
}: PageHeaderProps) {
  return (
    <header className="relative flex h-11 shrink-0 items-center">
      <BackButton href={backHref} onClick={onBackClick} label={backLabel} />
      {center ? (
        <div className="absolute left-1/2 -translate-x-1/2">{center}</div>
      ) : title ? (
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-bold tracking-tight whitespace-nowrap text-forest">
          {title}
        </h1>
      ) : null}
      <span className="ml-auto size-11" aria-hidden />
    </header>
  );
}
