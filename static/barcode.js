const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
if (!urlParams.get("type")) {
	document.body.innerHTML = `Máš zlú adresu`;
}

let scanning = true;
const error_audio = new Audio("/static/barcode_error.mp3");
const success_audio = new Audio("/static/barcode_success.mp3");

let audio = new Audio("/static/barcode_scanner.mp3");

document.addEventListener("DOMContentLoaded", (ev) => {
	ev.preventDefault();
	let successElement = document.getElementById("success-indicator");

	let lastCode = "";
	let codeScanner = new Html5Qrcode("js-reader");
	let config = {
		fps: 10,
		experimentalFeatures: {
			useBarCodeDetectorIfSupported: true,
		},
		rememberLastUsedCamera: true,
		supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
		formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
	};
	codeScanner.start(
		{ facingMode: "environment" },
		config,
		async (text, result) => {
			if ((urlParams.get("single") || text !== lastCode) && scanning) {
				scanning = false;
				navigator.vibrate(200);
				audio.play();
				successElement.animate(
					{ boxShadow: "inset 0 0 0 8px rgb(34 197 94 / 100)" },
					{ duration: 500, iterations: 1 },
				);
				successElement.animate(
					{ opacity: "0.8" },
					{ duration: 100, fill: "forwards" },
				);

				if (urlParams.get("single") || lastCode !== "") {
					let response = await send(
						urlParams.get("single"),
						text,
						lastCode,
					);

					lastCode = "";
					if (response) {
						await success_audio.play();
					} else {
						await error_audio.play();
					}
					setTimeout(enable, 2000);
				} else {
					lastCode = text;
					enable();
				}
			}
		},
	);
});

function enable() {
	document
		.getElementById("success-indicator")
		.animate({ opacity: "0" }, { duration: 100, fill: "forwards" });
	scanning = true;
}

async function send(single, text, lastCode) {
	let t, l, response;
	try {
		t = JSON.parse(text);
	} catch (e) {
		console.error(e);
	}
	if (!single) {
		try {
			l = JSON.parse(lastCode);
		} catch (e) {
			console.error(e);
		}
	}
	do {
		try {
			if (single) {
				response = await fetch("/scan", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						type: urlParams.get("type"),
						first: t,
					}),
				});
			} else {
				response = await fetch("/scan", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						type: urlParams.get("type"),
						first: t,
						second: l,
					}),
				});
			}
		} catch (e) {
			(e) => console.error(e);
		}
	} while (!response);
	return response;
}
