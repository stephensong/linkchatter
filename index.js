var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var sha256 = require('js-sha256').sha224;
var favicon = require('serve-favicon');
var path = require('path');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

app.use(favicon(path.join(__dirname,'public','favicon.ico')));

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());


var pg = require('pg');

app.set('port', (process.env.PORT || 3000));
var keySalt = process.env.APP_KEY || 'testowy';
var registerHistory = process.env.REGISTER_HISTORY || 'false';
app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


var pool = new pg.Client(process.env.DATABASE_URL);
var client= undefined;

pool.connect(function(err, _client, done) {
    client = _client;
});




app.get('/api/v1/get-link', function(req, res){

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    var ipNumber = ip.replace(/[^0-9]/g, '');
    ipNumber = parseInt(ipNumber);

    var roomID ='0'+(+ new Date())+ipNumber;

    var b = new Buffer(roomID);

    var roomHash = b.toString('base64').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    res.send({
        conversation_id:roomHash,
        key:sha256(roomHash+''+keySalt)
    });

});

app.post('/api/v1/message', function (request, response) {
    var data = request.body;

    var requiredFields = ['key','conversation_id','message','nickname'];
    var fieldsNotInData = [];

    for (var i = 0; i < requiredFields.length; i++) {
        var field = requiredFields[i];
        if (!data.hasOwnProperty(field) || typeof data[field] !== 'string') fieldsNotInData.push(field);
    }

    if (fieldsNotInData.length>0) {
        response.send({
            'required_string_fields': fieldsNotInData,
        });
        return;
    }

    data.room = data.conversation_id;

    var __ret = getRoomKey(data);
    var key = __ret.key;
    var roomName = __ret.roomName;

    if (data.key != key) {
        response.send({
            'key': 'wrong_key',
        });
        return;
    }

    var message = {
        type:'message',
        user_id:'api',
        nickname:data.nickname,
        message:data.message,
        timestamp:(+new Date())
    };

    var pseudoSocket = {
        id:message.user_id,
        rooms:{}
    };

    pseudoSocket.rooms[roomName] = {id:roomName};


    sendToMyRooms(pseudoSocket, message);

    insetToHistory(pseudoSocket, message);

    response.send({
        'message':'send'
    });    // echo the result back
});

app.get('/', function(request, response) {
    response.render('pages/index',{page: request.url})
});

app.get(/^\/chat\/.+$/, function(request, response){

    response.render('pages/chat',{page: request.url})
});

app.get(/api/, function(request, response){

    response.render('pages/api',{page: request.url})
});


function sendToMyRooms(socket, data) {
    for (var room in socket.rooms) {
        if (room == socket.id) continue;

        io.sockets.in(room).emit('message', data);
    }
}

function getRoomID(socket) {
    for (var room in socket.rooms) {
        if (room == socket.id) continue;

        return room;
    }
}

function sendToMe(socket, data) {
    io.sockets.in(socket.id).emit('message', data);
}

function insetToHistory(socket, data) {
    if (!registerHistory) return;

    pool.query('INSERT INTO history (user_id, nickname, room, text, timestamp) VALUES ($1,$2,$3,$4,$5);', [socket.id,data.nickname || '', getRoomID(socket), data.message, (+new Date())], function(err, result) {
        if (err)
        { console.error(err); }
    });
}

function sendHistory(socket) {
    if (!registerHistory) return;

    pool.query('SELECT * FROM history WHERE room LIKE $1 ORDER BY timestamp DESC LIMIT 10;', [getRoomID(socket)], function(err, result) {
        if (err) {
            console.error(err);
        } else {
            sendToMe(socket, {
                type:'history',
                data:result.rows
            });
        }
    });
}

var getRoomKey = function (data) {
    var roomID = (data.room);
    var key = sha256(roomID + '' + keySalt);
    var roomName = 'conversation-' + roomID;
    return {key: key, roomName: roomName};
};

io.sockets.on('connection', function(socket) {

    sendToMe(socket,{type:'hello',id:socket.id});

    socket.on('join_to_room', function(data) {

        try{
            var __ret = getRoomKey(data);
            var key = __ret.key;
            var roomName = __ret.roomName;

            if (data.key == key) {
                socket.join(roomName, function () {
                    socket.nickname = data.nickname;

                    sendToMyRooms(socket, {
                        type:'new_user',
                        user_id:socket.id,
                        count:io.sockets.adapter.rooms[roomName].length,
                        nickname:socket.nickname
                    });

                    sendHistory(socket);

                    socket.on('disconnect', function() {

                        io.sockets.in(roomName).emit('message',{
                            type:'disconnect',
                            user_id:socket.id,
                            nickname:socket.nickname
                        });

                    });

                });

            }else{
                sendToMe(socket,{type:'wrong_key'});
            }
        }catch(e){}
    });

    socket.on('message', function(data) {
        data.user_id = socket.id;
        data.timestamp = (+new Date());
        sendToMyRooms(socket, data);

        if (data.hasOwnProperty('register_history') && data.register_history == false) return;

        insetToHistory(socket, data);

    });
});


app.use(function(error, req, res, next) {
    if (error){
        console.log(error);
        res.send({
            error:true
        });
    }
});

http.listen(port, function(){
    console.log('listening on *:' + port);
});
