if (typeof window !== "undefined") {
    function setupLiveEdit() {
        if (window.location.host.indexOf("localhost") < 0 && window.location.host.indexOf("127.0.0.1") < 0) return;
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.onload = () => {
            let lastChangeTimestamp = null;
            let socket = io({ transports: ["websocket"] });
            socket.on("message", (timestamp) => {
                if (lastChangeTimestamp != timestamp) {
                    setTimeout(() => location.reload(), 100);
                    lastChangeTimestamp = timestamp;
                }
            });
        };
        script.src = "js/socket.io.js";
        document.body.appendChild(script);
    }
    setupLiveEdit();
}
