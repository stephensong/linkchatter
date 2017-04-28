var sha256 = require('js-sha256').sha224;
var favicon = require('serve-favicon');
var path = require('path');
var bodyParser = require('body-parser');
var socket = require('./socket');
var config = require('./config');

var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.use(favicon(path.join(__dirname+'/../','public','favicon.ico')));
app.set('port', (process.env.PORT || 3000));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname+'/../' + '/public'));
app.set('views', __dirname+'/../' + '/views');
app.set('view engine', 'ejs');


var run = function () {
    socket.registerBehavior(io);

    app.use(function(error, req, res, next) {
        if (error){
            console.log(error);
            res.send({
                error:true
            });
        }
    });

    http.listen(config.port, function(){
        console.log('listening on *:' + config.port);
    });
};

module.exports = {
    app:app,
    config:config,
    io:io,
    http:http,
    run:run
};