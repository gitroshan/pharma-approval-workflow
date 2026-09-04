/** Authentication primitives: password hashing and JWT issue/verify. */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '../domain/types';

export interface TokenClaims {
  sub: string; // user id
  email: string;
  roles: Role[];
}

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, config.BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function issueToken(claims: TokenClaims): string {
  return jwt.sign(claims, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN,
    algorithm: 'HS256',
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenClaims {
  return jwt.verify(token, config.JWT_SECRET, { algorithms: ['HS256'] }) as TokenClaims;
}
