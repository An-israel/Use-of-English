import { redirect } from "next/navigation";

/** Review requests are listed on the account page. */
export default function ReviewIndex() {
  redirect("/account#reviews");
}
