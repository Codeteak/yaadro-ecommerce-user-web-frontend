import Image, { type ImageProps } from "next/image";

/** Hosts that next/image can fetch server-side. gstatic Shopping thumbs often
 *  block the optimizer, so those load with a plain img in the browser. */
const OPTIMIZED_HOSTS = ["media.yaadro.online", "amazonaws.com"];

function useOptimizedImage(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    return OPTIMIZED_HOSTS.some(
      (allowed) => host === allowed || host.endsWith(`.${allowed}`),
    );
  } catch {
    return false;
  }
}

type CatalogImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string;
  alt: string;
};

/**
 * next/image for shop media we allowlisted, plain img for other catalog CDNs
 * so a new image host does not crash the product card.
 * Plain path still forwards width/height so the browser reserves space (CLS).
 */
export function CatalogImage({
  src,
  alt,
  className,
  fill,
  style,
  priority,
  loading,
  width,
  height,
  ...rest
}: CatalogImageProps) {
  if (!useOptimizedImage(src)) {
    const widthAttr =
      typeof width === "number"
        ? width
        : typeof width === "string" && /^\d+$/.test(width)
          ? Number(width)
          : undefined;
    const heightAttr =
      typeof height === "number"
        ? height
        : typeof height === "string" && /^\d+$/.test(height)
          ? Number(height)
          : undefined;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={fill ? undefined : widthAttr}
        height={fill ? undefined : heightAttr}
        style={style}
        loading={priority ? "eager" : loading === "lazy" ? "lazy" : undefined}
        fetchPriority={priority ? "high" : undefined}
        decoding="async"
        className={
          fill
            ? `absolute inset-0 h-full w-full ${className ?? ""}`
            : className
        }
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      fill={fill}
      style={style}
      priority={priority}
      loading={loading}
      width={width}
      height={height}
      {...rest}
    />
  );
}
