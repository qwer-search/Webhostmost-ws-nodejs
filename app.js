const os = require('os');
const http = require('http');
const { Buffer } = require('buffer');
const fs = require('fs');
const axios = require('axios');
const path = require('path');
const net = require('net');
const { exec, execSync } = require('child_process');
const { WebSocket, createWebSocketStream } = require('ws');
const logcb = (...args) => console.log.bind(this, ...args);
const errcb = (...args) => console.error.bind(this, ...args);
const UUID = process.env.UUID || 'b28f60af-d0b9-4ddf-baaa-7e49c93c380b';
const uuid = UUID.replace(/-/g, "");
const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nezha.gvkoyeb.eu.org';
const NEZHA_PORT = process.env.NEZHA_PORT || '443';        // 端口为443时自动开启tls
const NEZHA_KEY = process.env.NEZHA_KEY || '';             // 哪吒三个变量不全不运行
const DOMAIN = process.env.DOMAIN || '';  //项目域名或已反代的域名，不带前缀，建议填已反代的域名
const NAME = process.env.NAME || 'JP-webhostmost-GCP';
const port = process.env.PORT || 3000;

// 创建HTTP路由
const httpServer = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, World\n');
  } else if (req.url === '/sub') {
    const vlessURL = `vless://${UUID}@skk.moe:443?encryption=none&security=tls&sni=${DOMAIN}&type=ws&host=${DOMAIN}&path=%2F&allowInsecure=1#${NAME}`;
    
    const base64Content = Buffer.from(vlessURL).toString('base64');

    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(base64Content + '\n');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

httpServer.listen(port, () => {
  console.log(`HTTP Server is running on port ${port}`);
});

// 判断系统架构
function getSystemArchitecture() {
  const arch = os.arch();
  if (arch === 'arm' || arch === 'arm64') {
    return 'arm';
  } else {
    return 'amd';
  }
}

// 下载对应系统架构的ne-zha
function downloadFile(fileName, fileUrl, callback) {
  const filePath = path.join("./", fileName);
  const writer = fs.createWriteStream(filePath);
  
  // 设置超时和重试
  axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
    timeout: 30000, // 30秒超时
    maxContentLength: 100 * 1024 * 1024, // 100MB最大下载大小
  })
    .then(response => {
      response.data.pipe(writer);
      writer.on('finish', function() {
        writer.close();
        callback(null, fileName);
      });
      writer.on('error', function(err) {
        callback(`Write ${fileName} failed: ${err.message}`);
      });
    })
    .catch(error => {
      if (error.code === 'ECONNABORTED') {
        console.log(`Download ${fileName} timeout, retrying...`);
        // 递归重试
        setTimeout(() => downloadFile(fileName, fileUrl, callback), 3000);
      } else {
        callback(`Download ${fileName} failed: ${error.message}`);
      }
    });
}

function downloadFiles() {
  const architecture = getSystemArchitecture();
  const filesToDownload = getFilesForArchitecture(architecture);

  if (filesToDownload.length === 0) {
    console.log(`Can't find a file for the current architecture`);
    return;
  }

  let downloadedCount = 0;

  filesToDownload.forEach(fileInfo => {
    downloadFile(fileInfo.fileName, fileInfo.fileUrl, (err, fileName) => {
      if (err) {
        console.log(`Download ${fileName} failed`);
      } else {
        console.log(`Download ${fileName} successfully`);

        downloadedCount++;

        if (downloadedCount === filesToDownload.length) {
          setTimeout(() => {
            authorizeFiles();
          }, 3000);
        }
      }
    });
  });
}

function getFilesForArchitecture(architecture) {
  if (architecture === 'arm') {
    return [
      { fileName: "npm", fileUrl: "https://github.com/eooce/test/releases/download/ARM/swith" },
    ];
  } else if (architecture === 'amd') {
    return [
      { fileName: "npm", fileUrl: "https://github.com/eooce/test/releases/download/bulid/swith" },
    ];
  }
  return [];
}

// 授权并运行ne-zha
function authorizeFiles() {
  const filePath = './npm';
  const newPermissions = 0o775;
  fs.chmod(filePath, newPermissions, (err) => {
    if (err) {
      console.error(`Empowerment failed:${err}`);
    } else {
      console.log(`Empowerment success:${newPermissions.toString(8)} (${newPermissions.toString(10)})`);

      // 运行ne-zha
      let NEZHA_TLS = '';
      if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
        if (NEZHA_PORT === '443') {
          NEZHA_TLS = '--tls';
        } else {
          NEZHA_TLS = '';
        }
        const command = `./npm -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} --skip-conn --disable-auto-update --skip-procs --report-delay 4 >/dev/null 2>&1 &`;
        try {
          exec(command);
          console.log('npm is running');
        } catch (error) {
          console.error(`npm running error: ${error}`);
        }
      } else {
        console.log('NEZHA variable is empty,skip running');
      }
    }
  });
}
downloadFiles();

// WebSocket 服务器
const wss = new WebSocket.Server({ server: httpServer });
wss.on('connection', ws => {
  console.log("WebSocket 连接成功");
  
  // 设置WebSocket保持活动状态
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    }
  }, 30000); // 每30秒发送一次ping
  
  ws.on('close', () => {
    clearInterval(pingInterval);
    console.log("WebSocket 连接关闭");
  });
  
  ws.on('message', msg => {
    if (msg.length < 18) {
      console.error("数据长度无效");
      return;
    }
    try {
      const [VERSION] = msg;
      const id = msg.slice(1, 17);
      if (!id.every((v, i) => v == parseInt(uuid.substr(i * 2, 2), 16))) {
        console.error("UUID 验证失败");
        return;
      }
      let i = msg.slice(17, 18).readUInt8() + 19;
      const port = msg.slice(i, i += 2).readUInt16BE(0);
      const ATYP = msg.slice(i, i += 1).readUInt8();
      const host = ATYP === 1 ? msg.slice(i, i += 4).join('.') :
        (ATYP === 2 ? new TextDecoder().decode(msg.slice(i + 1, i += 1 + msg.slice(i, i + 1).readUInt8())) :
          (ATYP === 3 ? msg.slice(i, i += 16).reduce((s, b, i, a) => (i % 2 ? s.concat(a.slice(i - 1, i + 1)) : s), []).map(b => b.readUInt16BE(0).toString(16)).join(':') : ''));
      console.log('连接到:', host, port);
      ws.send(new Uint8Array([VERSION, 0]));
      const duplex = createWebSocketStream(ws);
      
      // 设置TCP连接超时和保持活动状态
      const socket = net.connect({ 
        host, 
        port,
        timeout: 60000 // 60秒连接超时
      }, function () {
        this.setKeepAlive(true, 30000); // 启用TCP保活机制
        this.setTimeout(0); // 禁用套接字超时
        this.write(msg.slice(i));
        
        duplex.on('error', err => {
          console.error("E1:", err.message);
          if (!this.destroyed) this.destroy();
        }).pipe(this).on('error', err => {
          console.error("E2:", err.message);
          if (!duplex.destroyed) duplex.destroy();
        }).pipe(duplex);
      });
      
      socket.on('timeout', () => {
        console.log('TCP连接超时');
        socket.destroy();
      });
      
      socket.on('error', err => {
        console.error("连接错误:", err.message);
        if (err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET') {
          console.log('尝试重新连接...');
          if (!duplex.destroyed) duplex.destroy();
        }
      });
    } catch (err) {
      console.error("处理消息时出错:", err.message);
    }
  }).on('error', err => console.error("WebSocket 错误:", err.message));
});
