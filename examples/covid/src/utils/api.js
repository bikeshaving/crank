const FAST = 0; //ms
const SLOW = 5 * 1000; //ms

export function api(url, { slow } = {}) {
  return new Promise(async (resolve) => {
    const res = await fetch(url);
    setTimeout(
      () => {
        resolve(res);
      },
      slow ? SLOW : FAST
    );
  });
}
