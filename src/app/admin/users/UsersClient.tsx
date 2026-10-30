"use client";

import { useActionState, useState, useTransition } from "react";
import clsx from "clsx";
import { Field } from "@/components/forms/Field";
import { FormMessage } from "@/components/forms/FormMessage";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { useToast } from "@/components/ui/Toaster";
import type { FormState } from "@/lib/auth-actions";
import { ROLE_LABEL, type Role } from "@/lib/workflow";
import { changeRole, inviteUser, setActive } from "./actions";

export type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  affiliation: string | null;
  is_active: boolean;
  created_at: string;
};

export function InviteForm({ roles }: { roles: Role[] }) {
  const [state, action] = useActionState<FormState, FormData>(inviteUser, { status: "idle" });
  const e = state.fieldErrors ?? {};
  const v = state.values ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-[1fr_1fr_12rem_auto] sm:items-end" noValidate>
      <Field label="Name" name="fullName" defaultValue={v.fullName} error={e.fullName} />
      <Field label="Email" name="email" type="email" defaultValue={v.email} error={e.email} />
      <div>
        <label htmlFor="invite-role" className="text-[0.92rem]">
          Role
        </label>
        <select
          id="invite-role"
          name="role"
          defaultValue={v.role ?? roles[roles.length - 1]}
          className="border-rule bg-surface mt-1.5 w-full rounded-sm border px-3 py-3"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        {e.role && <span className="text-accent mt-1.5 block text-[0.85rem]">{e.role}</span>}
      </div>
      <SubmitButton pendingLabel="Sending…">Send invitation</SubmitButton>
      <div className="sm:col-span-4">
        <FormMessage status={state.status} message={state.message} />
      </div>
    </form>
  );
}

export function UsersTable({ users, canManage, viewerId }: { users: UserRow[]; canManage: boolean; viewerId: string }) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [pending, start] = useTransition();
  const toast = useToast();
  const q = query.trim().toLowerCase();
  const shown = users.filter(
    (u) =>
      (roleFilter === "all" || u.role === roleFilter) &&
      (!q || `${u.full_name} ${u.email} ${u.affiliation ?? ""}`.toLowerCase().includes(q)),
  );
  const run = (p: Promise<{ ok: boolean; message: string }>) =>
    start(async () => {
      const r = await p;
      toast(r.message, r.ok ? "info" : "error");
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or affiliation"
          aria-label="Search users"
          className="border-rule bg-surface min-w-0 flex-1 rounded-sm border px-3 py-2.5 sm:max-w-sm"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
          aria-label="Filter by role"
          className="border-rule bg-surface rounded-sm border px-3 py-2.5"
        >
          <option value="all">All roles</option>
          {Object.entries(ROLE_LABEL).map(([r, l]) => (
            <option key={r} value={r}>
              {l}
            </option>
          ))}
        </select>
        <span className="tabular text-muted ml-auto self-center text-[0.88rem]" aria-live="polite">
          {shown.length} of {users.length}
        </span>
      </div>
      <div className="border-rule bg-surface overflow-x-auto rounded-[3px] border">
        <table className={clsx("w-full min-w-[44rem] text-left text-[0.92rem]", pending && "opacity-70")}>
          <thead className="border-rule border-b">
            <tr className="text-muted">
              <th scope="col" className="smallcaps px-4 py-3 text-[0.78rem] font-normal">
                Name
              </th>
              <th scope="col" className="smallcaps px-4 py-3 text-[0.78rem] font-normal">
                Role
              </th>
              <th scope="col" className="smallcaps px-4 py-3 text-[0.78rem] font-normal">
                Status
              </th>
              {canManage && (
                <th scope="col" className="smallcaps px-4 py-3 text-right text-[0.78rem] font-normal">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-rule divide-y">
            {shown.length === 0 && (
              <tr>
                <td colSpan={4} className="text-muted px-4 py-10 text-center">
                  No users match.
                </td>
              </tr>
            )}
            {shown.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.full_name || "—"}</p>
                  <p className="text-muted text-[0.85rem]">{u.email}</p>
                  {u.affiliation && <p className="text-muted text-[0.82rem]">{u.affiliation}</p>}
                </td>
                <td className="px-4 py-3">
                  {canManage && u.id !== viewerId ? (
                    <select
                      aria-label={`Role for ${u.email}`}
                      defaultValue={u.role}
                      disabled={pending}
                      onChange={(e) => run(changeRole(u.id, e.target.value as Role))}
                      className="border-rule bg-bg rounded-sm border px-2 py-1.5"
                    >
                      {Object.entries(ROLE_LABEL).map(([r, l]) => (
                        <option key={r} value={r}>
                          {l}
                        </option>
                      ))}
                    </select>
                  ) : (
                    ROLE_LABEL[u.role]
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={clsx("inline-flex items-center gap-2", !u.is_active && "text-muted")}>
                    <span
                      aria-hidden="true"
                      className={clsx("inline-block size-1.5 rotate-45", u.is_active ? "bg-brand" : "bg-rule")}
                    />
                    {u.is_active ? "Active" : "Deactivated"}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    {u.id !== viewerId && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            u.is_active &&
                            !confirm(`Deactivate ${u.email}? They will be signed out and unable to sign in.`)
                          )
                            return;
                          run(setActive(u.id, !u.is_active));
                        }}
                        className="text-muted decoration-rule hover:text-fg text-[0.88rem] underline underline-offset-4"
                      >
                        {u.is_active ? "Deactivate" : "Reactivate"}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
