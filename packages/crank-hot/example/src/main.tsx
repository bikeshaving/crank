import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {App} from "./app.tsx";

renderer.render(<App />, document.getElementById("root")!);
