import { useEffect, useRef, useState, useMemo } from "react";
import io from "socket.io-client";
import "./VideoCall.css";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
    },
  ],
};

let HOSTNAME = "http://localhost:5500";
let ROOM = "sample";
let userName = "tom";

function VideoCall() {
  const socket = useMemo(
    () => io(HOSTNAME, { query: { roomId: ROOM, playerName: userName } }),
    [ROOM, userName]
  );
  const [localDescription, setLocalDescription] = useState("");
  const [remoteDescription, setRemoteDescription] = useState("");

  const [isCalling,setIsCalling] = useState(false);
  const [isReceiving,setIsReceiving] = useState(false);

  const peerConnection = useRef();

  const localVideo = useRef();
  const remoteVideo = useRef();

  const localStream = useRef();
  const remoteStream = useRef();

  async function startVideo() {
    localStream.current = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.current.srcObject = localStream.current;
  }

  async function createOffer() {
    peerConnection.current = new RTCPeerConnection(servers);

    remoteStream.current = new MediaStream();
    remoteVideo.current.srcObject = remoteStream.current;

    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    peerConnection.current.ontrack = async (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current.addTrack(track);
      });
    };

    peerConnection.current.addEventListener("icecandidate", (event) => {
      if (event.candidate) {
        setLocalDescription(
          JSON.stringify(peerConnection.current.localDescription)
        );
        console.log(typeof peerConnection.current.localDescription);
        socket.emit("call-user", {
          desc: peerConnection.current.localDescription,
          roomName: ROOM,
        });
      }
    });

    let offer = await peerConnection.current.createOffer();
    await peerConnection.current.setLocalDescription(offer);
    setLocalDescription(JSON.stringify(offer));
    setIsCalling(false)
  }

  async function createAnswer() {
    peerConnection.current = new RTCPeerConnection(servers);

    remoteStream.current = new MediaStream();
    remoteVideo.current.srcObject = remoteStream.current;

    localStream.current.getTracks().forEach((track) => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    peerConnection.current.ontrack = async (event) => {
      event.streams[0].getTracks().forEach((track) => {
        remoteStream.current.addTrack(track);
      });
    };

    let offer = JSON.parse(localDescription);
    await peerConnection.current.setRemoteDescription(offer);

    let answer = await peerConnection.current.createAnswer();
    await peerConnection.current.setLocalDescription(answer);

    setRemoteDescription(JSON.stringify(answer));
    socket.emit("receive-call", { desc: answer, roomName: ROOM });
    setIsReceiving(false)
  }

  async function endCall() {
    // socket.close()
    peerConnection.current.close()
  }

  useEffect(() => {
    socket.on("new-user", (data) => {
      setIsCalling(true)
      console.log("new user joined");
    });

    socket.on("call-user", (data) => {
      console.log("Incoming call...");
      setLocalDescription(JSON.stringify(data.desc));
      setIsCalling(false)
      setIsReceiving(true)
    });

    socket.on("receive-call", (data) => {
      console.log("Outgoing call received...");
      peerConnection.current.setRemoteDescription(data.desc);
      setRemoteDescription(JSON.stringify(data.desc));
    });

    socket.on("remove-user",(data)=>{
      setIsCalling(false)
    })
  }, [socket]);

  useEffect(() => {
    startVideo();
  }, []);

  return (
    <div className="app">
      <div className="videos">
        <video ref={localVideo} muted autoPlay></video>
        <video ref={remoteVideo} autoPlay></video>
      </div>

      <div className="btns">
        {isCalling && <button onClick={createOffer}>Call</button>}
        {isReceiving && <button onClick={createAnswer}>Receive</button>}
        {(!isCalling && !isReceiving) && <button onClick={endCall}>End Call</button>}
      </div>
    </div>
  );
}

export default VideoCall;
