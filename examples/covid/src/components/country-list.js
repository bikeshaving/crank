/** @jsx createElement */
import { createElement } from "@bikeshaving/crank";

import { COVID_API_BASE_URL } from "../constants";
import { sortBy } from "lodash-es";
import { api } from "../utils";
import classnames from "classnames";
import { LoadingIndicator } from "./loading-indicator";
import { Suspense } from "./suspense";

export async function CountryList({ onClick, selected }) {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <CountryListRenderer onClick={onClick} selected={selected} />
    </Suspense>
  );
}

async function* CountryListRenderer({ onClick, selected }) {
  const res = await api(COVID_API_BASE_URL + "/countries");
  const countries = await res.json().then((items) => sortBy(items, "Country"));

  for await ({ selected } of this) {
    yield (
      <div class="country-list">
        {countries.map((country) => (
          <div
            key={country.Slug}
            class={classnames(
              "country",
              selected && selected.Slug === country.Slug && "selected"
            )}
            onclick={() => onClick(country)}
          >
            {country.Country}
          </div>
        ))}
      </div>
    );
  }
}
