import { useEffect, useRef, useState, useMemo } from 'react'
import io from 'socket.io-client'
import axios from 'axios'
import './VideoCall.css'

const servers = {
  iceServers:[
      {
          urls:['stun:stun1.1.google.com:19302', 'stun:stun2.1.google.com:19302']
      }
  ]
}

let HOSTNAME = 'http://localhost:5500'
let ROOM = "sample"
let userName = "tom"

function App() {
  
  const socket = useMemo(() => io(HOSTNAME, {query:{ roomId:ROOM, playerName: userName }}), [ROOM, userName]);
  const [localDescription,setLocalDescription] = useState("")
  const [remoteDescription,setRemoteDescription] = useState("")

  const peerConnection = useRef();

  const localVideo = useRef();
  const remoteVideo = useRef();

  const localStream = useRef();
  const remoteStream = useRef();

  async function startVideo() {
    localStream.current = await navigator.mediaDevices.getUserMedia({video:true, audio:false});
    localVideo.current.srcObject = localStream.current;
  }

  async function createOffer() {
    peerConnection.current = new RTCPeerConnection(servers)

    remoteStream.current = new MediaStream()
    remoteVideo.current.srcObject = remoteStream.current

    localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current)
    })

    peerConnection.current.ontrack = async (event) => {
      event.streams[0].getTracks().forEach((track) => {
          remoteStream.current.addTrack(track)
      })
    }

    peerConnection.current.addEventListener('icecandidate', event => {
      if (event.candidate) {
          setLocalDescription(JSON.stringify(peerConnection.current.localDescription))
          console.log(typeof(peerConnection.current.localDescription))
          socket.emit("call-user",{desc:peerConnection.current.localDescription,roomName:ROOM})
      }
    });
    
    let offer = await peerConnection.current.createOffer()
    await peerConnection.current.setLocalDescription(offer)
    setLocalDescription(JSON.stringify(offer))

    // let data = await axios.post("http://localhost:5500/save-udp",{socketId:socket.id,desc:offer,roomName:ROOM})
    // console.log(data);
    // socket.emit("call-user",{desc:JSON.parse(localDescription),roomName:ROOM})
  }

  async function createAnswer() {

    peerConnection.current = new RTCPeerConnection(servers)

    remoteStream.current = new MediaStream()
    remoteVideo.current.srcObject = remoteStream.current

    localStream.current.getTracks().forEach((track) => {
        peerConnection.current.addTrack(track, localStream.current)
    })

    peerConnection.current.ontrack = async (event) => {
      event.streams[0].getTracks().forEach((track) => {
          remoteStream.current.addTrack(track)
      })
    }

    let offer = JSON.parse(localDescription)
    await peerConnection.current.setRemoteDescription(offer)
    
    let answer = await peerConnection.current.createAnswer()
    await peerConnection.current.setLocalDescription(answer)

    // setLocalDescription(JSON.stringify(answer))
    setRemoteDescription(JSON.stringify(answer))
    socket.emit("receive-call",{desc:answer,roomName:ROOM})
  }

  async function addAnswer() {
    if(!peerConnection.current.currentRemoteDescription){
      let answer = JSON.parse(remoteDescription)
      await peerConnection.current.setRemoteDescription(answer)
    }
    // await peerConnection.current.setLocalDescription(JSON.parse(localDescription))
    // await peerConnection.current.setRemoteDescription(JSON.parse(remoteDescription))
  }

  useEffect(()=>{

    socket.on("new-user",(data)=>{
      console.log("new user joined")
    })

    socket.on("call-user",(data)=>{
      console.log("Incoming call...")
      // console.log(data.desc)
      // setRemoteDescription(JSON.stringify(data.desc))
      setLocalDescription(JSON.stringify(data.desc))
      // createAnswer(data.desc)
    })

    socket.on("receive-call",(data)=>{
      console.log("Outgoing call received...")
      peerConnection.current.setRemoteDescription(data.desc)
      setRemoteDescription(JSON.stringify(data.desc))
    })

  },[socket])

  useEffect(()=>{
    startVideo()
  },[])


  return (
    <div className='app'>
    <div>
      <video ref={localVideo} autoPlay></video>
      <video ref={remoteVideo} autoPlay></video>
    </div>

    <button onClick={createOffer}>Create Offer</button>
    <textarea onChange={(e)=>setLocalDescription(e.target.value)} value={localDescription}></textarea>

    <button onClick={createAnswer}>Receive</button>
    <textarea onChange={(e)=>setRemoteDescription(e.target.value)} value={remoteDescription}></textarea>

    <button onClick={addAnswer}>Add Answer</button>
    </div>
  )
}

export default App
