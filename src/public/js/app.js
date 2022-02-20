const socket = io();

const myFace = document.getElementById("myFace");
const muteBox = document.getElementById("muteBox");
const muteIcon = document.getElementById("muteIcon");
const muteText = document.getElementById("muteText");
const cameraBox = document.getElementById("cameraBox");
const cameraIcon = document.getElementById("cameraIcon");
const cameraText = document.getElementById("cameraText");
const settingIcon = document.getElementById("settingIcon");
const settingText = document.getElementById("settingText");
const layerBox = document.getElementById("layerBox");
const camerasSelect = document.getElementById("cameras");
const call = document.getElementById("call");

call.style.display = "none";
layerBox.style.display = "none";
muteIcon.innerHTML = "<i class='fas fa-microphone-alt fa-lg'></i>";
muteText.innerText = "음소거";
cameraIcon.innerHTML = "<i class='fas fa-video fa-lg'></i>";
cameraText.innerText = "비디오 중지";
settingIcon.innerHTML = "<i class='fas fa-cog fa-lg'></i>";
settingText.innerText = "설정";

let myStream;
let muted = false;
let cameraOff = false;
let roomName;
let myUser;
let myPeerConnection;
let myDataChannel;

const setScreenSize = () => {
	let vh = window.innerHeight * 0.01;
	document.documentElement.style.setProperty("--vh", `${vh}px`);
};

async function getCameras() {
	try {
		const devices = await navigator.mediaDevices.enumerateDevices();
		const cameras = devices.filter((device) => device.kind === "videoinput");
		const currentCamera = myStream.getVideoTracks()[0];
		cameras.forEach((camera) => {
			const option = document.createElement("option");
			option.value = camera.deviceId;
			option.innerText = camera.label;
			if (currentCamera.label === camera.label) {
				option.selected = true;
			}
			camerasSelect.appendChild(option);
		});
	} catch (e) {
		console.log(e);
	}
}

async function getMedia(deviceId) {
	const initialConstrains = {
		audio: true,
		video: { facingMode: "user" },
	};
	const cameraConstraints = {
		audio: true,
		video: { deviceId: { exact: deviceId } },
	};
	try {
		myStream = await navigator.mediaDevices.getUserMedia(
			deviceId ? cameraConstraints : initialConstrains
		);
		myFace.srcObject = myStream;
		if (!deviceId) {
			await getCameras();
		}
	} catch (e) {
		console.log(e);
	}
}

function handleMuteClick() {
	myStream
		.getAudioTracks()
		.forEach((track) => (track.enabled = !track.enabled));
	if (!muted) {
		muteIcon.innerHTML = "<i class='fas fa-microphone-alt-slash fa-lg'></i>";
		muteText.innerText = "음소거 해제";
		muted = true;
	} else {
		muteIcon.innerHTML = "<i class='fas fa-microphone-alt fa-lg'></i>";
		muteText.innerText = "음소거";
		muted = false;
	}
}

function handleCameraClick() {
	myStream
		.getVideoTracks()
		.forEach((track) => (track.enabled = !track.enabled));
	if (cameraOff) {
		cameraIcon.innerHTML = "<i class='fas fa-video fa-lg'></i>";
		cameraText.innerText = "비디오 중지";
		cameraOff = false;
	} else {
		cameraIcon.innerHTML = "<i class='fas fa-video-slash fa-lg'></i>";
		cameraText.innerText = "비디오 시작";
		cameraOff = true;
	}
}

async function handleCameraChange() {
	await getMedia(camerasSelect.value);
	if (myPeerConnection) {
		const videoTrack = myStream.getVideoTracks()[0];
		const videoSender = myPeerConnection
			.getSenders()
			.find((sender) => sender.track.kind === "video");
		videoSender.replaceTrack(videoTrack);
	}
}

muteBox.addEventListener("click", handleMuteClick);
cameraBox.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);

// Welcome Form (join a room)

const welcome = document.getElementById("welcome");
const welcomeForm = welcome.querySelector("form");
const nickname = welcomeForm.querySelector("#nickname");
const room = welcomeForm.querySelector("#room");
const usersTitleBox = document.getElementById("usersTitleBox");
const userTitle = usersTitleBox.querySelector("h1");
const usersListBox = document.getElementById("usersListBox");
const usersList = usersListBox.querySelector("ul");
const chatsListBox = document.getElementById("chatsListBox");
const chatsList = chatsListBox.querySelector("ul");
const messageBox = document.getElementById("messageBox");
const messageForm = messageBox.querySelector("form");
const messageInput = document.getElementById("messageInput");

let userTotal = 0;

const initCall = async () => {
	welcome.style.display = "none";
	call.style.display = "flex";
	await getMedia();
	makeConnection();
};

const getProfile = (user) => {
	const shortNameDiv = document.createElement("div");
	const shortName = user.nickname?.substring(0, 2);
	shortNameDiv.className = "shortNameBox";
	shortNameDiv.innerHTML = `<div class='shortName' style='background-color: ${user.color}'>${shortName}</div>`;
	return shortNameDiv;
};

const showUsers = (users) => {
	if (!users) {
		alert("회의 정원이 초과하였습니다");
		window.location = "/";
	} else {
		userTotal = users.length;
		userTitle.innerText = `${roomName} 참가자 (${userTotal})`;

		usersList.innerHTML = "";
		users.forEach((user) => {
			if (user.nickname === nickname.value) {
				myUser = user;
			}
			const li = document.createElement("li");
			const nameDiv = document.createElement("div");
			nameDiv.className = "fullName";
			nameDiv.innerText = `${user.nickname}`;
			li.appendChild(getProfile(user));
			li.appendChild(nameDiv);
			usersList.appendChild(li);
		});
	}
};

const addMessage = (className, message, user) => {
	const li = document.createElement("li");
	li.className = className;

	const messageBoxDiv = document.createElement("div");
	const messageDiv = document.createElement("div");
	messageBoxDiv.className = "messageBox";
	messageDiv.className = "message";
	messageDiv.innerText = message;
	messageBoxDiv.appendChild(getProfile(user));
	messageBoxDiv.appendChild(messageDiv);
	li.appendChild(messageBoxDiv);

	const timeDiv = document.createElement("div");
	const today = new Date();
	const hour =
		today.getHours() < 10
			? `오전 ${today.getHours()}`
			: today.getHours() > 12
			? `오후 ${today.getHours() - 12}`
			: `오후 ${today.getHours()}`;
	const minute =
		today.getMinutes() < 10 ? `0${today.getMinutes()}` : today.getMinutes();
	timeDiv.className = "time";
	timeDiv.innerText = `${hour}:${minute}`;
	li.appendChild(timeDiv);
	chatsList.appendChild(li);
};

const addInOut = (message) => {
	const li = document.createElement("li");
	li.className = "inout";
	li.innerText = message;
	chatsList.appendChild(li);
};

const handleWelcomeSubmit = async (event) => {
	event.preventDefault();
	await socket.emit("join_room", room.value, nickname.value, showUsers);
	await initCall();
	addInOut(`${nickname.value}님이 들어왔습니다.`);
	roomName = room.value;
	room.value = "";
};

const handleSendMessageSubmit = async (event) => {
	event.preventDefault();
	await myDataChannel?.send(messageInput.value);
	addMessage("myChat", messageInput.value, myUser);
	messageInput.value = "";
};

welcomeForm.addEventListener("submit", handleWelcomeSubmit);
messageForm.addEventListener("submit", handleSendMessageSubmit);

// Socket Code

socket.on("welcome", async (user) => {
	addInOut(`${user.nickname}님이 들어왔습니다.`);
	myDataChannel = myPeerConnection.createDataChannel("chat");
	myDataChannel.addEventListener("message", (event) => {
		addMessage("peerChat", event.data, user);
	});
	console.log("made data channel");
	const offer = await myPeerConnection.createOffer();
	myPeerConnection.setLocalDescription(offer);
	console.log("sent the offer");
	socket.emit("offer", offer, roomName, user, showUsers);
});

socket.on("offer", async (offer, user) => {
	myPeerConnection.addEventListener("datachannel", (event) => {
		myDataChannel = event.channel;
		myDataChannel.addEventListener("message", (event) =>
			addMessage("peerChat", event.data, user)
		);
	});
	console.log("received the offer");
	myPeerConnection.setRemoteDescription(offer);
	const answer = await myPeerConnection.createAnswer();
	myPeerConnection.setLocalDescription(answer);
	socket.emit("answer", answer, roomName);
	console.log("sent the answer");
});

socket.on("answer", (answer) => {
	console.log("received the answer");
	myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) => {
	console.log("received candidate");
	myPeerConnection.addIceCandidate(ice);
});

socket.on("bye", async (left, users) => {
	showUsers(users);
	addInOut(`${left}님이 나갔습니다.`);

	handleDisconnection();
});

// RTC Code

const makeConnection = () => {
	myPeerConnection = new RTCPeerConnection({
		iceServers: [
			{
				urls: [
					"stun:stun.l.google.com:19302",
					"stun:stun1.l.google.com:19302",
					"stun:stun2.l.google.com:19302",
					"stun:stun3.l.google.com:19302",
					"stun:stun4.l.google.com:19302",
				],
			},
		],
	});
	myPeerConnection.addEventListener("icecandidate", handleIce);
	myPeerConnection.addEventListener("addstream", handleAddStream);
	myStream
		.getTracks()
		.forEach((track) => myPeerConnection.addTrack(track, myStream));
};

const handleIce = (data) => {
	console.log("sent candidate");
	socket.emit("ice", data.candidate, roomName);
};

const handleAddStream = (data) => {
	const peerFace = document.getElementById("peerFace");
	peerFace.srcObject = data.stream;
};

const handleDisconnection = () => {
	myPeerConnection.close();
	myPeerConnection = null;
	myDataChannel = null;

	myStream.getTracks().forEach((track) => {
		track.stop();
	});

	const peerFace = document.getElementById("peerFace");
	if (peerFace?.srcObject) {
		peerFace.srcObject.getTracks().forEach((track) => {
			track.stop();
		});
		peerFace.srcObject = null;
	}

	initCall();
};

window.addEventListener("resize", () => {
	setScreenSize();
});
