import { PublicShell } from "@/components/layout/PublicShell";
import {
  HeaderAdBanner,
  FooterAdBanner,
  OverlayAdSlots,
} from "@/features/ads/ui/GlobalAdSlots";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicShell
      headerAdSlot={<HeaderAdBanner />}
      footerAdSlot={<FooterAdBanner />}
      overlayAdSlot={<OverlayAdSlots />}
    >
      {children}
    </PublicShell>
  );
}
