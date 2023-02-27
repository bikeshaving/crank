import {jsx} from "@b9g/crank/standalone";

// TODO: find a better analytics solution that lets me know when a bunch of
// traffic comes to the site but isn’t spyware and is cheap or free.
export function GoogleSpyware() {
	return jsx`
		<!-- Google tag (gtag.js) -->
		<script async src="https://www.googletagmanager.com/gtag/js?id=G-1583Q8VK83" />
		<script
			innerHTML=${`
				window.dataLayer = window.dataLayer || [];
				function gtag(){dataLayer.push(arguments);}
				gtag('js', new Date());

				gtag('config', 'G-1583Q8VK83');
			`}
		/>
	`;
}
