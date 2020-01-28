/* @jsx createElement */
import webpack from "webpack";
import {createElement} from "@bikeshaving/crank/lib/cjs/crank";
import {renderer} from "@bikeshaving/crank/lib/cjs/html";

const html = renderer.renderToString(<div>Hello world</div>);

console.log(html);
