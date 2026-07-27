import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthTokenPayload } from '../types';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
  }
  return secret;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthTokenPayload;
}

/**
 * Authorization: Bearer <token> 헤더를 검증하는 미들웨어.
 * 아직 어떤 라우트에도 적용하지 않았다 — 다음 단계(관리자 페이지)에서
 * 보호가 필요한 라우트에 `router.use(requireAuth)` 또는 라우트별로 붙여서 사용한다.
 */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return;
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
    req.auth = payload;
    next();
  } catch {
    res.status(401).json({ error: '유효하지 않거나 만료된 토큰입니다.' });
  }
}
