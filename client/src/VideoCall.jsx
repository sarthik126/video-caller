import { useEffect, useRef, useState, useMemo } from "react";
import io from "socket.io-client";
import "./VideoCall.css";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import sound from './assets/notification-1.mp3'

let HOSTNAME = "http://localhost:5500";

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
    },
  ],
};

function VideoCall({ROOM, userName, setRoomValidation}) {
  const socket = useMemo(
    () => io(HOSTNAME, { query: { roomId: ROOM, playerName: userName } }),
    [ROOM, userName]
  );

  const [remoteUserName,setRemoteUserName] = useState("Waiting...");

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

  let audioRef = new Audio(sound);

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

  async function copyRoomName() {
    navigator.clipboard.writeText(ROOM);
    toast(`ROOM NAME - ${ROOM} - COPIED !!`,{
      position: toast.POSITION.TOP_CENTER
    });
  }

  async function endCall(){
    peerConnection.current.close()
    socket.emit("end-call",{roomName:ROOM,socketId:socket.id})
    setIsCalling(true)
  }

  async function exitRoom() {
    peerConnection.current.close()
    setRoomValidation(false)
    socket.close()
  }

  async function playRingtone() {
    audioRef.play()
  }


  useEffect(() => {
    socket.on("new-user", (data) => {
      setIsCalling(true)
      console.log("new user joined");

      let newUserName = null;

      if(data?.player1?.socketId === socket.id){
        newUserName = data.player2.playerName;
      } else if (data?.player2?.socketId === socket.id) {
        newUserName = data.player1.playerName;
      } else {
        newUserName = "Waiting...";
      }

      if(newUserName !== null) {
        setRemoteUserName(newUserName)
        toast(`${newUserName} joined!!!`,{
          position: toast.POSITION.TOP_CENTER
        });
      }
    });

    socket.on("call-user", (data) => {
      playRingtone()
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
      setIsCalling(true)
      setRemoteUserName("Waiting...")
      toast(`${data} disconnected from the game !!!`,{
        position: toast.POSITION.TOP_CENTER
      });
    })

    socket.on("end-call",(data)=>{
      setIsCalling(true);
      setIsReceiving(false);
    })
  }, [socket]);

  useEffect(() => {
    startVideo();
  }, []);

  return (
    <div className="app">
      <ToastContainer className='toaster' />
      <nav>
        <div className="header">Zapp Caller</div>
        <div>
        <button className="btn btn-warning" onClick={copyRoomName}>Room</button>
        <button className="btn btn-danger" onClick={exitRoom}>Exit</button>
        </div>
      </nav>
      <div className="main">
      <div className="left">
        <div className="video-container">
          <video className="remote-video" ref={remoteVideo} autoPlay></video>
          <div className="remote-user-name">{remoteUserName}</div>
        </div>
      </div>

      <div className="right">
        <div className="video-container-local">
          <video className="local-video" ref={localVideo} muted autoPlay></video>
          <div className="local-user-name">{userName}</div>
        </div>
      <div className="media-controls">
        {!isVideoOn ? <button className="btn btn-danger" onClick={toggleVideo}><i className="fa-solid fa-video-slash"></i></button>:<button className="btn btn-primary" onClick={toggleVideo}><i className="fa-solid fa-video"></i></button>}
        {!isAudioOn ? <button className="btn btn-danger" onClick={toggleAudio}><i className="fa-solid fa-microphone-slash"></i></button>:<button className="btn btn-primary" onClick={toggleAudio}><i className="fa-solid fa-microphone"></i></button>}
      </div>

      <div className="call-controls">
        {isCalling && <button disabled={(remoteUserName === "Waiting...")} className="btn btn-success" onClick={createOffer}><i className="fa-solid fa-phone"></i></button>}
        {isReceiving && <button className="btn incoming-call" onClick={createAnswer}><i className="fa-solid fa-phone"></i></button>}
        {!(isCalling || isReceiving) && <button className="btn btn-danger" onClick={endCall}><i className="fa-solid fa-phone-slash"></i></button>}
      </div>

      </div>
      </div>
    </div>
  );
}

export default VideoCall;
