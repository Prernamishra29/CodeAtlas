import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/page-transition";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PasswordInput } from "@/features/auth/password-input";
import { authApi } from "@/lib/api/auth";
import { useAuthStore } from "@/store/auth-store";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CodeAtlas" },
      { name: "description", content: "Manage your CodeAtlas profile, account and preferences." },
      { property: "og:title", content: "Settings — CodeAtlas" },
      {
        property: "og:description",
        content: "Profile, account and preference settings for CodeAtlas.",
      },
    ],
  }),
  component: SettingsPage,
});

const panel = "mt-4 rounded-[1.6rem] bg-white/[0.07] p-5 ring-1 ring-white/10";
const field = "border-white/10 bg-white/5 text-white";
const tabOn =
  "rounded-full data-[state=active]:bg-[#C9A6FF] data-[state=active]:text-zinc-950 data-[state=active]:shadow-none";

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 py-4 last:border-0">
      <div className="min-w-0 max-w-md">
        <p className="text-sm font-medium text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-white/45">{description}</p>
      </div>
      {children}
    </div>
  );
}

function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const saveGithubToken = useAuthStore((state) => state.saveGithubToken);
  const clearGithubToken = useAuthStore((state) => state.clearGithubToken);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState(user?.role ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [githubToken, setGithubToken] = useState("");

  useEffect(() => {
    setName(user?.name ?? "");
    setRole(user?.role ?? "");
    setEmail(user?.email ?? "");
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: () => updateProfile({ name: name.trim(), role: role.trim() || "Member" }),
    onSuccess: () => toast.success("Profile saved"),
    onError: (error: Error) => toast.error(error.message),
  });

  const saveEmail = useMutation({
    mutationFn: () => updateProfile({ email: email.trim() }),
    onSuccess: () => toast.success("Email updated"),
    onError: (error: Error) => toast.error(error.message),
  });

  const savePassword = useMutation({
    mutationFn: () => authApi.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const saveGithub = useMutation({
    mutationFn: () => saveGithubToken(githubToken.trim()),
    onSuccess: () => {
      setGithubToken("");
      toast.success("GitHub token saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const disconnectGithub = useMutation({
    mutationFn: () => clearGithubToken(),
    onSuccess: () => toast.success("GitHub token removed"),
    onError: (error: Error) => toast.error(error.message),
  });

  const savePref = useMutation({
    mutationFn: (payload: {
      notifyAnalysis?: boolean;
      notifyInsights?: boolean;
      compactDensity?: boolean;
    }) => updateProfile(payload),
    onError: (error: Error) => toast.error(error.message),
  });

  const removeAccount = useMutation({
    mutationFn: () => authApi.deleteAccount(),
    onSuccess: async () => {
      queryClient.clear();
      await logout();
      toast.success("Account deleted");
      await navigate({ to: "/register" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <PageTransition>
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-2 text-sm text-white/60">
          Saved to your account. GitHub tokens are encrypted.
        </p>

        <Tabs defaultValue="profile" className="mt-7">
          <TabsList className="h-auto w-full justify-start rounded-full bg-white/8 p-1 ring-1 ring-white/10">
            <TabsTrigger value="profile" className={tabOn}>
              Profile
            </TabsTrigger>
            <TabsTrigger value="account" className={tabOn}>
              Account
            </TabsTrigger>
            <TabsTrigger value="github" className={tabOn}>
              GitHub
            </TabsTrigger>
            <TabsTrigger value="preferences" className={tabOn}>
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className={panel}>
            <p className="text-sm font-semibold text-white">How you show up</p>
            <p className="mt-1 text-sm text-white/50">
              Name and role appear in the sidebar and on Profile.
            </p>
            <form
              className="mt-5 grid max-w-lg gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveProfile.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="settings-name">Full name</Label>
                <Input
                  id="settings-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={field}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="settings-role">Role</Label>
                <Input
                  id="settings-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="Member"
                  className={field}
                />
              </div>
              <Button type="submit" className="w-fit gap-2" disabled={saveProfile.isPending}>
                {saveProfile.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Save changes
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="account" className={panel}>
            <p className="text-sm font-semibold text-white">Email and password</p>
            <p className="mt-1 text-sm text-white/50">
              This is the login for this CodeAtlas account.
            </p>
            <form
              className="mt-5 grid max-w-lg gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveEmail.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="settings-email">Email address</Label>
                <Input
                  id="settings-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={field}
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="w-fit"
                disabled={saveEmail.isPending}
              >
                {saveEmail.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Update email
              </Button>
            </form>

            <form
              className="mt-8 grid max-w-lg gap-3 border-t border-white/10 pt-6"
              onSubmit={(event) => {
                event.preventDefault();
                savePassword.mutate();
              }}
            >
              <p className="text-sm font-medium text-white">Change password</p>
              <div className="space-y-1.5">
                <Label htmlFor="current-password">Current password</Label>
                <PasswordInput
                  id="current-password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={field}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-password">New password</Label>
                <PasswordInput
                  id="new-password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={field}
                />
                <p className="text-xs text-white/40">At least 8 characters.</p>
              </div>
              <Button
                type="submit"
                variant="outline"
                className="w-fit"
                disabled={savePassword.isPending}
              >
                {savePassword.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Update password
              </Button>
            </form>

            <div className="mt-8 border-t border-white/10 pt-2">
              <Row title="Sign out" description="Ends this session on this browser.">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    await logout();
                    await navigate({ to: "/login" });
                  }}
                >
                  Sign out
                </Button>
              </Row>
              <Row
                title="Delete account"
                description="Permanently removes your account and every imported repository."
              >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone. All repositories, analyses, docs and chats will be
                        removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => removeAccount.mutate()}
                      >
                        Delete account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Row>
            </div>
          </TabsContent>

          <TabsContent value="github" className={panel}>
            <p className="text-sm font-semibold text-white">Private clones</p>
            <p className="mt-1 text-sm text-white/50">
              A personal access token lets CodeAtlas clone private repositories. Public ones work
              without it.
            </p>
            <div className="mt-4">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                  user?.githubConnected ? "bg-[#F3EDE4] text-zinc-950" : "bg-white/10 text-white/70"
                }`}
              >
                {user?.githubConnected ? "Token saved" : "Not connected"}
              </span>
            </div>
            <form
              className="mt-5 grid max-w-lg gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                saveGithub.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="github-token">Personal access token</Label>
                <PasswordInput
                  id="github-token"
                  autoComplete="off"
                  value={githubToken}
                  onChange={(event) => setGithubToken(event.target.value)}
                  placeholder={
                    user?.githubConnected
                      ? "Paste a new token to replace it"
                      : "ghp_… or github_pat_…"
                  }
                  className={field}
                />
                <p className="text-xs leading-relaxed text-white/40">
                  Classic tokens need the <span className="text-white/70">repo</span> scope.
                  Fine-grained tokens need Contents: Read.{" "}
                  <a
                    href="https://github.com/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#C9A6FF] underline-offset-2 hover:underline"
                  >
                    Create a token
                  </a>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="submit"
                  className="w-fit gap-2"
                  disabled={saveGithub.isPending || githubToken.trim().length < 20}
                >
                  {saveGithub.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  {user?.githubConnected ? "Replace token" : "Save token"}
                </Button>
                {user?.githubConnected ? (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" disabled={disconnectGithub.isPending}>
                        Remove token
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove the GitHub token?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Private repositories will fail to clone until you save a token again.
                          Public repositories are unaffected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => disconnectGithub.mutate()}>
                          Remove token
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                ) : null}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="preferences" className={panel}>
            <p className="text-sm font-semibold text-white">This device</p>
            <p className="mt-1 text-sm text-white/50">
              Saved on your account. Completions always appear under Activity. Email is sent when
              Resend or SMTP is configured.
            </p>
            <div className="mt-2">
              <Row
                title="Analysis completed"
                description="Activity (and email, if configured) when a run finishes."
              >
                <Switch
                  checked={user?.notifyAnalysis ?? true}
                  onCheckedChange={(checked) => savePref.mutate({ notifyAnalysis: checked })}
                  aria-label="Analysis completed preference"
                />
              </Row>
              <Row
                title="New insights"
                description="Activity (and email, if configured) when docs finish."
              >
                <Switch
                  checked={user?.notifyInsights ?? false}
                  onCheckedChange={(checked) => savePref.mutate({ notifyInsights: checked })}
                  aria-label="Insight preference"
                />
              </Row>
              <Row title="Compact density" description="Tighter padding on tables and cards.">
                <Switch
                  checked={user?.compactDensity ?? false}
                  onCheckedChange={(checked) => savePref.mutate({ compactDensity: checked })}
                  aria-label="Compact density"
                />
              </Row>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </PageTransition>
  );
}
