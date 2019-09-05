declare global {
	namespace JSX {
		interface IntrinsicElements {
			[name: string]: any;
		}
	}
}

export type RepeatProps = Record<string, any>;

export type RepeatComponent = (
	props: RepeatProps,
) => PromiseLike<RepeatNode> | RepeatNode;

export type RepeatType = string | RepeatComponent;

interface RepeatElement<T> {
	type: T;
	props: Record<string, any>;
}

type RepeatNode = RepeatElement<string | RepeatComponent>;

export function createElement(
	type: RepeatType,
	props: Record<string, any> | null,
	...children: RepeatNode[]
): RepeatNode {
	props = {...props, children};
	return {type, props};
}
