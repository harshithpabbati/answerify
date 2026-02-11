/**
 * Cloudflare Image Loader
 * Optimizes images using Cloudflare's CDN
 * https://developers.cloudflare.com/images/
 */

export default function cloudflareImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}) {
  // If the image is already from a CDN or external source, return as-is
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return src;
  }

  // For local images, use Cloudflare Image Resizing
  // Format: /cdn-cgi/image/width=<width>,quality=<quality>,format=auto/<src>
  const params = [`width=${width}`, `quality=${quality || 75}`, 'format=auto'];

  return `/cdn-cgi/image/${params.join(',')}${src}`;
}
