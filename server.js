const fs = require("fs");
const path = require("path");
const http = require("http");
const bundle = require("./bundle");
const chokidar = require("chokidar");
const express = require("express");
const compression = require("compression");

function parseArguments() {
    const args = process.argv.slice(2);
    let port = process.env.PORT !== undefined && process.env.PORT != "" ? parseInt(process.env.PORT) : 3000;
    let liveReload = process.env.NODE_ENV === "development" || false;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "-p" || args[i] === "--port") {
            port = parseInt(args[i + 1]);
            i++;
        } else if (args[i] === "-l" || args[i] === "--live-reload") {
            if (process.env.NODE_ENV !== "development") {
                throw new Error("Live reload is only supported in development mode");
            }
            liveReload = true;
        } else if (args[i] === "-h" || args[i] === "--help") {
            console.log("Usage: node server.js [-p|--port PORT] [-l|--live-reload]");
            console.log();
            console.log("Options:");
            console.log("  -p, --port PORT      Port to listen on (default: 3000)");
            console.log("  -l, --live-reload    Enable live reload (automatically enabled if NODE_ENV is development)");
            process.exit(0);
        }
    }

    return { port, liveReload };
}

function setupLogging() {
    // Poor man's logging framework, wooh...
    const originalConsoleLog = console.log;
    const logStream = fs.createWriteStream("site/output/log.txt", { flags: "a" });
    logStream.write("===========================================\n\n");
    console.log = (message) => {
        const formattedMessage = `[${new Date().toISOString()}] ${message}\n`;
        logStream.write(formattedMessage);
        originalConsoleLog.apply(console, [message]);
    };
}

(async () => {
    const dataDir = "data";
    const outputDir = "site/output";
    const { port, liveReload } = parseArguments();
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }

    if (fs.existsSync("site/output/data/log.txt")) {
        fs.copyFileSync("site/output/data/log.txt", "site/log.txt");
    }
    bundle.deleteDirectory(outputDir);
    fs.mkdirSync(outputDir);
    if (fs.existsSync("site/log.txt")) {
        fs.copyFileSync("site/log.txt", "site/output/data/log.txt");
        fs.unlinkSync("site/log.txt");
    }
    setupLogging();
    bundle.bundle("site", outputDir, liveReload);
    const app = express();
    app.use(compression());
    app.use(express.static("site/output"));
    app.get("/api", (req, res) => {
        res.send("Hello, World!");
    });

    const server = http.createServer(app);

    if (liveReload) {
        const socketIO = require("socket.io");
        const sockets = [];
        const io = socketIO(server);
        io.on("connection", (socket) => sockets.push(socket));
        let timeoutId = 0;
        chokidar.watch("site/output").on("all", () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                lastChangeTimestamp = Date.now();
                for (let i = 0; i < sockets.length; i++) {
                    sockets[i].send(`${lastChangeTimestamp}`);
                }
            }, 500);
        });
    }

    server.listen(port, () => {
        console.log(`App listening on port ${port}`);
    });
})();
