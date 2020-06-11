// TODO: write an explanation for each of these flags
export const Mounted = 1 << 0;
export const Committed = 1 << 1;
export const Dirty = 1 << 2;
export const Moved = 1 << 3;
export const Updating = 1 << 4;
export const Removing = 1 << 5;
export const Unmounted = 1 << 6;
export const Intrinsic = 1 << 7;
export const Component = 1 << 8;
// Context-only Flags
export const Handling = 1 << 9;
export const Finished = 1 << 10;
export const Stepping = 1 << 11;
export const Iterating = 1 << 12;
export const Available = 1 << 13;
export const SyncGen = 1 << 14;
export const AsyncGen = 1 << 15;
