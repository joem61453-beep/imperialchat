const express = require('express');
const app = express();
const http = require('http').createServer(app);
const cors = require('cors');
const io = require('socket.io')(http, { cors: { origin: "*" } });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

app.use(cors());

// 1. DATABASE CONNECTION
mongoose.connect('mongodb+srv://ianpro717m_db_user:Ian2026@cluster0.it5lgsw.mongodb.net/imperialDB?retryWrites=true&w=majority')
    .then(() => console.log("ImperialChat DB Connected"))
    .catch(err => console.log("DB Error:", err));

// 2. DATA MODELS
const User = mongoose.model('User', new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}));

// 3. HOME ROUTE (To stop "Cannot GET" error)
app.get('/', (req, res) => res.send('ImperialChat Server is LIVE!'));

// 4. CHAT LOGIC
let onlineUsers = {}; 

io.on('connection', (socket) => {
    socket.on('signup', async (data) => {
        try {
            const hash = await bcrypt.hash(data.password, 10);
            await new User({ username: data.username, password: hash }).save();
            socket.emit('auth-res', { success: true, user: data.username });
        } catch (e) { socket.emit('auth-res', { success: false, msg: "User exists" }); }
    });

    socket.on('login', async (data) => {
        const user = await User.findOne({ username: data.username });
        if (user && await bcrypt.compare(data.password, user.password)) {
            onlineUsers[socket.id] = user.username;
            socket.emit('auth-res', { success: true, user: user.username });
            io.emit('update-users', onlineUsers);
        } else { socket.emit('auth-res', { success: false, msg: "Wrong login" }); }
    });

    socket.on('send-msg', (data) => {
        for (let [id, name] of Object.entries(onlineUsers)) {
            if (name === data.to) io.to(id).emit('new-msg', data);
        }
    });

    socket.on('disconnect', () => {
        delete onlineUsers[socket.id];
        io.emit('update-users', onlineUsers);
    });
});

http.listen(process.env.PORT || 3000, () => console.log("Imperial Server Running"));
