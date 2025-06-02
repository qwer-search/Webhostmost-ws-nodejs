# 赞助声明：

<a href="https://dartnode.com?aff=CraftyMouse750" target="_blank"><img src="https://status.dartnode.com/upload/logo1.png" width="100px"></a><br>
I am honored that DARTNODE is offering a free server to sponsor my project.<br>
DARTNODE's official Web Site : [https://dartnode.com](https://dartnode.com?aff=CraftyMouse750)

https://github.com/qwer-search/Webhostmost-ws-nodejs

# Webhostmost项目部署

1. [注册Webhostmost](https://client.webhostmost.com/register.php)，邮箱认证后，点击**Buy New Hosting Plan**，选择左上角**Free Plan**，点击**Order Now**.

![](https://images.2024921.xyz/images/202502081754083.png)

![](https://images.2024921.xyz/images/202502081755841.png)

2. 跳转到域名选项，选择第三个**Use Subdomain**（选择官方提供的免费域名.freewebhostmost.com），输入自己的域名前缀，例如：**hezi**.freewebhostmost.com ，点击Check创建自己的项目访问链接。

**重要通知**、**重要通知**、**重要通知**，官方不再提供的原域名了，请您使用自己的域名托管在此平台 查看此教程 https://www.kejiland.com/post/40e10f58.html

![](https://images.2024921.xyz/images/202502081755392.png)

3. 官方提供**永久免费**、**125M**的磁盘空间和**5个国家**地区（官方地区数据混乱，哪吒显示只有三个地区），服务器位置随自己的爱好选择，跳转到支付页面，点击右边**Checkout**.（125M空间部署此项目足够）

![](https://images.2024921.xyz/images/202502081755458.png)

![](https://images.2024921.xyz/images/202502081756515.png)

![](https://images.2024921.xyz/images/202502081756219.png)

4. 回到首页即可看到服务器信息，点击**Go To Control Panel**跳转到后台管理页面，点击左栏**Files Management** ➡**File Management**➡domains➡xxx.freewebhostmost.com➡public_html.   将项目中的**app.js**和**package.json**上传到此目录下即可。

![](https://images.2024921.xyz/images/202502081756696.png)

![](https://images.2024921.xyz/images/202502081757025.png)

5. 打开**app.js**修给几处参数数据即可，**UUID** **NEZHA_SERVER** **NEZHA_PORT** **NEZHA_KEY** **DOMAIN**  **PORT**

哪吒数据三件套就不多说了，有哪吒的都会；如果你没有哪吒可不填。

UUID 如有必要也可以替换新的；**DOMAIN**  填写分配的域名可保活，以防万一也可以放在哪吒服务中。

**PORT**  **重点** **重点** **重点** 说三遍，不建议默认3000端口，端口一定会占用，端口可随便填写。

![](https://images.2024921.xyz/images/202502081757775.png)

6. 点击左栏**Website Management**➡**NodeJs APP**➡**Create application**➡**CREATE**

Node.js version➡**v22**

Application root➡**domains/xxx.freewebhostmost.com/public_html**  (替换自己的完整域名)

Application startup file➡**app.js**

![](https://images.2024921.xyz/images/202502081757659.png)

![](https://images.2024921.xyz/images/202502121229848.png)

7. 回到**Development Tools**➡**terminal**。刚才创建完成**Node.js**应用后会页面出现一行命令，将此命令复制到**terminal**中回车获取权限，之后再输入 **npm i**安装依赖。

![](https://images.2024921.xyz/images/202502121427797.png)

![](https://images.2024921.xyz/images/202502081758377.png)

8. 回到**Node.js应用**界面，点击**Run JS script**

![](https://images.2024921.xyz/images/202502081759797.png)

![](https://images.2024921.xyz/images/202502081759188.png)

9. 输入你的域名/sub即可获取节点。例如https://hezi.freewebhostmost.com/sub，如果你之前没有反代此域名请你用原域名，节点如下：

`vless://b28f60af-d0b9-4ddf-baaa-7e49c93c380b@hezi.freewebhostmost.com:443?encryption=none&security=tls&sni=hezi.freewebhostmost.com&allowInsecure=1&type=ws&path=%2F#USA-webhostmost-GCP`


如果想workers反代请使用一下代码：二选一

```js
export default {
    async fetch(request, env) {
        let url = new URL(request.url);
        if (url.pathname.startsWith('/')) {
            var arrStr = [
                'aaaa.bbbbb.hf.space',// 修改成自己的节点IP/域名
            ];
            url.protocol = 'https:'
            url.hostname = getRandomArray(arrStr)
            let new_request = new Request(url, request);
            return fetch(new_request);
        }
        return env.ASSETS.fetch(request);
    },
};
function getRandomArray(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}
```


```js
export default {
  async fetch(request, env, ctx) {
    let url = new URL(request.url);
    if(url.pathname.startsWith('/')){
      url.hostname="translate.google.com"; // 修改成自己的节点IP/域名
      let new_request = new Request(url, request)
      return await fetch(new_request)
    }
    return await env.ASSETS.fetch(request);
  },
};
```

10. 来到哪吒即可看到哪吒已经点亮。
![](https://images.2024921.xyz/images/202502081804188.png)

## 开源协议说明（基于GPL）

本项目遵循 GNU 通用公共许可证（GNU General Public License, 简称 GPL）发布，并附加以下说明：

1. 你可以自由地使用、复制、修改和分发本项目的源代码，前提是你必须保留原作者的信息及本协议内容；
2. 修改后的版本也必须以相同协议开源；
3. 未经原作者明确授权，不得将本项目或其任何部分用于商业用途。

商业用途包括但不限于：
- 将本项目嵌入到出售的软件、系统或服务中；
- 通过本项目直接或间接获利（例如通过广告、SaaS服务等）；
- 在公司或组织内部作为商业工具使用。

如需获得商业授权，请联系原作者：[admin@eooce.com]

版权所有 ©2025  eooce

