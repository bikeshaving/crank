import {renderer} from "@b9g/crank/dom";

// Adapted from https://backbonenotbad.hyperclay.com/
// https://gist.github.com/panphora/8f4d620ae92e8b28dcb4f20152185749
function* PasswordStrength() {
	const requirements = [
		{label: "8+ characters", check: (pwd) => pwd.length >= 8},
		{label: "12+ characters", check: (pwd) => pwd.length >= 12},
		{label: "Lowercase letter", check: (pwd) => /[a-z]/.test(pwd)},
		{label: "Uppercase letter", check: (pwd) => /[A-Z]/.test(pwd)},
		{label: "Number", check: (pwd) => /\d/.test(pwd)},
		{label: "Special character", check: (pwd) => /[^a-zA-Z0-9]/.test(pwd)},
	];

	let password = "";

	for ({} of this) {
		yield (
			<div class="w-80 p-6 bg-white rounded-xl shadow-lg space-y-4">
				<input
					type="password"
					value={password}
					oninput={(e) => this.refresh(() => (password = e.target.value))}
					placeholder="Enter password"
					class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2"
				/>
				<div class="space-y-2">
					{requirements.map((req, idx) => {
						const isMet = req.check(password);
						return (
							<div key={idx} class="flex items-center gap-2">
								<div
									class={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${isMet ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"}`}
								>
									{isMet ? "✓" : ""}
								</div>
								<span
									class={`text-sm ${isMet ? "text-green-600 font-medium" : "text-gray-500"}`}
								>
									{req.label}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		);
	}
}

const script = document.createElement("script");
script.src = "https://cdn.tailwindcss.com";
document.head.appendChild(script);
await new Promise((resolve) =>
	script.addEventListener("load", () => resolve(), {once: true}),
);
renderer.render(<PasswordStrength />, document.body);
