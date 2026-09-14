import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { jwtSecret } from "../common/env";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(),
    });
  }

  /** The user id comes from the verified access token only — never from the request body. */
  validate(payload: { sub?: string; typ?: string }) {
    if (!payload?.sub || payload.typ !== "access") throw new UnauthorizedException();
    return { userId: payload.sub };
  }
}
