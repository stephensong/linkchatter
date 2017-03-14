var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;
var sha256 = require('js-sha256').sha224;


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


app.get('/', function(request, response) {
    response.render('pages/index')
});


app.get('/get-link', function(req, res){

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    var ipNumber = ip.replace(/[^0-9]/g, '');
    ipNumber = parseInt(ipNumber);

    var roomID ='0'+(+ new Date())+ipNumber;

    var b = new Buffer(roomID);

    var roomHash = b.toString('base64').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    res.send({
        conversation_id:roomHash+':'+sha256(roomHash+''+keySalt)
    });

});
app.get(/^\/chat\/([a-zA-Z0-9]+):([a-zA-Z0-9]+)$/, function(request, response){

    response.render('pages/chat')
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

    pool.query('INSERT INTO history (user_id, room, text, timestamp) VALUES ($1,$2,$3,$4);', [socket.id, getRoomID(socket), data.message, (+new Date())], function(err, result) {
        if (err)
        { console.error(err); response.send("Error " + err); }
    });
}

io.sockets.on('connection', function(socket) {

    sendToMe(socket,{type:'hello',id:socket.id});

    socket.on('join_to_room', function(data) {

        try{
            var roomID = (data.room);
            var key = sha256(roomID+''+keySalt);
            var roomName = 'conversation-'+roomID;

            if (data.key == key) {
                socket.join(roomName, function () {
                    sendToMyRooms(socket, {
                        type:'new_user',
                        count:io.sockets.adapter.rooms[roomName].length
                    });

                });

            }else{
                sendToMe(socket,{type:'wrong_key'});
            }
        }catch(e){}
    });

    socket.on('message', function(data) {
        data.user_id = socket.id;
        sendToMyRooms(socket, data);

        insetToHistory(socket, data);

    });
});



app.get('/db', function (request, response) {

    pool.query('SELECT * FROM test_table', function(err, result) {
        if (err)
        { console.error(err); response.send("Error " + err); }
        else
        { response.render('pages/db', {results: result.rows} ); }
    });

});


http.listen(port, function(){
    console.log('listening on *:' + port);
});
