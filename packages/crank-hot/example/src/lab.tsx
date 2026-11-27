import {createElement} from "@b9g/crank";
import {renderer} from "@b9g/crank/dom";
import {Lab} from "./lab/app.tsx";

renderer.render(<Lab />, document.getElementById("root")!);
