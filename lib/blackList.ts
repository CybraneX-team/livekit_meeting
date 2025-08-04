const kickedUsers = new Set<string>(); // Store by userId or token

export function kickUser(userId: string) {
  kickedUsers.add(userId);
  console.log('User kicked:', userId);
  console.log('Current kicked users:', Array.from(kickedUsers));
}

export function isKicked(userId: string): boolean {
  console.log("kick check: ", userId)
  console.log('Current kicked users:', Array.from(kickedUsers));
  return kickedUsers.has(userId);
}

export function unkickUser(userId: string) {
  kickedUsers.delete(userId);
  console.log('User unkicked:', userId);
  console.log('Current kicked users:', Array.from(kickedUsers));
}

export function logKickedUsers() {
  console.log('Current kicked users set:', Array.from(kickedUsers));
  console.log('Total kicked users:', kickedUsers.size);
}