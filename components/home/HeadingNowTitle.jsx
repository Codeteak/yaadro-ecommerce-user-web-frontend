'use client';

const NUM_FACE =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/**
 * HeadingNow trial font replaces digit glyphs with "TRIAL ONLY" watermarks,
 * and its % glyph is oversized / mismatched. Keep HeadingNow for letters;
 * render numbers and % in a normal sans so offer titles stay clean.
 */
export default function HeadingNowTitle({
  as: Tag = 'h2',
  className,
  children,
}) {
  const text = children == null ? '' : String(children);
  // Keep "10%" (or bare "%") as one run so digits and percent share the same face.
  const parts = text.split(/(\d+%?|%)/);

  return (
    <Tag className={className}>
      {parts.map((part, i) =>
        /^\d+%?$|^%$/.test(part) ? (
          <span
            key={i}
            className="font-sans font-extrabold tracking-tight"
            style={{ fontFamily: NUM_FACE }}
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </Tag>
  );
}
