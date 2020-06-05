// TODO: write an explanation for each of these flags
export const Dirty = 1 << 0;
export const Moved = 1 << 1;
export const Mounted = 1 << 2;
export const Updating = 1 << 3;
export const Handling = 1 << 4;
export const Removing = 1 << 5;
export const Finished = 1 << 6;
export const Unmounted = 1 << 7;
// Context-only Flags
export const Stepping = 1 << 8;
export const Iterating = 1 << 9;
export const Available = 1 << 10;
export const SyncGen = 1 << 11;
export const AsyncGen = 1 << 12;
