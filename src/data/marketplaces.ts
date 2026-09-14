import type { IconType } from "react-icons";
import { FaStore } from "react-icons/fa6";
import { SiInstagram, SiShopee, SiWhatsapp } from "react-icons/si";

export interface Marketplace {
  id: string;
  name: string;
  handle: string;
  href: string;
  Icon: IconType;
  chip: string;
  brandText: string;
}

/** Official ISAK Billiard Co. channels — marketplace-first (Shopee & Tokopedia). */
export const MARKETPLACES: Marketplace[] = [
  {
    id: "shopee",
    name: "Shopee",
    handle: "ISAK Billiard Co. Official Store",
    href: "https://shopee.co.id/",
    Icon: SiShopee,
    chip: "bg-shopee text-white",
    brandText: "bg-shopee/10 text-shopee ring-shopee/30",
  },
  {
    id: "tokopedia",
    name: "Tokopedia",
    handle: "ISAK Billiard Co. Official Store",
    href: "https://www.tokopedia.com/",
    Icon: FaStore,
    chip: "bg-tokopedia text-white",
    brandText: "bg-tokopedia/10 text-tokopedia ring-tokopedia/30",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    handle: "fastest reply · 09.00–21.00 WIB",
    href: "https://wa.me/6281234567890",
    Icon: SiWhatsapp,
    chip: "bg-[#25d366] text-white",
    brandText: "bg-[#25d366]/10 text-[#128c7e] ring-[#25d366]/30",
  },
  {
    id: "instagram",
    name: "Instagram",
    handle: "@isakbilliard.co",
    href: "https://www.instagram.com/",
    Icon: SiInstagram,
    chip:
      "bg-gradient-to-br from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white",
    brandText: "bg-[#ee2a7b]/10 text-[#c13584] ring-[#ee2a7b]/30",
  },
];