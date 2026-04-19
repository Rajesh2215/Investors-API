import { createParamDecorator, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtUtil } from './jwt.util';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    const token = JwtUtil.extractTokenFromHeader(authHeader);
    if (!token) {
      throw new UnauthorizedException('Invalid token format');
    }

    try {
      const payload = JwtUtil.verifyToken(token);
      return payload.sub;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  },
);
