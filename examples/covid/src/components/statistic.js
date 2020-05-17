/** @jsx createElement */
import { createElement, Fragment } from "@bikeshaving/crank";

export function Statistic({ number, description }) {
  return (
    <Fragment>
      <div class="statistic">
        <div class="number">{number}</div>
        <div class="description">{description}</div>
      </div>
    </Fragment>
  );
}
