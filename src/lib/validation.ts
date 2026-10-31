import { z } from "zod";
import { FILE_KINDS, STAFF_FILE_KINDS } from "@/lib/submission";
import { ASSET_SLOTS } from "@/lib/admin/assets";
import { ROLES } from "@/lib/workflow";

/**
 * Shared schemas for server action arguments (brief section 15). Arguments
 * arrive from the browser like form data, so ids, flags and file details are
 * checked before anything else runs.
 */
export const Id = z.uuid();
export const UploadFile = z.object({
  name: z.string().min(1).max(255),
  size: z.number().int().nonnegative(),
  type: z.string().max(200),
});
export const UploadKindSchema = z.enum(
  Object.keys(FILE_KINDS) as [keyof typeof FILE_KINDS, ...(keyof typeof FILE_KINDS)[]],
);
export const StaffUploadKindSchema = z.enum(
  Object.keys(STAFF_FILE_KINDS) as [keyof typeof STAFF_FILE_KINDS, ...(keyof typeof STAFF_FILE_KINDS)[]],
);
export const AssetSlot = z.enum(
  Object.keys(ASSET_SLOTS) as [keyof typeof ASSET_SLOTS, ...(keyof typeof ASSET_SLOTS)[]],
);
export const StoragePath = z.string().min(1).max(500);
export const RoleName = z.enum(ROLES);
/** A form's fields as plain values, for checking with z.object. */
export const fields = (form: FormData) => Object.fromEntries(form);

export const INVALID = {
  ok: false as const,
  message: "That request wasn’t valid. Reload the page and try again.",
};

/** True when the arguments match the schema. */
export function validArgs(schema: z.ZodType, value: unknown): boolean {
  return schema.safeParse(value).success;
}

/** Paystack references the site creates (letters, digits, dashes, underscores). */
export const PaymentReference = z.string().regex(/^[A-Za-z0-9_-]{6,100}$/);
/** Article and page slugs. */
export const Slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(200);
