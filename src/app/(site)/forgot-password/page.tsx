import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account"
      title="Reset your password"
      intro="Enter your email and we will send you a link to choose a new password."
    >
      <ForgotForm />
    </AuthShell>
  );
}
