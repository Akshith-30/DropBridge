/** Matches backend TransferSession.title max length */
export const MAX_SESSION_TITLE_LENGTH = 120;

/**
 * Session title for API: explicit title wins; otherwise first selected file name.
 */
export function resolveSessionTitle(explicitTitle, files) {
  const trimmed = explicitTitle?.trim();
  if (trimmed) {
    return trimmed.length > MAX_SESSION_TITLE_LENGTH
      ? trimmed.slice(0, MAX_SESSION_TITLE_LENGTH)
      : trimmed;
  }

  const firstName = files?.[0]?.name?.trim();
  if (firstName) {
    return firstName.length > MAX_SESSION_TITLE_LENGTH
      ? firstName.slice(0, MAX_SESSION_TITLE_LENGTH)
      : firstName;
  }

  return undefined;
}
