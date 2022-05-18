const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');
const serveIndex = require('serve-index')
//const bodyParser = require('body-parser');
//const cookieParser = require('cookie-parser');
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
const port = 2000

const functions = require('./functions.js')
const pm2 = require('./pm2.js')
var pm2Data = null

//static file
app.use('/files', express.static("../Code"), serveIndex("../Code", { 'icons': true, "template": functions.template, view: "details" }));
app.use('/publicNew', express.static("../Code"), serveIndex("../Code", { 'icons': true, view: "details" }));

//assests folder
app.use('/assets', express.static("./assets"));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname + '/assets/main.htm'));
})
//socket
io.on('connection', (socket) => {
    const IP = socket.handshake.address.replace("::ffff:", "");
    //Basic stuff
    console.log(`A user connected! IP: ${IP}`);
    socket.on('disconnect', () => {
        console.log(`A user disconnected! IP: ${IP}`);
    });

    //The Bussiness
    socket.on("getFileInfo", async (data) => {
        //console.log(data)
        console.log("getFileInfo")
    })

    socket.on("makeNodeApp", (data) => {
        const pathFile = data.data.path
        const file = data.selFiles
        const name = data.nodeName
        console.log(`makeNodeApp ${name} ${pathFile} ${file}`)
        pm2.startApp(name, file, pathFile)
    })

    socket.on("refresh", async (data) => {
        functions.refresh(socket, data, pm2Data)
    })

    socket.on("start", async (data)=>{
        console.log("start")
        console.log(data)
        var file = path.join(data.path, "nodeAppDetails.json")
        if (fs.existsSync(file)) {
            var nodeAppDetials = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (nodeAppDetials.running) {
                console.log("Already running")
                functions.refresh(socket, data, pm2Data)
            } else {
                pm2.startApp(nodeAppDetials.name, nodeAppDetials.file, data.path)
            }
        }
    })

    socket.on("stop", async (data)=>{
        console.log("stop")
        console.log(data)
        var file = path.join(data.path, "nodeAppDetails.json")
        if (fs.existsSync(file)) {
            var nodeAppDetials = JSON.parse(fs.readFileSync(file, 'utf8'));
            pm2.stop(data.path)
        }
    })

    socket.on("restart", async (data)=>{
        console.log("restart")
        console.log(data)
        var file = path.join(data.path, "nodeAppDetails.json")
        if (fs.existsSync(file)) {
            pm2.restart(data.path)
        }
    })
});

//every 15 seconds run pm2.list
setInterval(async () => {
    pm2.getAppList().then(async (data) => {
        pm2Data = data
        console.log(pm2Data)
        //update the nodeAppDetails.json for each app
        for (const app of pm2Data) {
            var nodeAppDetials = {
                "name": app.name,
                "file": app.file,
                "running": app.status == "online"
            }
            fs.writeFile(path.join(app.filePath, "nodeAppDetails.json"), JSON.stringify(nodeAppDetials), (err) => {
                if (err) throw err;
                console.log("The file has been saved!");
            });
        }
        console.log("Updated nodeAppDetails.json")
    })
}, 15 * 1000);

//start
server.listen(port, () => console.log(`Example app listening on port ${port}!`))