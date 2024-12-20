// require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
const multer = require("multer");
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');
const {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers
} = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);
const PORT = process.env.PORT || 3000;

app.set('views', path.join('./views'));

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

// Set static folder
var fetchRouter = require('./utils/fetch-route');
app.use('/', fetchRouter);

app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({
    extended: true
}));
mongoose.createConnection('mongodb://127.0.0.1:27017/mydb', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});
var db = mongoose.connection;

db.on('error', () => console.log("Error in Connecting to Database"));
db.once('open', () => console.log("Connected to Database"))

app.post("/sign_up", (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var phno = req.body.phno;
    var password = req.body.password;

    var data = {
        "name": name,
        "email": email,
        "phno": phno,
        "password": password
    }

    db.collection('users').insertOne(data, (err, collection) => {
        if (err) {
            throw err;
        }
        console.log("Record Inserted Successfully");
    });

    return res.redirect('success_patient.html')

})


// app.get("/patient", (req, res) => {
//     res.redirect('pt_index.html');
// })

const doctor_registration_form = multer();

app.post("/doctor_registeration",doctor_registration_form.none(), (req, res) => {
    var name = req.body.name;
    var password = req.body.password;
    var email = req.body.email;
    var phno = req.body.phno;
    var speciality = req.body.speciality;
    var regNo = req.body.regno;

    var data = {

        "name": name,
        "email": email,
        "phno": phno,
        "password": password,
        "speciality": speciality,
        "registeration": regNo
    }

    // console.log(data);

    db.collection('doctors').insertOne(data, (err, collection) => {
        if (err) {
            console.error("Error inserting record:", err);
            return res.status(500).send("Error occurred while inserting data.");
        }
        console.log("Record Inserted Successfully");
        return res.status(200).json({ message: "Registration successful. You can consult your patient.", redirect: "onlineConsultation.html" });
    });
})

app.post("/booking", (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var phno = req.body.phno;
    var symptoms = req.body.symptoms;

    var data = {
        "name": name,
        "email": email,
        "phno": phno,
        "symptoms": symptoms
    }

    db.collection('users_appt').insertOne(data, (err, collection) => {
        if (err) {
            throw err;
        }
        console.log("Record Inserted Successfully");
    });

    return res.redirect('chat_page_patient.html')

})

// app.get("/getdoctors", (req, res) => {
//     // var  special = res.body.speciality;
//     db.collection('doctors').find({
//             speciality: req.params.speciality
//         }),
//         function(err, result) {
//             if (err) throw err;
//             // res.json(result);
//             console.log(result);
//             // db.close();
//         };

// })

// var schema = new mongoose.Schema({
//     name : String,
//     origin : String,
//     destination : String,
//     estimatedTimeOfArrival : String,
//     date : String,
//     time : String
//   }) 
// var detailsModel = mongoose.model("detailsModel", schema);

// app.get("/getdoctors", function(req, res) {
//     detailsModel.find({}, function(err, allDetails) {
//         if (err) {
//             console.log(err);
//         } else {
//             res.render("details", { details: allDetails })
//         }
//     })
// })

// app.get('/getdoctors', function(req, res) {
//     db.collection('doctors', function(err, data) {
//         if (err) {
//             throw err;
//         } else {
//             data.find();
//             res.render('details', { data: data });
//         }
//     })
// })


const botName = 'ChatFirst Bot';

// Run when client connects
io.on('connection', socket => {
    socket.on('joinRoom', ({ username, room }) => {
        const user = userJoin(socket.id, username, room);

        socket.join(user.room);

        // Welcome current user
        socket.emit('message', formatMessage(botName, 'Welcome to ChatFirst!'));

        // Broadcast when a user connects
        socket.broadcast
            .to(user.room)
            .emit(
                'message',
                formatMessage(botName, `${user.username} has joined the chat`)
            );

        // Send users and room info
        io.to(user.room).emit('roomUsers', {
            room: user.room,
            users: getRoomUsers(user.room)
        });
    });

    // file share connection
    socket.on("sender-join", function(data) {
        socket.join(data.uid);
    });
    socket.on("receiver-join", function(data) {
        socket.join(data.uid);
        socket.in(data.sender_uid).emit("init", data.uid);
    });
    socket.on("file-meta", function(data) {
        socket.in(data.uid).emit("fs-meta", data.metadata);
    });
    socket.on("fs-start", function(data) {
        socket.in(data.uid).emit("fs-share", {});
    });
    socket.on("file-raw", function(data) {
        socket.in(data.uid).emit("fs-share", data.buffer);
    })


    // Listen for chatMessage
    socket.on('chatMessage', msg => {
        const user = getCurrentUser(socket.id);

        io.to(user.room).emit('message', formatMessage(user.username, msg));
    });

    // Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if (user) {
            io.to(user.room).emit(
                'message',
                formatMessage(botName, `${user.username} has left the chat`)
            );

            // Send users and room info
            io.to(user.room).emit('roomUsers', {
                room: user.room,
                users: getRoomUsers(user.room)
            });
        }
    });
});



server.listen(PORT, () => console.log(`Server running on port ${PORT}`));