/** @jsx createElement */
import { createElement, Fragment } from "@bikeshaving/crank";
import { last } from "lodash-es";
import { distanceInWordsToNow } from "date-fns";

import { Statistic, Title } from "./";
import { api } from "../utils";
import { LoadingIndicator } from "./loading-indicator";
import { Suspense } from "./suspense";

export async function Country({ country }) {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <CountryRenderer country={country} />
    </Suspense>
  );
}

export async function CountryRenderer({ country }) {
  const { Slug } = country;
  const data = await api(`https://api.covid19api.com/live/country/${Slug}`, {
    slow: false,
  })
    .then((response) => response.json())
    .catch((error) => console.log("error", error));

  const today = last(data);

  return (
    <Fragment>
      <Title>{country.Country}</Title>
      {today ? (
        <Fragment>
          <div>
            <strong>Last update: </strong>
            {distanceInWordsToNow(today.Date)} ago
          </div>
          <div style="display: flex; flex-wrap: wrap; width: 500px">
            <Statistic number={today.Confirmed} description="Confirmed" />
            <Statistic number={today.Deaths} description="Deaths" />
            <Statistic number={today.Recovered} description="Recovered" />
            <Statistic number={today.Active} description="Active" />
          </div>
        </Fragment>
      ) : (
        `No statistics found ...`
      )}
    </Fragment>
  );
}
