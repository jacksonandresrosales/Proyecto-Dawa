import { createHash, randomBytes } from 'node:crypto';

export const generarPasswordTemporal = () => randomBytes(18).toString('hex');
export const generarTokenRestablecimiento = () => randomBytes(32).toString('hex');
export const hashTokenRestablecimiento = (token) => createHash('sha256').update(token).digest('hex');
