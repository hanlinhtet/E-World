import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './strategies/jwt.strategy';

/** Inject the authenticated user into a controller handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    return ctx.switchToHttp().getRequest<{ user: AuthUser }>().user;
  },
);
