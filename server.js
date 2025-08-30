const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Create a simple HTTP server to serve the client files
const server = http.createServer((req, res) => {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './client/index.html';
    } else if (!filePath.startsWith('./client')) {
        filePath = './client' + req.url;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: ' + error.code + ' ..\n');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});


// Create a WebSocket server and attach it to the HTTP server
const wss = new WebSocket.Server({ server });

console.log('Signaling server started on port 8080');

// Store connected clients
let clients = [];

wss.on('connection', (ws) => {
    clients.push(ws);
    console.log('Client connected. Total clients:', clients.length);

    // When a second client connects, tell the first one to initiate the call
    if (clients.length === 2) {
        console.log('Two clients connected. Telling first client to initiate.');
        // Use JSON to send structured messages
        clients[0].send(JSON.stringify({ type: 'initiate' }));
    }

    // When a message is received from a client
    ws.on('message', (message) => {
        // Broadcast the message to all other clients
        clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message.toString());
            }
        });
    });

    // When a client disconnects
    ws.on('close', () => {
        clients = clients.filter((client) => client !== ws);
        console.log('Client disconnected. Total clients:', clients.length);
        // Optional: you could broadcast a 'peer-disconnected' message here
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

server.listen(8080, () => {
    console.log('HTTP server listening on http://localhost:8080');
});
