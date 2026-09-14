import { Injectable, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { githubOAuthConfig, googleOAuthConfig } from "../common/env";
import { UsersService } from "../users/users.service";
import { AuthService } from "./auth.service";

type Provider = "google" | "github";

@Injectable()
export class OauthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  startUrl(provider: Provider) {
    const state = this.jwt.sign({ typ: "oauth", p: provider }, { expiresIn: "10m" });
    if (provider === "google") {
      const cfg = googleOAuthConfig();
      if (!cfg) throw new ServiceUnavailableException("Google sign-in is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
      const params = new URLSearchParams({
        client_id: cfg.clientId,
        redirect_uri: cfg.redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
        access_type: "online",
        prompt: "select_account",
      });
      return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    }
    const cfg = githubOAuthConfig();
    if (!cfg) throw new ServiceUnavailableException("GitHub sign-in is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.");
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.redirectUri,
      scope: "read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  private parseState(state: string | undefined, expected: Provider) {
    if (!state) throw new UnauthorizedException("OAuth state is missing.");
    try {
      const payload = this.jwt.verify<{ typ?: string; p?: Provider }>(state);
      if (payload.typ !== "oauth" || payload.p !== expected) throw new Error("bad state");
    } catch {
      throw new UnauthorizedException("OAuth state is invalid.");
    }
  }

  async finish(provider: Provider, code: string | undefined, state: string | undefined) {
    this.parseState(state, provider);
    if (!code) throw new UnauthorizedException("OAuth code is missing.");
    const profile = provider === "google" ? await this.googleProfile(code) : await this.githubProfile(code);
    const passwordHash = await argon2.hash(randomBytes(32).toString("hex"), { type: argon2.argon2id });
    const user = await this.users.upsertOauth({
      email: profile.email,
      name: profile.name,
      googleId: provider === "google" ? profile.id : undefined,
      githubId: provider === "github" ? profile.id : undefined,
      passwordHash,
    });
    return this.auth.issueSessionFor(user);
  }

  private async googleProfile(code: string) {
    const cfg = googleOAuthConfig();
    if (!cfg) throw new ServiceUnavailableException("Google sign-in is not configured.");
    const body = new URLSearchParams({
      code,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: "authorization_code",
    });
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new UnauthorizedException("Google did not return an access token.");
    }
    const meRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const me = (await meRes.json()) as { sub?: string; email?: string; name?: string };
    if (!me.sub || !me.email) throw new UnauthorizedException("Google did not return an email.");
    return { id: me.sub, email: me.email, name: me.name?.trim() || me.email.split("@")[0] };
  }

  private async githubProfile(code: string) {
    const cfg = githubOAuthConfig();
    if (!cfg) throw new ServiceUnavailableException("GitHub sign-in is not configured.");
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        code,
        redirect_uri: cfg.redirectUri,
      }),
    });
    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenJson.access_token) {
      throw new UnauthorizedException(
        tokenJson.error_description || tokenJson.error || "GitHub did not return an access token. Use an OAuth App (not a GitHub App) with callback http://localhost:3333/auth/github/callback",
      );
    }
    const headers = {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "CodeAtlas",
    };
    const meRes = await fetch("https://api.github.com/user", { headers });
    const me = (await meRes.json()) as { id?: number; login?: string; name?: string; email?: string };
    let email = me.email ?? "";
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
      const emails = (await emailsRes.json()) as Array<{ email: string; primary?: boolean; verified?: boolean }>;
      email = emails.find((row) => row.primary && row.verified)?.email || emails.find((row) => row.verified)?.email || "";
    }
    if (!me.id || !email) throw new UnauthorizedException("GitHub did not return a verified email.");
    return { id: String(me.id), email, name: me.name?.trim() || me.login || email.split("@")[0] };
  }
}
