var config = null;

// if (process.env.NODE_ENV==='production')
    config = require('./config.js');
// else
    // config = require('./config-dev.js');

var models = null;
var NodeModel = null;
var NodeDataModel = null;
var NodeInfoModel = null;

var nodes = {};
var nodeinfos = {};

var lat = 0, lng = 0;

module.exports = (http,app) => {

    models = app.get('db');
    NodeModel = models.node;
    NodeDataModel = models.nodedata;
    NodeInfoModel = models.nodeinfo;

    console.log("subs");
    var broker = app.get("mqtt_broker");
    broker.subscribe(app.get("mqtt_shared_base")+"car_position/latitude");
    broker.subscribe(app.get("mqtt_shared_base")+"car_position/longitude");

    broker.on("message", function(topic,data) {
        if (topic.startsWith(app.get("mqtt_shared_base")+"car_position")) {
            if (topic===app.get("mqtt_shared_base")+"car_position/latitude") {
                lat = parseFloat(data);
            }

            if (topic===app.get("mqtt_shared_base")+"car_position/longitude") {
                lng = parseFloat(data);
            }
        }
    });


    //load dependencies
    const weather = require('./j5net-weather.js')(app);
    const mqtt2db = require('./j5net-mqtt2db.js')(app);


    console.log("                     __        ______        __     ".yellow);
    console.log("  __                /\\ \\__    /\\  ___\\     /'__`\\   ".yellow);
    console.log(" /\\_\\    ___      __\\ \\ ,_\\   \\ \\ \\__/    /\\ \\/\\ \\  ".yellow);
    console.log(" \\/\\ \\ /' _ `\\  /'__`\\ \\ \\/    \\ \\___``\\  \\ \\ \\ \\ \\ ".yellow);
    console.log("  \\ \\ \\/\\ \\/\\ \\/\\  __/\\ \\ \\_    \\/\\ \\_\\ \\__\\ \\ \\_\\ \\".yellow);
    console.log("  _\\ \\ \\ \\_\\ \\_\\ \\____\\\\ \\__\\    \\ \\____/\\_\\\\ \\____/".yellow);
    console.log(" /\\ \\_\\ \\/_/\\/_/\\/____/ \\/__/     \\/___/\\/_/ \\/___/ ".yellow);
    console.log(" \\ \\____/                                           ".yellow);
    console.log("  \\/___/                                            ".yellow);


    var io = require('socket.io')(http);

    io.on('connection', function (socket) {
        console.log("[websocket] new connection".cyan);

        socket.on('node-detail', function (data) {
            //console.log("frontend asked for details");

            NodeDataModel.find(
                {
                    "time"  : {"$gte": new Date(data.start).toISOString(),"$lte" : new Date(data.end).toISOString()},
                    "id"    : data.id
                })
                .sort('time')
                .exec(
                function (dberr,dbres){
                    if (!dberr && dbres) {

                        var res = {}, tmin, tmax;

                        if (dbres[0] && dbres[0].data) {
                            tmin = JSON.parse(dbres[0].data).t;
                            tmax = JSON.parse(dbres[0].data).t;
                        }

                        for (i in dbres) {
                            res[dbres[i].time] = dbres[i].data;
                            if (dbres[i] && dbres[i].data) {
                                var tres = JSON.parse(dbres[i].data).t;
                                if (tres>tmax) tmax = tres;
                                if (tres<tmin) tmin = tres;
                            }
                        }

                        res["tmin"] = tmin;
                        res["tmax"] = tmax;

                        console.log("sending details");
                        // console.log("tmin="+tmin);
                        // console.log("tmax="+tmax);
                        socket.emit('node-detail',res);
                    }
                    else
                        console.log("query error");
                }
                );
        });


        /* web client asks for node list */

        socket.on('nodes', function (data) {
            // console.log('frontend asked for nodes');
            // initialization of nodes & nodeinfos based on database

            NodeModel.find({}, function (err,res){
                if (!err && res) {
                    for (var i in res) {
                        // ugly object clone
                        var obj = JSON.parse(JSON.stringify(res[i]));
                        delete obj._id;
                        delete obj.__v;
                        obj.lastData = JSON.parse(obj.lastData);
                        // console.log(obj);
                        if (nodeinfos[obj.id]) {
                            obj.name = nodeinfos[obj.id].name;
                        }
                        else {
                            obj.name = "unknown";
                        }
                        nodes[obj.id] = obj;
                        delete nodes[obj.id].id;
                    }
                    socket.emit("nodes",nodes);
                }
            });
        });

        socket.on('car-position', function (data) {
            socket.emit("car-position",{lat:lat,lng:lng});
            console.log("car position asked");
        });
    });


    // initialize naming of the nodes

    NodeInfoModel.find({}, function (err,res){
        if (!err && res) {
            for (var i in res) {
                var obj = {name : res[i].name};
                nodeinfos[res[i].id] = obj;
            }
        }
    });
}
