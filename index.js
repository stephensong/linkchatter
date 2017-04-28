var router = require('./src/router');
var chat = require('./src/chat_instance');


router.setConfig(chat.config);
router.registerRoutes(chat.app);


chat.run();