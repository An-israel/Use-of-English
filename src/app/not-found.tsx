import { SiteChrome } from "@/components/site/SiteChrome";
import { NotFoundBody } from "@/components/site/NotFoundBody";

export const metadata = { title: "Page not found" };

/** Unknown URLs outside the site's route group: the site chrome around the 404. */
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundBody />
    </SiteChrome>
  );
}
