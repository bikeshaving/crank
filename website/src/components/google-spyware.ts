import {t} from "@b9g/crank/template.js";

// TODO: find a better analytics solution that let’s me know when a bunch of
// traffic comes to the site but isn’t spyware and is cheap or free.
export function GoogleSpyware() {
	return t`
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
