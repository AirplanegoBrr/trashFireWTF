const fs = require('fs');
const path = require('path');
const style = fs.readFileSync("./assets/style.css", "utf8");

async function template(locals, callback) {
    console.log("Generating template for " + locals.path);
    locals.style += `\n${style}`
    var html = `
    <!DOCTYPE html>
    <html>
        <head>
            <title>Listing directory ${locals.directory}</title>
            <style> ${locals.style} </style>
            <script src="/socket.io/socket.io.js"></script>
            <script src="/assets/script.js"></script>
        </head>
        <body class="directory">
            <div id="wrapper">
                <h1>{title}</h1>
                <a>{buttons}</a>
                <ul id="files" class="view-details">
                    <!--Black bar-->
                    <li class="header">
                        <span class="name">Name</span>
                        <span class="size">Size</span>
                        <span class="date">Modified</span>
                    </li>

                    <!--Back button-->
                    {backButton}

                    <!--Files-->
                    {files}
                </ul>

            </div>
            <a hidden id="data" style="font-size: 0.1">{data}</a>
        </body>
    </html>
    `;
    delete locals.style

    //for title

    //replace HTML placeholders with values
    var title = null
    var titleTemp = ""
    title = locals.directory.split("/")
    //remove first and last empty string
    title.shift()
    title.pop()
    //make sure there are no empty strings in the if there are remove them
    for (var i = 0; i < title.length; i++) {
        if (title[i] == "") {
            title.splice(i, 1)
            i--
        }
    }

    for (var i = 0; i < title.length; i++) {
        var t = title[i]
        if (i == 0) titleTemp += "~ / "
        //make sure href goes to the correct location
        titleTemp += `<a href="/files">${t}</a> / `
    }


    //for files
    var files = locals.fileList
    //make sure there are no empty strings in the if there are remove them
    for (var i = 0; i < files.length; i++) {
        if (files[i].name == "" || files[i].name == "..") {
            files.splice(i, 1)
            i--
        }
    }

    var filesTemp = ""
    const fileTypes = {
        0: "directory",
        1: "txt icon-text",
        2: "js icon-application-javascript",
        3: "json icon-application-json",
        4: "css"
    }
    for (var i = 0; i < files.length; i++) {
        var f = files[i]
        var fileName = f.name
        var fileSize = f.stat.size
        var fileDate = f.stat.birthtime
        var fileType = null

        if (fileName == "nodeAppDetails.json") {
            locals.data = JSON.parse(fs.readFileSync(`${locals.path}/${fileName}`, "utf8"))
        }

        //add the type of file to the array of the file
        if (fileName.includes(".")) {
            //0 == folder
            //1 == file
            //2 == js
            //3 == json
            //4 == css
            if (fileName.endsWith(".js")) {
                fileType = "2"
            } else if (fileName.endsWith(".json")) {
                fileType = "3"
            } else if (fileName.endsWith(".css")) {
                fileType = "4"
            } else {
                fileType = "1"
            }
        } else {
            fileType = "0"
        }
        filesTemp += `
        <li>
            <a href="${locals.directory}${fileName}" title="${fileName}" class="icon icon-${fileTypes[fileType]}">
                <span class="name">${fileName}</span>
                <span class="size">${fileSize}</span>
                <span class="date">${fileDate}</span>
            </a>
        </li>
        `
        //add file type to the file
        files[i].type = fileTypes[fileType]
        files[i].typeRaw = fileType
    }
    //update locals with files
    //locals.fileTypes = files


    //back button

    //check if we are on the main page
    if (locals.directory == "/files/") {
        html = html.replace("{backButton}", "")
    } else {
        var backButton = `
        <li>
            <a href="../" class="icon icon-directory" title="..">
                <span class="name">..</span>
                <span class="size"></span>
                <span class="date"></span>
            </a>
        </li>
        `
        html = html.replace("{backButton}", backButton)
    }

    //buttons (will open a pop up)
    const buttonHTML = fs.readFileSync("./assets/buttons.htm", "utf8")

    //html placeholder replacer
    html = html.replace("{title}", titleTemp)
    html = html.replace("{buttons}", buttonHTML)
    html = html.replace("{files}", filesTemp)
    html = html.replace("{data}", JSON.stringify(locals))
    callback(null, html);
}

async function refresh(socket, data, pm2Data) {
    console.log("refresh")
    //console.log(data)
    var dataBack = {
        "pm2Data": pm2Data,
        "fileData": null
    }
    if (data && "path" in data) {
        //check for the nodeAppDetails file and get the data
        var file = path.join(data.path, "nodeAppDetails.json")
        console.log(file)
        if (fs.existsSync(file)) {
            dataBack.fileData = JSON.parse(fs.readFileSync(file, 'utf8'));
        }
    }
    socket.emit("refreshBack", dataBack);
}


module.exports = {
    template,
    refresh
}