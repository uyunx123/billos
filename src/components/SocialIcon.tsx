import type { IconType } from "react-icons";
import {
  SiFacebook,
  SiInstagram,
  SiShopee,
  SiTiktok,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "react-icons/si";
import { FaStore } from "react-icons/fa6";
import { Globe } from "lucide-react";
import type { SocialPlatform } from "../context/ConfigContext";

const SIMPLE_ICONS: Partial<Record<SocialPlatform, IconType>> = {
  instagram: SiInstagram,
  tiktok: SiTiktok,
  youtube: SiYoutube,
  facebook: SiFacebook,
  x: SiX,
  whatsapp: SiWhatsapp,
  shopee: SiShopee,
};

/**
 * Renders the brand icon for a social platform. `lucide-react` no longer ships
 * brand logos, so simple-icons (react-icons/si) are used; Tokopedia falls back
 * to Font Awesome 6, and anything unknown renders a generic globe.
 */
export function SocialPlatformIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const Icon = SIMPLE_ICONS[platform];
  if (Icon) return <Icon className={className} aria-hidden="true" />;
  if (platform === "tokopedia") return <FaStore className={className} aria-hidden="true" />;
  return <Globe className={className} aria-hidden="true" />;
}

export default SocialPlatformIcon;