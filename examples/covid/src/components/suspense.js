/** @jsx createElement */
import { createElement, Fragment } from "@bikeshaving/crank";

export async function* Suspense({ timeout, fallback, children }) {
  for await ({ timeout, fallback, children } of this) {
    yield <Fallback timeout={timeout}>{fallback}</Fallback>;
    yield <Fragment>{children}</Fragment>;
  }
}
async function Fallback({ timeout = 1000, children }) {
  await new Promise((resolve) => setTimeout(resolve, timeout));
  return children;
}
