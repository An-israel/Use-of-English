import { redirect } from "next/navigation";
import { getIssues } from "@/lib/data";
import { issuePath } from "@/lib/issues";

/** /issues/current always points at the latest published issue. */
export default async function CurrentIssuePage() {
  const [latest] = await getIssues();
  redirect(latest ? issuePath(latest) : "/issues");
}
