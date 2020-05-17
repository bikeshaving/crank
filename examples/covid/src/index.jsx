/** @jsx createElement */
import { createElement, Fragment } from "@bikeshaving/crank";
import { renderer } from "@bikeshaving/crank/dom";
import { Country, CountryList } from "./components";

function* CovidApp() {
  let selected;
  const onClick = (_selected) => {
    selected = _selected;
    this.refresh();
  };

  while (true) {
    yield (
      <div style="display:flex">
        <div class="section" style="width: 20%">
          <CountryList onClick={onClick} selected={selected} />
        </div>
        <div class="section" style="width: 80%">
          {selected ? <Country country={selected} /> : "No country selected."}
        </div>
      </div>
    );
  }
}

renderer.render(<CovidApp />, document.body);
