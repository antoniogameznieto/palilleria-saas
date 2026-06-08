const DEV_FALLBACK_SECRET = "dev-only-secret-do-not-use-in-production";

/**
 * Auth.js acepta AUTH_SECRET (v5) o NEXTAUTH_SECRET (legacy).
 * En desarrollo usa un fallback para evitar MissingSecret si falta .env.
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET o NEXTAUTH_SECRET debe estar definido en producción.",
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[auth] AUTH_SECRET / NEXTAUTH_SECRET no definido. Usando secreto de desarrollo. " +
        "Copia .env.example a .env y configura un secreto real.",
    );
  }

  return DEV_FALLBACK_SECRET;
}
