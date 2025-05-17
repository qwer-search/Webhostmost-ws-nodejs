const os = require('os');
const http = require('http');
const https = require('https');
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
const PORT = process.env.PORT || 3000;

// SSL 环境变量
const SSL_CERT_CONTENT = process.env.SSL_CERT_CONTENT || '';
const SSL_KEY_CONTENT = process.env.SSL_KEY_CONTENT || '';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || '';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || '';

// 格式化 PEM 内容，支持 \n, \\n, 直接粘贴内容
function formatPEM(content) {
  if (!content) return '';
  // 替换转义换行
  let formatted = content.replace(/\\n/g, '\n');
  // 有时候会直接粘贴带换行的证书，也可以直接用
  return formatted.trim();
}

// 证书加载函数，优先用内容，其次路径。加载失败则抛异常
function getSSLCredentials() {
  // 优先内容变量
  if (SSL_CERT_CONTENT && SSL_KEY_CONTENT) {
    try {
      const cert = formatPEM(SSL_CERT_CONTENT);
      const key = formatPEM(SSL_KEY_CONTENT);
      // 简单校验
      if (!cert.includes('BEGIN CERTIFICATE') || !key.includes('BEGIN')) {
        throw new Error('SSL_CERT_CONTENT 或 SSL_KEY_CONTENT 格式不正确');
      }
      return { cert, key };
    } catch (e) {
      console.error('加载环境变量证书失败:', e.message);
      process.exit(1);
    }
  }
  // 路径方式
  if (SSL_CERT_PATH && SSL_KEY_PATH) {
    try {
      const cert = fs.readFileSync(SSL_CERT_PATH, 'utf8');
      const key = fs.readFileSync(SSL_KEY_PATH, 'utf8');
      if (!cert.includes('BEGIN CERTIFICATE') || !key.includes('BEGIN')) {
        throw new Error('SSL_CERT_PATH 或 SSL_KEY_PATH 文件内容格式不正确');
      }
      return { cert, key };
    } catch (e) {
      console.error('加载证书文件失败:', e.message);
      process.exit(1);
    }
  }
  // 没有证书，直接退出
  console.error('未提供 SSL 证书内容或路径，无法启动 HTTPS 服务');
  process.exit(1);
}

// 获取 HTTPS 证书
const sslCredentials = getSSLCredentials();

// 创建 HTTPS 路由
const httpsServer = https.createServer(sslCredentials, (req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, World\n');
  } else if (req.url === '/sub') {
    const vlessURL = `vless://${UUID}@skk.moe:443?encryption=none&security=tls&sni=${DOMAIN}&type=ws&host=${DOMAIN}&path=%2F#${NAME}`;
    const base64Content = Buffer.from(vlessURL).toString('base64');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(base64Content + '\n');
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found\n');
  }
});

httpsServer.listen(PORT, () => {
  console.log(`HTTPS Server is running on port ${PORT}`);
});

// 可选：HTTP 自动重定向到 HTTPS（如果你希望完全关闭 HTTP，也可以不加）
const httpServer = http.createServer((req, res) => {
  const host = req.headers['host'] || '';
  res.writeHead(301, { "Location": `https://${host}${req.url}` });
  res.end();
});
httpServer.listen(80, () => {
  console.log('HTTP重定向服务已启动 (80)');
});

// ==== 以下保持原有逻辑不变 ====

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
  axios({
    method: 'get',
    url: fileUrl,
    responseType: 'stream',
  })
    .then(response => {
      response.data.pipe(writer);
      writer.on('finish', function() {
        writer.close();
        callback(null, fileName);
      });
    })
    .catch(error => {
      callback(`Download ${fileName} failed: ${error.message}`);
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

// WebSocket 服务器，绑定到 HTTPS
const wss = new WebSocket.Server({ server: httpsServer });
wss.on('connection', ws => {
  console.log("WebSocket 连接成功");
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
      net.connect({ host, port }, function () {
        this.write(msg.slice(i));
        duplex.on('error', err => console.error("E1:", err.message)).pipe(this).on('error', err => console.error("E2:", err.message)).pipe(duplex);
      }).on('error', err => console.error("连接错误:", err.message));
    } catch (err) {
      console.error("处理消息时出错:", err.message);
    }
  }).on('error', err => console.error("WebSocket 错误:", err.message));
});
