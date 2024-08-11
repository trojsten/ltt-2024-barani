import { qrcode } from "https://deno.land/x/qrcode/mod.ts";
import { DB } from "https://deno.land/x/sqlite@v3.8/mod.ts";
import {
	serveDir,
	serveFile,
} from "https://deno.land/std@0.178.0/http/file_server.ts";
import { STATUS_CODE } from "https://deno.land/std/http/status.ts";

const db = new DB(Deno.env.get("DB") || "test.db");

db.query(`
  CREATE TABLE IF NOT EXISTS messages (
    content BLOB
  )
`);

const cert = await Deno.readTextFile("cert");
const key = await Deno.readTextFile("key");
const wss = new Set<WebSocket>();

Deno.serve({ cert, key }, (req) => {
	if (req.headers.get("upgrade") != "websocket") {
		let pathname = new URL(req.url).pathname;
		if (pathname.startsWith("/static/")) {
			return serveDir(req, {
				fsRoot: "./",
			});
		}
		if (pathname.startsWith("/view"))
			return serveFile(req, "./static/view.html");
		if (pathname == "/") return serveFile(req, "./static/index.html");

		if (pathname.startsWith("/scan")) return process(req);
		// Do dynamic responses
		return new Response(null, {
			status: STATUS_CODE.NotFound,
		});
	}

	const { socket: ws, response } = Deno.upgradeWebSocket(req);
	ws.onopen = () => wss.add(ws);
	ws.onclose = () => wss.delete(ws);
	ws.onerror = (e) =>
		console.log(e instanceof ErrorEvent ? e.message : e.type);
	ws.onmessage = (message) => {
		if (message.data.startsWith("init")) {
			for (const [content] of db.query("SELECT content FROM messages")) {
				ws.send(content);
			}
		} else if (message.data.startsWith("print")) {
			db.query("DELETE FROM messages");
		}
	};
	return response;
});

async function process(req) {
	const now = new Date();
	const targetTime = new Date(
		now.getFullYear(),
		now.getMonth(),
		now.getDate(),
		14,
		0,
		0,
	);
	const time_to_live = targetTime.getTime() - now.getTime() / 1000 + 60 * 200;
	let data = await req.json();
	data.first = JSON.parse(data.first);
	if (data.second) data.second = JSON.parse(data.second);
	console.log(data);
	let newData = { code: "", team: data.first.team, time: time_to_live };
	if (data.type && data.first) {
		switch (data.type) {
			case "breeding":
				newData.code = biologicke_parenie(
					data.first.code,
					data.second.code,
				);
				break;
			case "weak_radiation":
				newData.code = normalna_mutacia(data.first.code, 1 / 6);
				break;
			case "strong_radiation":
				newData.code = normalna_mutacia(data.first.code, 1 / 2);
				break;
			case "complement":
				newData.code = create_complement(data.first.code);
				break;
			case "shift":
				newData.code = shift(data.first.code);
				break;
		}

		wss.forEach((client) => client.send(JSON.stringify(newData)));
		db.query("INSERT INTO messages (content) VALUES (?)", [
			JSON.stringify(newData),
		]);
	}
	return new Response();
}

function biologicke_parenie(d, e) {
	const l = Math.floor(Math.random() * 12);
	const r = Math.floor(Math.random() * 12);
	if (Math.round(Math.random())) {
		[d, e] = [e, d];
	}
	const start = Math.min(l, r);
	const end = Math.max(l, r);
	console.log(d, e);
	return normalna_mutacia(
		d.substring(0, start) + e.substring(start, end) + d.substring(end),
		1 / 12,
	);
}

function normalna_mutacia(a, sanca) {
	let ret = "";
	for (let i = 0; i < 12; i++) {
		if (Math.random() > sanca) {
			ret += "GATC".charAt(Math.floor(Math.random() * 4));
		} else {
			ret += a.charAt(i);
		}
	}
	return ret;
}

function shift(a) {
	const s = Math.floor(Math.random() * 12);
	return normalna_mutacia(a.substring(s) + a.substring(0, s), 1 / 12);
}

function create_complement(old_string: string) {
	let new_string = "";
	for (let i = 0; i < old_string.length; i++) {
		switch (old_string[i]) {
			case "A":
				new_string += "T";
			case "C":
				new_string += "G";
			case "G":
				new_string += "C";
			case "T":
				new_string += "A";
		}
	}
	return normalna_mutacia(new_string, 1 / 12);
}
