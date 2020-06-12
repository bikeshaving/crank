// TODO: write an explanation for each of these flags
export const Mounted = 1;
export const Committed = 1 << 1;
export const Dirty = 1 << 2;
export const Moved = 1 << 3;
export const Updating = 1 << 4;
export const Unmounted = 1 << 5;
// Context-only Flags
export const Handling = 1 << 6;
export const Finished = 1 << 7;
export const Stepping = 1 << 8;
export const Iterating = 1 << 9;
export const Available = 1 << 10;
export const SyncGen = 1 << 11;
export const AsyncGen = 1 << 12;
