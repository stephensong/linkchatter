$(function () {
    var linkInput = $('#link');
    var go_to_link = $('#go_to_link');

    $.get('/get-link').done(function (data) {

        linkInput.val(window.location.href+'chat/'+data.conversation_id);
        go_to_link.prop('href',window.location.href+'chat/'+data.conversation_id);
        linkInput.prop('disabled', false);
    });

    linkInput.on("click", function () {
        $(this).select();
    });
});

