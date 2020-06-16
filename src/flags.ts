// TODO: write an explanation for each of these flags
export const Mounted = 1;
export const Updating = 1 << 1;
export const Committed = 1 << 2;
export const Unmounted = 1 << 3;
// Context-only Flags
export const SyncGen = 1 << 4;
export const AsyncGen = 1 << 5;
export const Finished = 1 << 6;
export const Stepping = 1 << 7;
export const Iterating = 1 << 8;
export const Available = 1 << 9;
export const Handling = 1 << 10;
