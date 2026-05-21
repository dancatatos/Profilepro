import {
  FaFacebookF,
  FaInstagram,
  FaTiktok,
  FaYoutube,
  FaTelegram,
  FaWhatsapp,
  FaFacebookMessenger,
  FaXTwitter,
  FaLinkedinIn,
  FaGlobe,
} from "react-icons/fa6";
import type { IconType } from "react-icons";
import type { SocialPlatform } from "@/types";

const MAP: Record<SocialPlatform, IconType> = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  youtube: FaYoutube,
  telegram: FaTelegram,
  whatsapp: FaWhatsapp,
  messenger: FaFacebookMessenger,
  x: FaXTwitter,
  linkedin: FaLinkedinIn,
  website: FaGlobe,
};

export function SocialIcon({
  platform,
  className,
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  const Cmp = MAP[platform] ?? FaGlobe;
  return <Cmp className={className} />;
}
