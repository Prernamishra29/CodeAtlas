import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthShell, authField } from "@/features/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — CodeAtlas" },
      { name: "description", content: "Request a CodeAtlas password reset link." },
    ],
  }),
  component: ForgotPasswordPage,
});

const schema = z.object({
  email: z.string().email("Enter a valid email."),
});

function ForgotPasswordPage() {
  const [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<{ email: string }>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  return (
    <AuthShell
      title="Reset password"
      description="Use the same email you signed up with. This local install does not send mail unless you add Resend or SMTP."
      footer={
        <span>
          Remembered it?{" "}
          <Link to="/login" className="text-[#C9A6FF] underline-offset-2 hover:underline">
            Sign in
          </Link>
        </span>
      }
    >
      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
      {done ? (
        <div className="space-y-3 text-sm leading-relaxed text-white/70">
          <p>If that email has an account, a reset link was created.</p>
          {resetUrl ? (
            <>
              <p>No email is configured on this machine, so use this link (valid one hour):</p>
              <a href={resetUrl} className="block break-all font-medium text-[#C9A6FF] underline">
                Set a new password
              </a>
            </>
          ) : (
            <p>Check your inbox, or Settings → Account if you can still sign in.</p>
          )}
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              const result = await authApi.forgotPassword(values.email);
              setResetUrl(result.resetUrl ?? null);
              setDone(true);
            } catch (err) {
              setError(
                err instanceof ApiError
                  ? err.message
                  : "Cannot reach the API. Start the backend with npm run dev in the backend folder (Postgres must be running).",
              );
            }
          })}
        >
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              className={authField}
              {...form.register("email")}
            />
            {form.formState.errors.email ? (
              <p className="text-xs text-red-300">{form.formState.errors.email.message}</p>
            ) : null}
          </div>
          <Button type="submit" className="h-11 w-full" disabled={form.formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
