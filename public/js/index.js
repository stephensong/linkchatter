$(function () {
    $.get('/get-link').done(function (data) {
        console.log(data);
    });
});