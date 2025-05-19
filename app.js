'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Remove leading slash
    if (pathname.startsWith('/')) pathname = pathname.slice(1);

    // Default to index.html
    if (pathname === '') pathname = 'index.html';

    // Only allow .html and .js files in the top-level directory
    const ext = path.extname(pathname);
    if ((ext === '.html' || ext === '.js') && !pathname.includes('/')) {
        const filePath = path.join(__dirname, pathname);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            let contentType = 'text/plain';
            if (ext === '.html') contentType = 'text/html';
            if (ext === '.js') contentType = 'application/javascript';
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Listening on http://localhost:${PORT}`);
});
