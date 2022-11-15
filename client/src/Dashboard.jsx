import { useState } from "react";
import "./Dashboard.css";
import VideoCall from "./VideoCall";

// const HOSTNAME = "http://localhost:5500";
const HOSTNAME = "https://video-caller-server.up.railway.app";

function Dashboard() {
  const [userName, setUserName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomValidation, setRoomValidation] = useState(false);

  async function createRoom(e) {
    e.preventDefault();
    let flag = validateFields()

    if(flag) {
      let rooms = await fetchData();
      
      if(!rooms[roomName]){
        setRoomValidation(true)
      } else {
        alert("Room already exists...")
      }
    }
  }

  async function joinRoom(e) {
    e.preventDefault();
    let flag = validateFields()
    if(flag){
      let rooms = await fetchData();
      if(rooms[roomName]) {
        if(rooms[roomName].player1.playerName !== null && rooms[roomName].player2.playerName !== null) {
          alert("Room is full...")
        } else {
          setRoomValidation(true)
        }
      } else {
        alert("Room does not exists...")
      }
    }
  }

  async function fetchData() {
    let data = fetch(`${HOSTNAME}/rooms/`).then((res) => res.json());
    return data;
  }

  function validateFields() {
    if(userName.length !== 0 && roomName.length !== 0) {
      return true
    }
    return false
  }

  return (
    <>
      {
        !roomValidation ? (
          <div className="main-page">
            <div className="main-logo">Zapp Caller</div>
            <div className="join-modal">
              <form className="join-form">
                <div className="input-wrapper">
                  <label htmlFor="user-name">Enter Username</label>
                  <input
                    placeholder="Enter your name"
                    required
                    id="user-name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                </div>
                <div className="input-wrapper">
                  <label htmlFor="room-name">Enter Room</label>
                  <input
                    placeholder="Enter room name"
                    required
                    id="room-name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                </div>
                <div className="join-btns">
                  <button className="btn btn-primary" onClick={joinRoom}>
                    Join Room
                  </button>
                  <button className="btn btn-success" onClick={createRoom}>
                    Create Room
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <VideoCall ROOM={roomName} userName={userName} setRoomValidation={setRoomValidation} />
        )
      }
    </>
  );
}

export default Dashboard;