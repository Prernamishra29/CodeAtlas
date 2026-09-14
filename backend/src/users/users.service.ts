import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { encryptSecret } from "../auth/secrets";

const publicUser = {
  id: true,
  email: true,
  name: true,
  role: true,
  notifyAnalysis: true,
  notifyInsights: true,
  compactDensity: true,
  createdAt: true,
  updatedAt: true,
} as const;

type UserWithCipher = {
  id: string;
  email: string;
  name: string;
  role: string;
  notifyAnalysis: boolean;
  notifyInsights: boolean;
  compactDensity: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  githubTokenCipher?: string | null;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  toPublic(user: UserWithCipher) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      notifyAnalysis: user.notifyAnalysis,
      notifyInsights: user.notifyInsights,
      compactDensity: user.compactDensity,
      githubConnected: Boolean(user.githubTokenCipher),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { ...publicUser, githubTokenCipher: true },
    });
    return user ? this.toPublic(user) : null;
  }

  async create(data: { email: string; name: string; passwordHash: string; googleId?: string; githubId?: string }) {
    const user = await this.prisma.user.create({
      data: { ...data, email: data.email.toLowerCase() },
      select: { ...publicUser, githubTokenCipher: true },
    });
    return this.toPublic(user);
  }

  async upsertOauth(data: {
    email: string;
    name: string;
    passwordHash: string;
    googleId?: string;
    githubId?: string;
  }) {
    const email = data.email.toLowerCase();
    if (data.googleId) {
      const existing = await this.prisma.user.findUnique({
        where: { googleId: data.googleId },
        select: { ...publicUser, githubTokenCipher: true },
      });
      if (existing) return this.toPublic(existing);
    }
    if (data.githubId) {
      const existing = await this.prisma.user.findUnique({
        where: { githubId: data.githubId },
        select: { ...publicUser, githubTokenCipher: true },
      });
      if (existing) return this.toPublic(existing);
    }
    const byEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { ...publicUser, githubTokenCipher: true, googleId: true, githubId: true },
    });
    if (byEmail) {
      const user = await this.prisma.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: data.googleId ?? byEmail.googleId,
          githubId: data.githubId ?? byEmail.githubId,
        },
        select: { ...publicUser, githubTokenCipher: true },
      });
      return this.toPublic(user);
    }
    return this.create({
      email,
      name: data.name,
      passwordHash: data.passwordHash,
      googleId: data.googleId,
      githubId: data.githubId,
    });
  }

  async updateProfile(
    id: string,
    data: {
      name?: string;
      role?: string;
      email?: string;
      notifyAnalysis?: boolean;
      notifyInsights?: boolean;
      compactDensity?: boolean;
    },
  ) {
    if (data.email) {
      const email = data.email.toLowerCase();
      const taken = await this.prisma.user.findFirst({ where: { email, id: { not: id } } });
      if (taken) throw new ConflictException("That email is already in use.");
      data = { ...data, email };
    }
    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: { ...publicUser, githubTokenCipher: true },
    });
    return this.toPublic(user);
  }

  async saveGithubToken(id: string, token: string) {
    const trimmed = token.trim();
    if (!/^(gh[pousr]_|github_pat_)/.test(trimmed)) {
      throw new BadRequestException("That does not look like a GitHub personal access token.");
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { githubTokenCipher: encryptSecret(trimmed) },
      select: { ...publicUser, githubTokenCipher: true },
    });
    return this.toPublic(user);
  }

  async clearGithubToken(id: string) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { githubTokenCipher: null },
      select: { ...publicUser, githubTokenCipher: true },
    });
    return this.toPublic(user);
  }

  async changePassword(id: string, passwordHash: string) {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Account not found.");
    await this.prisma.user.delete({ where: { id } });
    return { id };
  }

  async stats(userId: string) {
    const [repositories, analyses, questions] = await Promise.all([
      this.prisma.repository.count({ where: { userId } }),
      this.prisma.analysis.count({ where: { repository: { userId }, status: "completed" } }),
      this.prisma.chatMessage.count({
        where: { role: "user", conversation: { repository: { userId } } },
      }),
    ]);
    return { repositories, analyses, questions };
  }

  async passwordHash(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: { passwordHash: true } });
    if (!user) throw new UnauthorizedException();
    return user.passwordHash;
  }
}
