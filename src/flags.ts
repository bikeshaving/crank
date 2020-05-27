export const Dirty = 1 << 0;
export const Moved = 1 << 1;
export const Updating = 1 << 2;
export const Stepping = 1 << 3;
export const Iterating = 1 << 4;
export const Available = 1 << 5;
export const Finished = 1 << 6;
export const Unmounted = 1 << 7;
export const SyncGen = 1 << 8;
export const AsyncGen = 1 << 9;

export const Initial = Dirty | Moved;
