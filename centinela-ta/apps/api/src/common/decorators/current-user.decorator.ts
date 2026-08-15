import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthContext } from "../types/auth-context";

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthContext => {
  const req = ctx.switchToHttp().getRequest();
  return req.auth;
});
