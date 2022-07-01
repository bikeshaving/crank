import {t} from "@b9g/crank/template.js";
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
