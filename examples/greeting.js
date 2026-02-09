import {renderer} from "@b9g/crank/dom";

function Greeting({name = "World"}) {
  return <div>Hello {name}</div>;
}

renderer.render(<Greeting name="Crank" />, document.body);
