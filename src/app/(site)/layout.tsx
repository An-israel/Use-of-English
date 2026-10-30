import { SiteChrome } from "@/components/site/SiteChrome";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteChrome>{children}</SiteChrome>;
}
