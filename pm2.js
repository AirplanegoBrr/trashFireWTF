const pm2 = require('pm2');
const fs = require('fs');
const path = require('path');

const util = require('util');
const exec = util.promisify(require('child_process').exec);

async function checkFileStuff(file, pathFile) {
    //check for pathToFile
    fs.stat(pathFile, (err, stats) => {
        if (err) return console.error(err);
        if (stats.isDirectory()) {
            //check if the file exists
            fs.stat(path.join(pathFile, file), (err, stats) => {
                if (err) return console.error(err);
                if (stats.isFile()) {
                    return true;
                } else {
                    console.log("File does not exist")
                    return false;
                }
            });
        }
    })
}

async function startApp(appName, file, pathToFile){
    var stat = checkFileStuff(file, pathToFile)
    if(!stat){ return false }
    //make batch file for app
    var batchFile = `pm2 start ${file} --name ${appName} --no-autorestart\nexit`
    //make bat in app folder
    fs.writeFile(path.join(pathToFile, "start.bat"), batchFile, (err) => {
        if (err) throw err;
        console.log("The file has been saved!");
    });
    //start app
    const { stdout, stderr } = await exec(`cd ${pathToFile} && start start.bat`);
    //update or create the nodeAppDetails.json file
    var nodeAppDetials = {
        "name": appName,
        "file": file,
        "running": true
    }
    fs.writeFile(path.join(pathToFile, "nodeAppDetails.json"), JSON.stringify(nodeAppDetials), (err) => {
        if (err) throw err;
        console.log("The file has been saved!");
    });
    return true
}

async function stop(pathToFile){
    var details = path.join(pathToFile, "nodeAppDetails.json")
    if (fs.existsSync(details)) {
        var nodeAppDetials = JSON.parse(fs.readFileSync(details, 'utf8'));
        var batchFile = `pm2 del ${nodeAppDetials.name} && exit`
        //make bat in app folder
        fs.writeFile(path.join(pathToFile, "stop.bat"), batchFile, (err) => {
            if (err) throw err;
            console.log("The file has been saved!");
        });
        //start app
        const { stdout, stderr } = await exec(`cd ${pathToFile} && start stop.bat`);
        //update or create the nodeAppDetails.json file
        var nodeAppDetials = {
            "name": nodeAppDetials.name,
            "file": nodeAppDetials.file,
            "running": false
        }
        fs.writeFile(path.join(pathToFile, "nodeAppDetails.json"), JSON.stringify(nodeAppDetials), (err) => {
            if (err) throw err;
            console.log("The file has been saved!");
        });
        return true
    }
}

async function restart(pathToFile){
    var details = path.join(pathToFile, "nodeAppDetails.json")
    if (fs.existsSync(details)) {
        var nodeAppDetials = JSON.parse(fs.readFileSync(details, 'utf8'));
        console.log(nodeAppDetials)
        await stop(nodeAppDetials.name, pathToFile)
        await startApp(nodeAppDetials.name, nodeAppDetials.file, pathToFile)
        return true
    }
}

async function getAppList(){
    return new Promise((resolve, reject) => {
        pm2.connect(function(err) {
            if (err) return reject(err);
            console.log("Connected to PM2");
            pm2.list((err, apps) => {
                if (err) return reject(err);
                console.log("Got apps list");
                pm2.disconnect();
                //clean up the app list
                var appList = []
                apps.forEach(app => {
                    appList.push({
                        "name": app.name,
                        "filePath": app.pm2_env.pm_cwd,
                        "file": app.pm2_env.pm_exec_path.split("\\").pop(),
                        "status": app.pm2_env.status,
                        "monit": app.monit,
                        "pmID": app.pm_id
                    })
                });
                console.log(appList)
                //console.log(apps)
                resolve(appList)
            });
        })
    })
}

module.exports = {
    startApp,
    getAppList,
    stop,
    restart
}