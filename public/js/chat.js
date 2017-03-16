
$(function () {

    var colorHash = new ColorHash();

    var roomIdRegex = /^\/chat\/([a-zA-Z0-9]+):([a-zA-Z0-9]+)/;

    var roomMath = window.location.pathname.match(roomIdRegex);

    var room = roomMath[1];
    var key = roomMath[2];

    var socket = io();

    var myID = undefined;

    // let's assume that the client page, once rendered, knows what room it wants to join
    var roomID = room+":"+key;

    socket.on('connect', function() {
        // Connected, let's sign-up for to receive messages for this room
        socket.emit('join_to_room', {
            room:room,
            key:key
        });
    });
    function formatText(timestamp) {
        var time = moment.unix(timestamp/1000);
        var timestampNow = new Date().getDate() / 1000;

        if (timestamp<timestampNow-60*60*24){
            return time.format('DD-MM-YY HH:mm');
        }else{
            return time.format('HH:mm');
        }
    }

    function addMessage(data) {
        var $messsage = $('<li class="'+data.type+'">');

        if (data.user_id == myID) {
            $messsage.addClass('me');
        }


        var $info = $('<div class="info">');
        $info.append($('<div class="user">').text(data.user_id));
        $info.append($('<div class="time">').text(
            formatText(data.timestamp)
        ));
        $messsage.append($info);

        if (data.user_id != undefined) {
            var icon = $('<div class="icon">').append('<i class="fa fa-user">');
            icon.css('background', colorHash.hex(data.user_id));
            $messsage.append(icon);
        }
        var message = $('<div class="message">').text(data.message);
        $messsage.append(message);

        $('#messages').append($messsage);
        window.scrollTo(0, document.body.scrollHeight);
    }

    function makeHistory(rows) {
        $('#messages').html('');
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];

            row.message = row.text;

            addMessage(row);
        }
    }

    socket.on('message', function(data) {

        console.log(data);

        if (data.type == 'message') {
            addMessage(data);
        }else if (data.type == 'new_user' && myID != undefined && data.user_id != myID) {
            addMessage({type: 'new_user', 'message': 'New user joined to the conversation'});
        }else if (data.type == 'wrong_key') {
            addMessage({
                type: 'error',
                message: 'Your key is invalid!'
            });
        }else if (data.type == 'hello') {
            setUp(data);
        }else if (data.type == 'history') {
            makeHistory(data.data);
        }

    });
    var $val = $('#m');

    function enableChatting() {
        $val.prop('disabled', false);
        $('#m_send').prop('disabled', false);
    }

    function setUp(data) {
        myID = data.id;
        enableChatting();
    }


    $('form').submit(function(){

        if ($val.val() == '') return;

        socket.emit('message', {
            type:'message',
            message:$val.val()
        });
        $val.val('');
        return false;
    });

    $val.focus();
});