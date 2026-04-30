'use client';

import Link from 'next/link';
import { toExportedHref } from '../utils/toExportedHref';

export default function ExportLink({ href, ...props }) {
  if (typeof href === 'string') {
    return <Link href={toExportedHref(href)} {...props} />;
  }

  if (href && typeof href === 'object' && 'pathname' in href) {
    return <Link href={{ ...href, pathname: toExportedHref(href.pathname) }} {...props} />;
  }

  return <Link href={href} {...props} />;
}

