import { useMemo } from "react";

/**
 * Responsive video embed for product Media/posts.
 * - YouTube / Vimeo links → privacy-friendly iframe embed.
 * - .mp4 / .webm / .ogg / data:video... → native <video> player.
 */
export default function VideoEmbed({ url, title, className = "" }: { url: string; title?: string; className?: string }) {
  const parsed = useMemo(() => {
    if (!url) return null;

    // YouTube — watch, shorts, youtu.be, or already an embed.
    const ytWatch = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
    if (ytWatch) {
      return { kind: "iframe" as const, src: `https://www.youtube-nocookie.com/embed/${ytWatch[1]}` };
    }

    // Vimeo
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeo) {
      return { kind: "iframe" as const, src: `https://player.vimeo.com/video/${vimeo[1]}` };
    }

    // Direct video file
    if (/\.(mp4|webm|ogg|ogv|m4v)(\?.*)?$/i.test(url) || url.startsWith("data:video/") || url.startsWith("blob:")) {
      return { kind: "video" as const, src: url };
    }

    return null;
  }, [url]);

  if (!parsed) return null;

  const frame = (
    <div className={`aspect-video w-full overflow-hidden rounded-2xl border border-border bg-primary-950 shadow-soft ${className}`}>
      {parsed.kind === "iframe" ? (
        <iframe
          src={parsed.src}
          title={title ?? "Video"}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <video src={parsed.src} controls preload="metadata" className="h-full w-full bg-black">
          <p className="sr-only">{title ?? "Video"}</p>
        </video>
      )}
    </div>
  );
  return frame;
}