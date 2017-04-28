var sha256 = require('js-sha256').sha224;
var chatFunctions = require('./chat');

var config = {};

var setConfig = function (config_) {
    config = config_;
};

var getLink = function(req, res){

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    var ipNumber = ip.replace(/[^0-9]/g, '');
    ipNumber = parseInt(ipNumber);

    var roomID ='0'+(+ new Date())+ipNumber;

    var b = new Buffer(roomID);

    var roomHash = b.toString('base64').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    res.send({
        conversation_id:roomHash,
        key:sha256(roomHash+''+config.keySalt)
    });

};
var message = function (request, response) {
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

    var __ret = chatFunctions.getRoomKey(data);
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


    chatFunctions.sendToMyRooms(pseudoSocket, message);

    chatFunctions.insetToHistory(pseudoSocket, message);

    response.send({
        'message':'send'
    });    // echo the result back
};
var index = function(request, response) {
    response.render('pages/index',{page: request.url})
};
var chat = function(request, response){

    response.render('pages/chat',{page: request.url})
};
var api = function(request, response){

    response.render('pages/api',{page: request.url})
};

module.exports = {
    setConfig:setConfig,
    getLinkPage:getLink,
    messagePage:message,
    indexPage:index,
    chatPage:chat,
    apiPage:api,
};