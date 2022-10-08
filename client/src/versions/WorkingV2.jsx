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

  const [isAudioOn,setIsAudioOn] = useState(true);
  const [isVideoOn,setIsVideoOn] = useState(true);

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
    // setIsCalling(true)
  }

  async function toggleVideo() {
    const videoTrack = localStream.current.getTracks().find(track=>track.kind == 'video');
    if (videoTrack.enabled) {
      videoTrack.enabled = false;
      setIsVideoOn(false)
    } else {
      videoTrack.enabled = true;
      setIsVideoOn(true)
    }
  }

  async function toggleAudio() {
    const audioTrack = localStream.current.getTracks().find(track=>track.kind == 'audio');
    if (audioTrack.enabled) {
      audioTrack.enabled = false;
      setIsAudioOn(false)
    } else {
      audioTrack.enabled = true;
      setIsAudioOn(true)
    }
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
      <nav>
        <div className="header">Zapp Caller</div>
        <button className="btn btn-danger">Exit</button>
      </nav>
      <div className="main">
      <div className="left">
        <div className="video-container">
          <video className="remote-video" ref={remoteVideo} muted autoPlay></video>
          <div className="remote-user-name">Tom</div>
        </div>
      </div>

      <div className="right">
        <div className="video-container-local">
          <video className="local-video" ref={localVideo} muted autoPlay></video>
          <div className="local-user-name">Tom</div>
        </div>
      <div className="media-controls">
        {!isVideoOn ? <button className="btn btn-danger" onClick={toggleVideo}><i className="fa-solid fa-video-slash"></i></button>:<button className="btn btn-primary" onClick={toggleVideo}><i className="fa-solid fa-video"></i></button>}
        {!isAudioOn ? <button className="btn btn-danger" onClick={toggleAudio}><i className="fa-solid fa-microphone-slash"></i></button>:<button className="btn btn-primary" onClick={toggleAudio}><i className="fa-solid fa-microphone"></i></button>}
      </div>

      <div className="call-controls">
        {isCalling && <button className="btn btn-success" onClick={createOffer}><i className="fa-solid fa-phone"></i></button>}
        {isReceiving && <button className="btn incoming-call" onClick={createAnswer}><i className="fa-solid fa-phone"></i></button>}
        {(!isCalling && !isReceiving) && <button className="btn btn-danger" onClick={endCall}><i className="fa-solid fa-phone-slash"></i></button>}
      </div>

      </div>
      </div>
    </div>
  );
}

export default VideoCall;
