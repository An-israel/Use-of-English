import { NotFoundBody } from "@/components/site/NotFoundBody";

export const metadata = { title: "Page not found" };

/** notFound() inside the site: the layout already provides the header and footer. */
export default function SiteNotFound() {
  return <NotFoundBody />;
}
