// TODO: find a better way to test DOM stuff than these MutationObserver hacks
import "./_mutation-observer-shim";
// NOTE: for some reason MutationRecord.previousSibling and
// MutationRecord.nextSibling are weird, non-node objects in some tests. I have
// no interest in figuring out who goofed right now (maybe me) so we’re just
// ignoring the properties in a custom matcher.
declare global {
	// eslint-disable-next-line no-redeclare
	module jest {
		// eslint-disable-next-line
		interface Matchers<R, T> {
			toEqualMutationRecords: (expected: any[]) => R;
		}
	}
}

expect.extend({
	toEqualMutationRecords(received, expected) {
		const empty: MutationRecord = {
			type: "childList",
			target: document.body,
			addedNodes: [] as any,
			removedNodes: [] as any,
			attributeName: null,
			attributeNamespace: null,
			nextSibling: undefined as any,
			previousSibling: undefined as any,
			oldValue: null,
		};
		const pass = Array.isArray(received) && Array.isArray(expected);
		if (pass) {
			received = received.map((record: any) => ({
				type: record.type,
				target: record.target,
				addedNodes: Array.from(record.addedNodes),
				removedNodes: Array.from(record.removedNodes),
				attributeName: record.attributeName,
				attributeNamespace: record.attributeNamespace,
				nextSibling: undefined,
				previousSibling: undefined,
				oldValue: record.oldValue,
			}));
			expected = expected.map((record: any) => ({
				...empty,
				...record,
				previousSibling: undefined,
				nextSibling: undefined,
			}));
			// eslint-disable-next-line jest/no-standalone-expect
			expect(received).toEqual(expected);
		}

		return {pass, message: () => "received or expected is not an array"};
	},
});
