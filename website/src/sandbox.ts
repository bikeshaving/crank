window.addEventListener("message", (ev) => {
	document.body.innerHTML = ev.data;
});
