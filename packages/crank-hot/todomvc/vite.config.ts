import crankHot from "@b9g/crank-hot/vite";

export default {
	plugins: [crankHot()],
	server: {
		port: Number(process.env.PORT || 8000),
		strictPort: true,
		// The events of the file system do not always arrive on a CI machine.
		watch: process.env.CI ? {usePolling: true, interval: 50} : undefined,
	},
};
