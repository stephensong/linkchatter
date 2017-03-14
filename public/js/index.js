$(function () {
    var linkInput = $('#link');

    $.get('/get-link').done(function (data) {

        linkInput.val(window.location.href+'chat/'+data.conversation_id);
        linkInput.prop('disabled', false);
    });

    linkInput.on("click", function () {
        $(this).select();
    });
});

