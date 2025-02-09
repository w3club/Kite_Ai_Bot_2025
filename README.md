# Kile_Ai_Bot
自动对话功能，多钱包、多代理，随机延时请求
登录：https://testnet.gokite.ai?r=zxjXFFzQ
## 🌟 功能
自带题库随机生成脚本  
多钱包支持（手动输入或基于文件）  
代理支持（HTTP/HTTPS/SOCKS）  
速率检测和重连  
单次对话随机延时模拟  
自动选择问题  
使用情况报告  
## 先决条件
Node.js（v16 或更高版本）  
npm（Node 包管理器）  

## 使用

1. 拉取文件配置

```bash
git clone https://github.com/121panda121/Kile_Ai_Bot.git
cd Kile_Ai_Bot
```

```bash
npm install
```
2. 文件说明：
   1. 其中：generated_questions文件夹是对话生成的python代码
      1. 使用python generated_questions.py可自动生成对话语句，以便question.txt使用生成语句可自行替换到question中
3. 替换钱包和代理（不用代理也行）

``` 
bash钱包地址（是地址不是私钥）：0x 
```

```bash
代理地址文件：proxies.txt：格式http://username:password:ip:port  
```
4. 运行

```bash
npm run start
```

# 其他

Twitter：@longyueting  
⚠️免责声明  
此机器人仅用于教育目的。使用时请自担风险并确保遵守 Kite AI 的服务条款。  
📜 许可证  
MIT 许可证 - 请随意使用和修改以满足您自己的目的。
