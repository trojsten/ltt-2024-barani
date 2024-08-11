const socket = new WebSocket(
	`${window.location.protocol === "http:" ? "ws" : "wss"}://${window.location.host}`,
);

socket.addEventListener("open", () => {
	socket.send("init");
});

const druzinky = [
	"Čierne ovce",
	"beéEéäÉe3",
	"Oby. pes a nez. ovce",
	"Jozef Číž",
	"Pokorné traktory",
	"Mám odreté kolená",
	"Fudjara",
];

const process_message = (e) => {
	let data = JSON.parse(e.data);
	let node = document.createElement("div");
	node.classList.add("code");
	new QRCode(node, JSON.stringify(e.data));
	node.insertAdjacentHTML("afterbegin", `<h1>${druzinky[data.team]}</h1>`);
	node.insertAdjacentHTML("beforeend", `<h2>${data.code}</h2>`);
	document.getElementById("grid").appendChild(node);
};
socket.addEventListener("message", process_message);

let delete_elements = [];

window.addEventListener("beforeprint", (event) => {
	socket.send("print");
	delete_elements = document.querySelectorAll(".code");
});

window.addEventListener("afterprint", (event) => {
	delete_elements.forEach((element) => {
		element.remove();
	});
	delete_elements = [];
});
