
$(function () {

    var colorHash = new ColorHash();

    var roomIdRegex = /^\/chat\/([a-zA-Z0-9]+)(:([a-zA-Z0-9]+))?(:(.+))?$/;

    var roomMath = window.location.pathname.match(roomIdRegex);

    var room = roomMath[1];
    var key = roomMath[3];
    var nickname = decodeURIComponent(roomMath[5]);

    console.log(nickname);
    var myID = undefined;

    var $input_screen = $('#input_screen');

    function showInputScreen() {
        var $key = $('#input_key_field');
        var $nickname = $('#input_nickname_field');

        if (key == undefined || key == ''){
            $key.show();
            $input_screen.show();
        }else{
            $key.hide();
        }

        if (nickname == undefined || nickname == '' || nickname == 'undefined'){
            $nickname.show();
            $input_screen.show();
        }else{
            $nickname.hide();
        }

    }

    $input_screen.submit(function (e) {
        e.preventDefault();
        submitInputScreen();
    });

    function submitInputScreen() {
        var $key = $('#input_key').val();
        var $nickname = $('#input_nickname').val();

        if ((key == undefined || key == '') && $key != ''){
            key = $key;
        }

        if ((nickname == undefined || nickname == '' || nickname == 'undefined') && $nickname != ''){
            nickname = $nickname;
        }

        checkRequirements();

    }
    function startChat() {
        var socket = io();

        // let's assume that the client page, once rendered, knows what room it wants to join
        var roomID = room+":"+key;

        socket.on('connect', function() {
            // Connected, let's sign-up for to receive messages for this room
            socket.emit('join_to_room', {
                room:room,
                key:key
            });
        });

        function welcomeText() {
            addMessage({
                type:'message',
                message:'You can now chat!'
            })
        }
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

            var messageNickname = data.nickname;

            if (messageNickname == undefined){
                messageNickname = data.user_id;
            }

            var $info = $('<div class="info">');
            if (messageNickname != undefined) {
                $info.append($('<div class="user">').text(messageNickname));
            }

            if (data.timestamp != undefined) {
                $info.append($('<div class="time">').text(
                    formatText(data.timestamp)
                ));
            }
            $messsage.append($info);

            if (data.user_id != undefined && data.user_id != 'api') {
                var icon = $('<div class="icon">').append('<i class="fa fa-fw fa-user">');
                icon.css('background', colorHash.hex(data.user_id));
                $messsage.append(icon);
            }else if (data.user_id != undefined && data.user_id == 'api') {
                icon = $('<div class="icon">').append('<i class="fa fa-fw fa-envelope">');
                icon.css('background', '#da5500');
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
            welcomeText();
        }

        socket.on('message', function(data) {

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
            }else if (data.type == 'disconnect') {
                addMessage({
                    type: 'warning',
                    message: 'Someone left the conversation!'
                });
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
                message:$val.val(),
                nickname:nickname
            });
            $val.val('');
            return false;
        });

        $val.focus();
    }

    function checkRequirements() {
        if (
            room != undefined && room != '' &&
            key != undefined && key != '' &&
            nickname != undefined && nickname != '' && nickname != 'undefined'
        ){
            $input_screen.hide();
            startChat();
            return true;
        }else {
            showInputScreen();
            return false;
        }
    }

    checkRequirements();
});