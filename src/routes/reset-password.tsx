import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthShell, authField } from "@/features/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/features/auth/password-input";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { useState } from "react";

const searchSchema = z.object({
  token: z.string().optional().default(""),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Set a new password — CodeAtlas" },
      { name: "description", content: "Choose a new CodeAtlas password." },
    ],
  }),
  component: ResetPasswordPage,
});

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters."),
    confirm: z.string().min(8),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<{ password: string; confirm: string }>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirm: "" },
  });

  if (!token) {
    return (
      <AuthShell title="Missing link" description="Open the reset URL from your email.">
        <Button asChild className="h-11 w-full">
          <Link to="/forgot-password">Request a new link</Link>
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="New password" description="This signs you out of other sessions.">
      <form
        className="space-y-4"
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          try {
            await authApi.resetPassword(token, values.password);
            await navigate({ to: "/login" });
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Could not reset that password.");
          }
        })}
      >
        {error ? <p className="text-sm text-red-300">{error}</p> : null}
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            className={authField}
            {...form.register("password")}
          />
          {form.formState.errors.password ? (
            <p className="text-xs text-red-300">{form.formState.errors.password.message}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">Confirm</Label>
          <PasswordInput
            id="confirm"
            autoComplete="new-password"
            className={authField}
            {...form.register("confirm")}
          />
          {form.formState.errors.confirm ? (
            <p className="text-xs text-red-300">{form.formState.errors.confirm.message}</p>
          ) : null}
        </div>
        <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
          Save password
        </Button>
      </form>
    </AuthShell>
  );
}
