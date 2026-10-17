/**
 * Every realtime event is addressed to individual users, never broadcast to
 * a workspace, so each user has one private channel. A browser's token only
 * lets it subscribe to its own.
 */
export const userChannel = (userId: string) => `user:${userId}`;
