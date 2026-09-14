import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Github, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { BrandMark } from "@/components/common/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/features/auth/password-input";
import { API_BASE_URL } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";

const field =
  "h-12 rounded-2xl border-white/10 bg-white/[0.07] text-white shadow-none placeholder:text-white/35 focus-visible:border-[#C9A6FF] focus-visible:ring-[#C9A6FF]/30";

const swap = { type: "spring" as const, stiffness: 280, damping: 32, mass: 0.9 };

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "Name is too long."),
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[0-9]/, "Include at least one number."),
  terms: z.boolean().refine((value) => value === true, "Agree to continue."),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

function socialUrl(provider: "google" | "github") {
  return `${API_BASE_URL}/auth/${provider}`;
}

function oauthErrorFromSearch(search: unknown) {
  if (search && typeof search === "object" && "oauthError" in search) {
    const value = (search as { oauthError?: unknown }).oauthError;
    return typeof value === "string" && value.length ? value : null;
  }
  return null;
}

export function AuthSwap({ mode }: { mode: "login" | "register" }) {
  const signup = mode === "register";
  const clearError = useAuthStore((s) => s.clearError);
  const oauthError = oauthErrorFromSearch(useRouterState({ select: (state) => state.location.search }));

  useEffect(() => {
    clearError();
  }, [mode, clearError]);

  return (
    <div className="min-h-dvh bg-[#1c1c22] p-4 lg:p-5">
      <div className={`flex min-h-[calc(100dvh-2.5rem)] flex-col gap-4 lg:flex-row ${signup ? "lg:flex-row-reverse" : ""}`}>
        <motion.aside layout transition={swap} className="relative hidden min-h-[320px] flex-1 overflow-hidden lg:block">
          <VisualPanel signup={signup} />
        </motion.aside>

        <motion.section layout transition={swap} className="flex flex-1 items-center justify-center rounded-[1.75rem] bg-white/[0.06] ring-1 ring-white/10">
          <div className="w-full max-w-[26rem] px-6 pb-10 pt-12 sm:px-10">
            <Link to="/" className="mb-8 mt-1 inline-flex items-center lg:hidden" aria-label="CodeAtlas home">
              <BrandMark size="lg" />
            </Link>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: signup ? 24 : -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: signup ? -24 : 24 }}
                transition={{ duration: 0.22 }}
              >
                {signup ? <RegisterForm banner={oauthError} /> : <LoginForm banner={oauthError} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function VisualPanel({ signup }: { signup: boolean }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-[#F3EDE4] px-10 pb-10 pt-16 text-zinc-950">
      <div className="pointer-events-none absolute -left-16 bottom-0 size-72 rounded-full bg-[#C9A6FF]/70 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute -right-10 top-10 size-56 rounded-full bg-[#5eead4]/50 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute right-24 bottom-24 size-40 rounded-full bg-[#f9a8d4]/50 blur-2xl" aria-hidden />

      <Link to="/" className="relative z-10 mt-1 flex items-center" aria-label="CodeAtlas home">
        <BrandMark size="xl" variant="onLight" />
      </Link>

      <div className="relative z-10 mt-auto max-w-md pb-10">
        <p className="text-sm text-zinc-500">{signup ? "New here" : "You can easily"}</p>
        <h2 className="mt-2 font-display text-4xl font-semibold leading-tight tracking-tight">
          {signup
            ? "Create an account, paste a GitHub URL, wait for Ready."
            : "Map any GitHub repo and see how the folders actually connect."}
        </h2>
      </div>

      <div className="relative z-10 flex items-center gap-3 text-zinc-700">
        <Github className="size-5" aria-hidden />
        <span className="text-sm">Public and private GitHub repositories</span>
      </div>
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-rose-300">{message}</p>;
}

function Alert({ children }: { children: string }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-2xl bg-rose-500/15 px-3 py-2.5 text-sm text-rose-200">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  );
}

function SocialRow() {
  return (
    <>
      <div className="relative my-6 text-center">
        <span className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
        <span className="relative bg-[#25252c] px-3 text-xs text-white/40">Or</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <a
          href={socialUrl("google")}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5"
        >
          <GoogleMark />
          Google
        </a>
        <a
          href={socialUrl("github")}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl text-sm text-white/80 ring-1 ring-white/15 hover:bg-white/5"
        >
          <Github className="size-4" />
          GitHub
        </a>
      </div>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-white/35">
        GitHub login needs the API on :3333 and an OAuth App callback
        {" "}
        <span className="text-white/50">http://localhost:3333/auth/github/callback</span>
      </p>
    </>
  );
}

function LoginForm({ banner }: { banner: string | null }) {
  const navigate = useNavigate();
  const { login, isSubmitting, error, clearError } = useAuthStore();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        clearError();
        try {
          await login(values);
          await navigate({ to: "/dashboard" });
        } catch {
          /* store */
        }
      })}
    >
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Sign in</h1>
        <p className="mt-2 text-sm text-white/50">Open the repos you already imported.</p>
      </div>
      {banner ? <Alert>{banner}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          className={field}
          {...form.register("email")}
        />
        <FieldError message={form.formState.errors.email?.message} />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link to="/forgot-password" className="text-xs font-medium text-[#C9A6FF] hover:underline">
            Forgot password?
          </Link>
        </div>
        <PasswordInput id="password" autoComplete="current-password" className={field} {...form.register("password")} />
        <FieldError message={form.formState.errors.password?.message} />
      </div>
      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Log in
      </Button>
      <p className="text-center text-sm text-white/50">
        Don’t have an account?{" "}
        <Link to="/register" className="font-medium text-[#C9A6FF] hover:underline">
          Sign up
        </Link>
      </p>
      <SocialRow />
    </form>
  );
}

function RegisterForm({ banner }: { banner: string | null }) {
  const navigate = useNavigate();
  const { register, isSubmitting, error, clearError } = useAuthStore();
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", password: "", terms: false },
  });

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        clearError();
        try {
          await register({ name: values.name, email: values.email, password: values.password });
          await navigate({ to: "/dashboard" });
        } catch {
          /* store */
        }
      })}
    >
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Sign up</h1>
        <p className="mt-2 text-sm text-white/50">Then paste a GitHub URL and wait for Ready.</p>
      </div>
      {banner ? <Alert>{banner}</Alert> : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="name" placeholder="Your name" className={field} {...form.register("name")} />
        <FieldError message={form.formState.errors.name?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-email">Email address</Label>
        <Input
          id="reg-email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          className={field}
          {...form.register("email")}
        />
        <FieldError message={form.formState.errors.email?.message} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password">Password</Label>
        <PasswordInput id="reg-password" autoComplete="new-password" className={field} {...form.register("password")} />
        <FieldError message={form.formState.errors.password?.message} />
      </div>
      <label className="flex items-start gap-2 text-sm text-white/60">
        <input type="checkbox" className="mt-0.5 size-4 rounded border-white/20 bg-transparent" {...form.register("terms")} />
        <span>
          I agree to the <span className="underline decoration-white/30">Terms & Privacy</span>
        </span>
      </label>
      <FieldError message={form.formState.errors.terms?.message} />
      <Button type="submit" disabled={isSubmitting} className="h-12 w-full">
        {isSubmitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        Sign up
      </Button>
      <p className="text-center text-sm text-white/50">
        Have an account?{" "}
        <Link to="/login" className="font-medium text-[#C9A6FF] hover:underline">
          Log in
        </Link>
      </p>
      <SocialRow />
    </form>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.6h5.1c-.2 1.2-.9 2.3-1.9 3l3.1 2.4c1.8-1.7 2.8-4.1 2.8-7 0-.7-.1-1.3-.2-1.9H12z" />
      <path fill="#34A853" d="M6.6 14.4l-.9.7-2.4 1.9C5 19.6 8.2 21.6 12 21.6c2.4 0 4.4-.8 5.9-2.1l-3.1-2.4c-.9.6-2 1-2.8 1-2.2 0-4-1.5-4.7-3.5z" />
      <path fill="#FBBC05" d="M3.3 7.1C2.5 8.6 2 10.2 2 12s.5 3.4 1.3 4.9l3.3-2.6C6.2 13.4 6 12.7 6 12s.2-1.4.6-2.3z" />
      <path fill="#4285F4" d="M12 6c1.3 0 2.5.5 3.4 1.3l2.5-2.5C16.4 3.4 14.4 2.4 12 2.4 8.2 2.4 5 4.4 3.3 7.1l3.3 2.6C8 7.7 9.8 6 12 6z" />
    </svg>
  );
}
