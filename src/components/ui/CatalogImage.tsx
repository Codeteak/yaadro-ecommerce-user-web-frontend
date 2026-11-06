import Image, { type ImageProps } from "next/image";

const ALLOWED_HOSTS = ["media.yaadro.online", "amazonaws.com", "gstatic.com"];

function allowedRemote(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const host = new URL(src).hostname;
    return ALLOWED_HOSTS.some(
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
 */
export function CatalogImage({ src, alt, className, fill, style, ...rest }: CatalogImageProps) {
  if (!allowedRemote(src)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        style={style}
        className={
          fill
            ? `absolute inset-0 h-full w-full ${className ?? ""}`
            : className
        }
      />
    );
  }

  return <Image src={src} alt={alt} className={className} fill={fill} style={style} {...rest} />;
}
