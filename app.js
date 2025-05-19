const os = require('os');
const http = require('http');
const { Buffer } = require('buffer'); // Buffer 仍然需要，因为原始脚本中其他地方可能用到，但这里不再用于Base64编码输出
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
const NEZHA_PORT = process.env.NEZHA_PORT || '443'; // 端口为443时自动开启tls
const NEZHA_KEY = process.env.NEZHA_KEY || ''; // 哪吒三个变量不全不运行
const DOMAIN = process.env.DOMAIN || ''; //项目域名或已反代的域名，不带前缀，建议填已反代的域名
const NAME = process.env.NAME || 'JP-webhostmost-GCP'; // 注意：此NAME变量在当前版本的优选链接中未使用，原始链接使用DOMAIN作为名称后缀
const port = process.env.PORT || 3000;

// 创建HTTP路由
const httpServer = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hello, World\n');
  } else if (req.url === '/sub') {
    const allVlessLinks = [];

    if (DOMAIN) {
      const originalTlsUrl = `vless://${UUID}@${DOMAIN}:443?encryption=none&security=tls&sni=${DOMAIN}&type=ws&host=${DOMAIN}&path=%2F#-TLS-${DOMAIN}`;
      allVlessLinks.push(originalTlsUrl);

      const originalNoTlsUrl = `vless://${UUID}@${DOMAIN}:80?encryption=none&security=none&type=ws&host=${DOMAIN}&path=%2F#-NO-TLS-${DOMAIN}`;
      allVlessLinks.push(originalNoTlsUrl);
    } else {
      console.warn("DOMAIN 环境变量未设置，跳过生成“原始”链接。");
    }

    const cfAddress_preferred = 'cloudflare.182682.xyz';
    const preferredLinkNamePrefix = 'Pref'; 
    const preferredLinkSuffix_preferred = 'CF-Default'; 

    const effectiveHostForPreferred = DOMAIN; 
    const effectiveSniForPreferred = DOMAIN;   

    allVlessLinks.push(`vless://${UUID}@${cfAddress_preferred}:443?encryption=none&security=tls&sni=${effectiveSniForPreferred}&type=ws&host=${effectiveHostForPreferred}&path=%2F#${preferredLinkNamePrefix}-CF-TLS-443-${preferredLinkSuffix_preferred}`);
    

    allVlessLinks.push(`vless://${UUID}@${cfAddress_preferred}:80?encryption=none&security=none&type=ws&host=${effectiveHostForPreferred}&path=%2F#${preferredLinkNamePrefix}-CF-NO-TLS-80-${preferredLinkSuffix_preferred}`);
    

    // 使用三个换行符分隔明文链接
    const finalTextOutput = allVlessLinks.join('\n\n\n');

    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(finalTextOutput + '\n'); // 在整个响应末尾添加一个换行符
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
// 只有当Nezha相关环境变量都设置了才执行下载和运行
if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
    downloadFiles();
} else {
    console.log('Nezha variables not fully set, skipping agent download and execution.');
}


// WebSocket 服务器
const wss = new WebSocket.Server({ server: httpServer });
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
      }).on('error', err => {
          console.error("连接错误:", err.message);
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1011, "Upstream connection error");
          }
          duplex.destroy(err);
      });
    } catch (err) {
      console.error("处理消息时出错:", err.message);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1011, "Internal server error");
      }
    }
  }).on('error', err => {
      console.error("WebSocket 错误:", err.message);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1011, "WebSocket error");
      }
  });
});
