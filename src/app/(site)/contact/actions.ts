"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { RATE_LIMITS, clientKey, rateLimit } from "@/lib/api/rate-limit";
import { isDemoMode } from "@/lib/env";
import { logger } from "@/lib/log";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { adminClient } from "@/lib/supabase/clients";

export type ContactState = {
  status: "idle" | "sent" | "error";
  message?: string;
  fieldErrors?: Partial<Record<"name" | "email" | "subject" | "message", string>>;
  values?: Record<string, string>;
};

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(200),
  email: z.email("Please enter a valid email address.").max(320),
  subject: z.string().trim().min(3, "Please add a subject.").max(300),
  message: z.string().trim().min(20, "Please write at least a sentence or two (20 characters).").max(8000),
});

export async function sendContactMessage(_prev: ContactState, form: FormData): Promise<ContactState> {
  const values = Object.fromEntries(["name", "email", "subject", "message"].map((k) => [k, String(form.get(k) ?? "")]));

  // Honeypot: real people never fill this hidden field.
  if (String(form.get("website") ?? "") !== "") return { status: "sent" };

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors: ContactState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof NonNullable<ContactState["fieldErrors"]>;
      fieldErrors[key] ??= issue.message;
    }
    return { status: "error", message: "Please check the highlighted fields.", fieldErrors, values };
  }

  const h = await headers();
  const limit = await rateLimit({ headers: h }, RATE_LIMITS.contact);
  if (!limit.allowed) {
    return {
      status: "error",
      message: `You have sent several messages recently. Please try again in ${Math.ceil(limit.retryAfter / 60)} minutes.`,
      values,
    };
  }

  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(String(form.get("cf-turnstile-response") ?? ""), ip))) {
    return { status: "error", message: "We could not confirm you are human. Please try the check again.", values };
  }

  if (isDemoMode) {
    return {
      status: "error",
      message: "This is a preview without a database, so messages cannot be sent yet.",
      values,
    };
  }

  // Saving the message raises a contact.received event; the job queue emails the editorial office.
  const { error } = await adminClient().from("contact_messages").insert(parsed.data);
  if (error) {
    logger.error({ err: error, client: clientKey({ headers: h }) }, "contact message insert failed");
    return { status: "error", message: "Something went wrong on our side. Please try again shortly.", values };
  }
  return {
    status: "sent",
    message: "Thank you. Your message has reached the editorial office, and we will reply by email.",
  };
}
