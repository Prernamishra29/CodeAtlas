import { createParamDecorator, type ExecutionContext } from "@nestjs/common";

/** Resolves the authenticated user id from the verified JWT. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: { userId?: string } }>();
  return request.user?.userId ?? "";
});
