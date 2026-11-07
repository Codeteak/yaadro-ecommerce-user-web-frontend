/**
 * Default illustrated avatars for signed-in users without a photo.
 * One is picked in code from the seed (user id) so the same person
 * keeps the same avatar across visits.
 */
export const DEFAULT_PROFILE_AVATARS = [
  "/avatars/avatar-01.svg",
  "/avatars/avatar-02.svg",
  "/avatars/avatar-03.svg",
  "/avatars/avatar-04.svg",
  "/avatars/avatar-05.svg",
  "/avatars/avatar-06.svg",
  "/avatars/avatar-07.svg",
  "/avatars/avatar-08.svg",
  "/avatars/avatar-09.svg",
  "/avatars/avatar-10.svg",
  "/avatars/avatar-11.svg",
  "/avatars/avatar-12.svg",
  "/avatars/avatar-13.svg",
  "/avatars/avatar-14.svg",
  "/avatars/avatar-15.svg",
  "/avatars/avatar-16.svg",
] as const;

function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable random pick from the default set. Pass a user id when auth exists. */
export function pickDefaultProfileAvatar(seed: string): string {
  const index = hashSeed(seed) % DEFAULT_PROFILE_AVATARS.length;
  return DEFAULT_PROFILE_AVATARS[index]!;
}
