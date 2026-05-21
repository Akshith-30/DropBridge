/** Two-letter initials for navbar avatar */
export function getUserInitials(user) {
  if (!user) return '?';
  const name = user.displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  const email = user.email?.trim();
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export function getUserDisplayName(user) {
  if (!user) return '';
  return user.displayName?.trim() || user.email?.split('@')[0] || 'Account';
}
