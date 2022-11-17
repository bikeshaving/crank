import {jsx} from "@b9g/crank";

// TODO: find a better analytics solution that lets me know when a bunch of
// traffic comes to the site but isn’t spyware and is cheap or free.
export function GoogleSpyware() {
	return jsx`
		<script
			async
			src="https://www.googletagmanager.com/gtag/js?id=UA-20910936-4"
		/>
		<script
			innerHTML=${`
				window.dataLayer = window.dataLayer || [];
				function gtag(){dataLayer.push(arguments);}
				gtag('js', new Date());

				gtag('config', 'UA-20910936-4');
			`}
		/>
	`;
}
