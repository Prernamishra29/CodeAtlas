import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { randomBytes } from "node:crypto";
import * as argon2 from "argon2";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";
import { frontendUrl, isProduction, refreshTokenDays } from "../common/env";
import { mailConfigured, sendMail } from "../common/mail";
import { log } from "../common/logger";
import { hashRefreshToken } from "./refresh-token";
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateProfileDto } from "./dto/auth.dto";

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private async issueSession(user: { id: string; email: string }) {
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, typ: "access" });
    const refreshToken = randomBytes(32).toString("base64url");
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshTokenDays() * 24 * 60 * 60 * 1000),
      },
    });
    return { accessToken, refreshToken, tokenType: "Bearer" as const, expiresIn: 900 };
  }

  async issueSessionFor(user: { id: string; email: string }) {
    return { user, ...(await this.issueSession(user)) };
  }

  async register(dto: RegisterDto) {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException("An account with that email already exists.");
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    const user = await this.users.create({ email: dto.email, name: dto.name, passwordHash });
    return { user, ...(await this.issueSession(user)) };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findByEmail(dto.email);
    const invalid = new UnauthorizedException("Those credentials don't match an account.");
    if (!user) throw invalid;
    const ok = await argon2.verify(user.passwordHash, dto.password);
    if (!ok) throw invalid;
    return { user: this.users.toPublic(user), ...(await this.issueSession(user)) };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException("Session expired. Sign in again.");
    }
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const user = await this.users.findById(stored.userId);
    if (!user) throw new UnauthorizedException("Session expired. Sign in again.");
    return { user, ...(await this.issueSession(user)) };
  }

  async logout(userId: string | null, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hashRefreshToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else if (userId) {
      await this.revokeAll(userId);
    }
    return { ok: true };
  }

  async revokeAll(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async updateMe(userId: string, dto: UpdateProfileDto) {
    return this.users.updateProfile(userId, dto);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const generic = { ok: true as const };
    const user = await this.users.findByEmail(dto.email);
    if (!user) return generic;

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const token = randomBytes(32).toString("base64url");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashRefreshToken(token),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    const resetUrl = `${frontendUrl()}/reset-password?token=${encodeURIComponent(token)}`;
    const text = `Reset your CodeAtlas password:\n${resetUrl}\n\nThis link expires in one hour. If you did not ask for it, ignore this email.`;
    if (mailConfigured()) {
      try {
        await sendMail({
          to: user.email,
          subject: "Reset your CodeAtlas password",
          text,
        });
      } catch {
        /* delivery is best-effort */
      }
    }
    if (!isProduction()) log("info", "auth.reset_url", { resetUrl });
    if (!isProduction() && !mailConfigured()) {
      return { ok: true as const, resetUrl };
    }
    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashRefreshToken(dto.token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException("That reset link is invalid or has expired.");
    }
    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.users.changePassword(stored.userId, passwordHash);
    await this.prisma.passwordResetToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });
    await this.revokeAll(stored.userId);
    return { ok: true };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const hash = await this.users.passwordHash(userId);
    const ok = await argon2.verify(hash, dto.currentPassword);
    if (!ok) throw new UnauthorizedException("Current password is incorrect.");
    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.users.changePassword(userId, passwordHash);
    await this.revokeAll(userId);
    return { ok: true };
  }

  async stats(userId: string) {
    return this.users.stats(userId);
  }

  async saveGithubToken(userId: string, token: string) {
    return this.users.saveGithubToken(userId, token);
  }

  async clearGithubToken(userId: string) {
    return this.users.clearGithubToken(userId);
  }

  async removeAccount(userId: string) {
    return this.users.remove(userId);
  }
}
