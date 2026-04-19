import { Injectable } from '@nestjs/common';
import { JwtUtil } from './jwt.util';

@Injectable()
export class JwtExtractUtil {
  static extractUserIdFromToken(authHeader: string): string | null {
    const token = JwtUtil.extractTokenFromHeader(authHeader);
    if (!token) {
      return null;
    }

    try {
      const payload = JwtUtil.verifyToken(token);
      return payload.sub;
    } catch (error) {
      return null;
    }
  }
}
