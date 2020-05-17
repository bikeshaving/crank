/** @jsx createElement */
import { createElement, Fragment } from "@bikeshaving/crank";

import { sleep } from "../utils";

export async function* LoadingIndicator() {
  yield "Fetching ...";
  await sleep(3000);
  return "Still fetching ...";
}
