const express = require("express");
const cors = require("cors");
const app = express();
const http = require("http");
const bodyParser = require("body-parser")

const PORT = process.env.PORT || 5500
// const PORT = 5500;

app.use(cors());
app.use(bodyParser.json())
const server = http.createServer(app);

const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

const rooms = {};

app.get("/", (req, res) => {
  res.send("Server running...");
});

io.on("connection", (socket) => {
  let roomId = socket.handshake.query.roomId;
  let playerName = socket.handshake.query.playerName;
  let socketId = socket.id;

  let validation = validateRoom(roomId, playerName, socketId);
  
  if (validation) {
    console.log(
      `${playerName} with socket id ${socketId} connected to room : ${roomId}`
    );
    socket.join(roomId);
    io.to(roomId).emit("new-user", rooms[roomId]);
    // socket.to(roomId).emit("new-user", rooms[roomId]);
  } else {
    console.log("Room is full");
  }

  socket.on("disconnect", () => {
    console.log(`user disconnected --> ${socket.id}`);
    let [roomDisconneted,playerDisconnected] = deletePlayer(socket.id);
    if(roomDisconneted !== null) {
      io.to(roomDisconneted).emit("remove-user", playerDisconnected);
    }
  });

  socket.on("chat", (data) => {
    socket.to(data.roomName).emit("chat", data);
  });

  socket.on("call-user", (data) => {
    console.log("calling")
    // console.log(data)
    socket.to(data.roomName).emit("call-user", data);
  });

  socket.on("receive-call", (data) => {
    console.log("received")
    // console.log(data.roomName)
    socket.to(data.roomName).emit("receive-call", data);
  });

  socket.on("end-call",(data)=>{
    socket.to(data.roomName).emit("end-call",data);
  })

});

app.get("/rooms", (req, res) => {
  res.json(rooms);
});

app.post("/save-udp",(req,res)=> {
  console.log("HEYYy")
  let roomName = req.body.roomName;
  let desc = req.body.desc;
  let socketId = req.body.socketId;

  console.log(req.body)
  console.log(rooms[roomName])

  if(rooms[roomName].player1["socketId"] == socketId) {
    rooms[roomName].player1["desc"] = desc;
  } else if(rooms[roomName].player2["socketId"] == socketId) {
    rooms[roomName].player2["desc"] = desc;
  } else {
    res.json({"message":"Failed"})
  }

  res.json({"message":"Success"})
})

server.listen(PORT, () => {
  console.log(`Server listening on port : ${PORT}`);
});

function validateRoom(roomId, playerName, socketId) {
  if (rooms[roomId] !== undefined) {
    console.log("Room exists");

    if (rooms[roomId].player1.playerName === null) {
      console.log("Adding to player1 slot");
      rooms[roomId] = {
        ...rooms[roomId],
        player1: { playerName: playerName, socketId: socketId },
      };
      return true;
    } else if (rooms[roomId].player2.playerName === null) {
      console.log("Adding to player2 slot");
      rooms[roomId] = {
        ...rooms[roomId],
        player2: { playerName: playerName, socketId: socketId },
      };
      return true;
    } else {
      // console.log("Room is full");
      return false;
    }
  } else {
    rooms[roomId] = {
      player1: { playerName: playerName, socketId: socketId },
      player2: { playerName: null, socketId: null },
    };
    console.log("Room created with player 1");
    return true;
  }
}

function deletePlayer(socketId) {
  let tempRoom = null
  let tempName = null
  for (let room in rooms) {
    if (rooms[room].player1.socketId === socketId) {
      tempName = rooms[room].player1.playerName
      rooms[room] = {
        player1: {
          playerName: null,
          socketId: null
        },
        player2: {
          playerName: rooms[room].player2.playerName,
          socketId: rooms[room].player2.socketId
        },
      };
      tempRoom = room
    }
    if (rooms[room].player2.socketId === socketId) {
      tempName = rooms[room].player2.playerName
      rooms[room] = {
        player1: {
          playerName: rooms[room].player1.playerName,
          socketId: rooms[room].player1.socketId
        },
        player2: {
          playerName: null,
          socketId: null
        },
      };
      tempRoom = room
    }
    if (
      rooms[room].player1.socketId === null &&
      rooms[room].player2.socketId === null
    ) {
      // console.log(tempName)
      delete rooms[room];
      return [null,null]
    }
  }
  // console.log(tempName)
  return [tempRoom, tempName]
  // console.log(rooms)
}
