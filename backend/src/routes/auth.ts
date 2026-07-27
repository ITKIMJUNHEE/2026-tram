import express, { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../db/connection';
import { AdminRow, LoginRequestBody, LoginResponse, AuthTokenPayload } from '../types';
import { getJwtSecret } from '../middleware/auth';

const router = express.Router();

const TOKEN_EXPIRES_IN = '24h';
// 아이디가 없는 경우와 비밀번호가 틀린 경우를 구분해서 응답하지 않는다 (계정 존재 여부 노출 방지).
const INVALID_CREDENTIALS_MESSAGE = '아이디 또는 비밀번호가 올바르지 않습니다.';

router.post('/login', async (req: Request<unknown, unknown, LoginRequestBody>, res: Response, next: NextFunction) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username, password is required' });
    }

    const { rows } = await pool.query<AdminRow>('SELECT * FROM admins WHERE username = $1', [username]);
    const admin = rows[0];
    if (!admin) {
      return res.status(401).json({ error: INVALID_CREDENTIALS_MESSAGE });
    }

    const passwordMatches = await bcrypt.compare(password, admin.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ error: INVALID_CREDENTIALS_MESSAGE });
    }

    const payload: AuthTokenPayload = { username: admin.username, role: 'admin' };
    const token = jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRES_IN });

    const response: LoginResponse = { token, username: admin.username };
    res.json(response);
  } catch (err) {
    next(err);
  }
});

export default router;
