export function sessionKey(userId: number): string {
  return `auth:session:${userId}`;
}
