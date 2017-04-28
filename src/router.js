var controller = require('./controller');


var registerRoutes = function (app) {
    app.get('/api/v1/get-link', controller.getLinkPage);

    app.post('/api/v1/message', controller.messagePage);

    app.get('/', controller.indexPage);

    app.get(/^\/chat\/.+$/, controller.chatPage);

    app.get(/api/, controller.apiPage);
};

module.exports = {
    setConfig:controller.setConfig,
    registerRoutes:registerRoutes
};