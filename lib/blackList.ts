const kickedUsers = new Set<string>(); // Store by userId or token

export function kickUser(userId: string) {
  kickedUsers.add(userId);
}

export function isKicked(userId: string): boolean {
  return kickedUsers.has(userId);
}

export function unkickUser(userId: string) {
  kickedUsers.delete(userId);
}