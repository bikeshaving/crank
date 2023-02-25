import {jsx, Raw} from "@b9g/crank/standalone";

export const escapedScript = "______ESCAPED_SCRIPT_____";

// TODO: script props
export function EmbeddedJSON(props: any) {
	// A hack to prevent script injections. Not secure.
	// TODO: Use serialize-javascript instead perhaps?
	return jsx`
		<script type="application/json" ...${props}>
			<${Raw} value=${JSON.stringify(props.value).replace(
		/<\/\s*script\s*>/gi,
		escapedScript,
	)} />
		</script>
	`;
}
