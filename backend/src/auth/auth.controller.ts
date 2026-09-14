import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Query, Redirect, UseGuards } from "@nestjs/common";
import { SkipThrottle, Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { OauthService } from "./oauth.service";
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  GithubTokenDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from "./dto/auth.dto";
import { LogoutDto, RefreshTokenDto } from "./dto/session.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "./current-user.decorator";
import { frontendUrl } from "../common/env";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly oauth: OauthService,
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Post("login")
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Get("google")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @Redirect()
  googleStart() {
    return this.startOauth("google");
  }

  @Get("google/callback")
  @Redirect()
  async googleCallback(@Query("code") code?: string, @Query("state") state?: string) {
    return this.finishOauth("google", code, state);
  }

  @Get("github")
  @Throttle({ default: { limit: 12, ttl: 60_000 } })
  @Redirect()
  githubStart() {
    return this.startOauth("github");
  }

  @Get("github/callback")
  @Redirect()
  async githubCallback(@Query("code") code?: string, @Query("state") state?: string) {
    return this.finishOauth("github", code, state);
  }

  private startOauth(provider: "google" | "github") {
    try {
      return { url: this.oauth.startUrl(provider) };
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : `${provider} sign-in is not available.`;
      return { url: `${frontendUrl()}/login?oauthError=${encodeURIComponent(message)}` };
    }
  }

  private async finishOauth(provider: "google" | "github", code?: string, state?: string) {
    try {
      const session = await this.oauth.finish(provider, code, state);
      const params = new URLSearchParams({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
      return { url: `${frontendUrl()}/oauth/callback?${params.toString()}` };
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error && typeof error.message === "string"
          ? error.message
          : "OAuth failed.";
      return { url: `${frontendUrl()}/login?oauthError=${encodeURIComponent(message)}` };
    }
  }

  @Post("forgot-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  @Post("reset-password")
  @HttpCode(200)
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @Post("refresh")
  @HttpCode(200)
  @SkipThrottle()
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(200)
  logout(@Body() dto: LogoutDto, @CurrentUser() userId: string) {
    return this.auth.logout(userId || null, dto.refreshToken);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() userId: string) {
    return this.auth.me(userId);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() userId: string, @Body() dto: UpdateProfileDto) {
    return this.auth.updateMe(userId, dto);
  }

  @Post("password")
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() userId: string, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(userId, dto);
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard)
  stats(@CurrentUser() userId: string) {
    return this.auth.stats(userId);
  }

  @Post("github-token")
  @UseGuards(JwtAuthGuard)
  saveGithubToken(@CurrentUser() userId: string, @Body() dto: GithubTokenDto) {
    return this.auth.saveGithubToken(userId, dto.token);
  }

  @Delete("github-token")
  @UseGuards(JwtAuthGuard)
  clearGithubToken(@CurrentUser() userId: string) {
    return this.auth.clearGithubToken(userId);
  }

  @Delete("me")
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUser() userId: string) {
    return this.auth.removeAccount(userId);
  }
}
