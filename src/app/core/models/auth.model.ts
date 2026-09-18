/** Par de tokens de una sesión. */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** Usuario autenticado, tal como lo devuelve `GET /auth/me`. */
export interface SessionUser {
  username: string;
  roles: string[];
  twoFactorEnabled: boolean;
}

/** Datos para configurar el segundo factor. */
export interface TwoFactorSetup {
  secret: string;
  otpauthUri: string;
}

/** Resultado del login: o ya hay tokens, o falta el código de 2FA. */
export type LoginResult =
  | { twoFactorRequired: true; challengeId: string }
  | { twoFactorRequired: false; tokens: Tokens };
