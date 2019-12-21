// taken from https://stackoverflow.com/a/35385518
export function createHTML(innerHTML: string): ChildNode | null {
	var template = document.createElement("template");
	innerHTML = innerHTML.trim();
	template.innerHTML = innerHTML;
	return template.content.firstChild;
}
