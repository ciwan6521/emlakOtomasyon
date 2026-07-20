import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { Role } from "@reos/shared";
import { RequestUser } from "./decorators";

export interface JwtPayload {
  sub: string;
  email: string;
  companyId: string;
  branchId: string | null;
  roles: Role[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>("jwt.accessSecret")!,
    });
  }

  validate(payload: JwtPayload): RequestUser {
    if (!payload?.sub || !payload?.companyId) {
      throw new UnauthorizedException("Invalid token payload");
    }
    return {
      id: payload.sub,
      email: payload.email,
      companyId: payload.companyId,
      branchId: payload.branchId ?? null,
      roles: payload.roles ?? [],
    };
  }
}
