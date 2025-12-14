import NextImage, { ImageProps } from "next/image";

function getProxySrc(src: string) {
  if (src.startsWith("https://lh3.googleusercontent.com/")) {
    return `/api/proxy-google-image?url=${encodeURIComponent(src)}`;
  }
  return src;
}

export function ProfileImage(props: ImageProps) {
  return (
    <NextImage
      {...props}
      src={getProxySrc(props.src as string)}
      width={28}
      height={28}
      alt={props.alt || "Profile"}
      className={props.className || "h-7 w-7 rounded-full object-cover border border-muted"}
      unoptimized
    />
  );
}
