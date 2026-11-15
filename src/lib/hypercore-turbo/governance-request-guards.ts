const MAX_BEARER_TOKEN_LENGTH = 8192;

/** Accept application/json, optionally followed by valid media-type parameters. */
export function isJsonContentType(value: string | null): boolean {
  if (!value) return false;
  const mediaType = value.split(";", 1)[0].trim().toLowerCase();
  return mediaType === "application/json";
}

/** Bound auth-header work before forwarding a bearer token to the identity provider. */
export function isBearerTokenWithinLimit(token: string | undefined): boolean {
  return typeof token === "string"
    && token.length > 0
    && token.length <= MAX_BEARER_TOKEN_LENGTH;
}
