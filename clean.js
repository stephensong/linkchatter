var pg = require('pg');
var async = require('async');

var pool = new pg.Client(process.env.DATABASE_URL);
var client= undefined;

var timestamp = (+new Date());

timestamp -= 2*24*60*60*1000;

var calls = [];

calls.push(function (callback) {
    pool.connect(function(err, _client, done) {
        client = _client;

        pool.query('DELETE FROM history WHERE timestamp < $1', [timestamp], function(err, result) {
            if (err)
            { console.error(err); }
            else
            { console.log('cleaned'); }

            callback(null);
        });

    });
});

async.parallel(calls, function(err, result) {
    /* this code will run after all calls finished the job or
     when any of the calls passes an error */
    if (err)
        return console.log(err);

    console.log('ended');
    process.exit(0);
});
