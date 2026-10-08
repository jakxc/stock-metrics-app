const http = require('http');
const url = require('url');

class HealthCheckServer {
  constructor(port = 3001) {
    this.port = port;
    this.server = null;
    this.stockServer = null;
  }

  start(stockWebSocketServer = null) {
    this.stockServer = stockWebSocketServer;

    this.server = http.createServer((req, res) => {
      const parsedUrl = url.parse(req.url, true);

      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      switch (parsedUrl.pathname) {
        case '/health':
          this.handleHealthCheck(req, res);
          break;
        case '/status':
          this.handleStatus(req, res);
          break;
        case '/':
          this.handleRoot(req, res);
          break;
        default:
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not Found' }));
      }
    });

    this.server.listen(this.port, () => {
      console.log(`📊 Health check server running on port ${this.port}`);
      console.log(`🔗 Health check: http://localhost:${this.port}/health`);
      console.log(`📈 Status: http://localhost:${this.port}/status`);
    });
  }

  handleRoot(req, res) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Stock WebSocket Server</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
        .healthy { background: #d4edda; color: #155724; }
        .unhealthy { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <h1>📈 Stock WebSocket Server</h1>
    <div id="status">Loading...</div>

    <h2>📊 Statistics</h2>
    <div id="stats">Loading...</div>

    <script>
        async function updateStatus() {
            try {
                const response = await fetch('/status');
                const data = await response.json();

                document.getElementById('status').innerHTML =
                    '<div class="status ' + (data.healthy ? 'healthy' : 'unhealthy') + '">' +
                    'Status: ' + (data.healthy ? '✅ Healthy' : '❌ Unhealthy') +
                    '</div>';

                document.getElementById('stats').innerHTML =
                    '<ul>' +
                    '<li>Connected Clients: ' + data.connectedClients + '</li>' +
                    '<li>Subscribed Symbols: ' + data.subscribedSymbols + '</li>' +
                    '<li>Uptime: ' + data.uptime + '</li>' +
                    '<li>Data Source: ' + data.dataSource + '</li>' +
                    '</ul>';
            } catch (error) {
                document.getElementById('status').innerHTML =
                    '<div class="status unhealthy">❌ Server Error</div>';
                document.getElementById('stats').innerHTML =
                    '<p>Unable to fetch statistics</p>';
            }
        }

        updateStatus();
        setInterval(updateStatus, 5000);
    </script>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  handleHealthCheck(req, res) {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: require('../package.json').version
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(health));
  }

  handleStatus(req, res) {
    const status = {
      healthy: true,
      uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`,
      connectedClients: this.stockServer ? this.stockServer.clients.size : 0,
      subscribedSymbols: this.stockServer ? this.stockServer.subscribedSymbols.size : 0,
      dataSource: process.env.FINNHUB_API_KEY ? 'Finnhub (Real-time)' : 'Mock Data',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
      }
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(status));
  }

  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('Health check server stopped');
      });
    }
  }
}

module.exports = HealthCheckServer;