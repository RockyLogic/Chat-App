const path = require("path")
const http = require("http")
const express = require("express")
const socketio = require("socket.io")
const Filter = require("bad-words")
const { generateMessage, generateLocationMessage } = require("./utils/messages")
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users")

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, "../public")

app.use(express.static(publicDirectoryPath))

let count = 0

io.on("connection", (socket) => {
    console.log('New WebSocket Connection');

    socket.on("join", ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })
        if (error) {
            return callback(error);
        }
        socket.join(user.room)

        socket.emit("message", generateMessage("Bot", "Welcome!"))
        socket.broadcast.to(user.room).emit("message", generateMessage("Bot", `${user.username} has joined!`))
        io.to(user.room).emit("roomData", {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on("sendMessage", (msg, callback) => {
        const user = getUser(socket.id)

        const filter = new Filter()
        if (filter.isProfane(msg)) {
            return callback("No Profanity Please")
        }

        io.to(user.room).emit("message", generateMessage(user.username, msg))
        callback()
    })

    socket.on("sendLocation", (position, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit("locationMessage", generateLocationMessage(user.username, `https://www.google.com/maps?q=${position.latitude},${position.longitude}`))
        callback()
    })

    socket.on("disconnect", () => {
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit("message", generateMessage("Bot", `${user.username} has Disconnected`))
            io.to(user.room).emit("roomData", {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
})

server.listen(port, () => {
    console.log("[Server] Started on port:", port);
})