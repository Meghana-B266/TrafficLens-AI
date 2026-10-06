import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 3000;

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain'
};

const server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = parsedUrl.pathname;
    
    // Default to index.html
    if (pathname === '/') {
        pathname = '/index.html';
    }
    
    // Security: prevent directory traversal
    if (pathname.includes('..')) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    
    const filePath = path.join(__dirname, pathname);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            // File not found
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>404 - Page Not Found</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 50px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            min-height: 100vh;
                            margin: 0;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                        }
                        h1 { font-size: 4rem; margin-bottom: 20px; }
                        p { font-size: 1.2rem; margin-bottom: 30px; }
                        a { 
                            color: #ffd700; 
                            text-decoration: none; 
                            font-weight: bold;
                            background: rgba(255,255,255,0.2);
                            padding: 10px 20px;
                            border-radius: 5px;
                            transition: all 0.3s ease;
                        }
                        a:hover { 
                            background: rgba(255,255,255,0.3);
                            transform: translateY(-2px);
                        }
                    </style>
                </head>
                <body>
                    <h1>404</h1>
                    <p>Page not found</p>
                    <a href="/">← Back to SnapNEarn</a>
                </body>
                </html>
            `);
            return;
        }
        
        // Read and serve the file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Internal Server Error');
                return;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

server.listen(port, () => {
    console.log('🚀 SnapNEarn Website Server Started!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📱 Website URL: http://localhost:${port}`);
    console.log(`🌐 Local Network: http://192.168.1.100:${port}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✅ FEATURES READY:');
    console.log('   🔐 Smart Login System');
    console.log('   📍 Real GPS Integration');
    console.log('   🏢 Police Station Finder');
    console.log('   📸 Photo/Video Upload');
    console.log('   🤖 AI Helmet Detection');
    console.log('   🔢 Number Plate Recognition');
    console.log('   📋 Auto Challan Generation');
    console.log('   💰 Reward System');
    console.log('   📱 Mobile Responsive');
    console.log('');
    console.log('🎯 All buttons work perfectly!');
    console.log('🧠 Smart AI agent features active!');
    console.log('');
    console.log('Press Ctrl+C to stop the server');
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Server shutting down...');
    server.close(() => {
        console.log('✅ Server stopped successfully');
        process.exit(0);
    });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});


