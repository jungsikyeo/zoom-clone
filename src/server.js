import http from "http";
import SocketIO from "socket.io";
import express from "express";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

const getRandomColor = () => {
	var makingColorCode = "0123456789ABCDEF";
	var finalCode = "#";
	for (var counter = 0; counter < 6; counter++) {
		finalCode = finalCode + makingColorCode[Math.floor(Math.random() * 16)];
	}
	return finalCode;
};

let users = [];

wsServer.on("connection", (socket) => {
	socket.on("join_room", (roomName, nickname, done) => {
		if (users.length > 1) {
			done();
		} else {
			const color = getRandomColor();
			const user = {
				nickname,
				color,
			};
			socket["nickname"] = nickname;
			users.push(user);
			socket.join(roomName);
			done(users);
			socket.to(roomName).emit("welcome", user);
		}
	});
	socket.on("offer", (offer, roomName, user, done) => {
		socket.to(roomName).emit("offer", offer, user);
		done(users);
	});
	socket.on("answer", (answer, roomName) => {
		socket.to(roomName).emit("answer", answer);
	});
	socket.on("ice", (ice, roomName) => {
		socket.to(roomName).emit("ice", ice);
	});
	socket.on("disconnecting", () => {
		users = users.filter((user) => user.nickname !== socket.nickname);
		socket.rooms.forEach((room) =>
			socket.to(room).emit("bye", socket.nickname, users)
		);
	});
});

const handleListen = () => console.log(`Listening on http://localhost:3000`);
httpServer.listen(3000, handleListen);
