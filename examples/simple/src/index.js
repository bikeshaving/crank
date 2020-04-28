/** @jsx createElement */
import { createElement } from "@bikeshaving/crank";
import { renderer } from "@bikeshaving/crank/dom";

function Greeting({ name = "World" }) {
  return <div>Hello {name}</div>;
}

renderer.render(<Greeting />, document.body);
