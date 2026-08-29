'use client';

/**
 * @param {{
 *   title: string,
 *   description?: string,
 *   actionLabel?: string,
 *   onAction?: () => void,
 *   className?: string,
 * }} props
 */
export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-4 py-8 text-center ${className}`}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <svg
          className="h-6 w-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m8-5v8"
          />
        </svg>
      </div>
      <p className="mb-1 text-sm font-medium text-gray-700">{title}</p>
      {description && <p className="mb-5 text-xs text-gray-400">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-medium text-violet-600 transition hover:text-violet-800"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
