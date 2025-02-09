// 导入依赖
import chalk from 'chalk';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createInterface } from 'readline';
import { SocksProxyAgent } from 'socks-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { HttpProxyAgent } from 'http-proxy-agent';
import axios from 'axios';
import fs from 'fs';
import { banner } from './banner.js';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readline = createInterface({
  input: process.stdin,
  output: process.stdout
});

// 限流配置
const rateLimitConfig = {
  maxRetries: 5,
  baseDelay: 40000,
  maxDelay: 30000,
  requestsPerMinute: 4,
  intervalBetweenCycles: 60000,
  walletVerificationRetries: 3
};

let lastRequestTime = Date.now();
let isRunning = true;

// 处理 CTRL+C 信号
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n🛑 正在优雅地停止脚本...'));
  isRunning = false;
  setTimeout(() => {
    console.log(chalk.green('👋 感谢使用 Kite AI！'));
    process.exit(0);
  }, 1000);
});

const agents = {
  "deployment_p5J9lz1Zxe7CYEoo0TZpRVay": "教授 🧠",
  "deployment_7sZJSiCqCNDy9bBHTEh7dwd9": "加密伙伴 💰",
  "deployment_SoFftlsf9z4fyA3QCHYkaANq": "福尔摩斯 🔎"
};

const proxyConfig = {
  enabled: false,
  current: 'direct',
  proxies: []
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const calculateDelay = (attempt) => {
  return Math.min(
    rateLimitConfig.maxDelay,
    rateLimitConfig.baseDelay * Math.pow(2, attempt)
  );
};

// 修改为使用正确端点并处理特定错误情况
async function verifyWallet(wallet) {
  try {
    // 跳过钱包验证继续执行使用报告
    return true;
  } catch (error) {
    console.log(chalk.yellow('⚠️ 正在跳过钱包验证继续执行...'));
    return true;
  }
}

const checkRateLimit = async () => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  const minimumInterval = (60000 / rateLimitConfig.requestsPerMinute);

  if (timeSinceLastRequest < minimumInterval) {
    const waitTime = minimumInterval - timeSinceLastRequest;
    await sleep(waitTime);
  }
  
  lastRequestTime = Date.now();
};

function loadProxiesFromFile() {
  try {
    const proxyList = fs.readFileSync('proxies.txt', 'utf-8')
      .split('\n')
      .filter(line => line.trim())
      .map(proxy => proxy.trim());
    proxyConfig.proxies = proxyList;
    console.log(chalk.green(`✅ 成功从文件加载了 ${proxyList.length} 个代理`));
  } catch (error) {
    console.log(chalk.yellow('⚠️ 未找到proxies.txt文件或文件为空，使用直连模式'));
  }
}

function getNextProxy() {
  if (!proxyConfig.enabled || proxyConfig.proxies.length === 0) {
    return null;
  }
  const proxy = proxyConfig.proxies.shift();
  proxyConfig.proxies.push(proxy);
  return proxy;
}

function createProxyAgent(proxyUrl) {
  try {
    if (!proxyUrl) return null;

    if (proxyUrl.startsWith('socks')) {
      return new SocksProxyAgent(proxyUrl);
    } else if (proxyUrl.startsWith('http')) {
      return {
        https: new HttpsProxyAgent(proxyUrl),
        http: new HttpProxyAgent(proxyUrl)
      };
    }
    return null;
  } catch (error) {
    console.error(chalk.red(`⚠️ 创建代理客户端时出错: ${error.message}`));
    return null;
  }
}

function createAxiosInstance(proxyUrl = null) {
  const config = {
    headers: { 'Content-Type': 'application/json' }
  };

  if (proxyUrl) {
    const proxyAgent = createProxyAgent(proxyUrl);
    if (proxyAgent) {
      if (proxyAgent.https) {
        config.httpsAgent = proxyAgent.https;
        config.httpAgent = proxyAgent.http;
      } else {
        config.httpsAgent = proxyAgent;
        config.httpAgent = proxyAgent;
      }
    }
  }

  return axios.create(config);
}

function displayAppTitle() {
  console.log(banner);
  console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
  console.log(chalk.yellow('开始启动！'));
  console.log(chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
}

async function sendRandomQuestion(agent, axiosInstance) {
  try {
    await checkRateLimit();
    
    const randomQuestions = JSON.parse(fs.readFileSync('questions.json', 'utf-8'));
    const randomQuestion = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];

    const payload = { message: randomQuestion, stream: false };
    const response = await axiosInstance.post(
      `https://${agent.toLowerCase().replace('_','-')}.stag-vxzy.zettablock.com/main`,
      payload
    );

    return { question: randomQuestion, response: response.data.choices[0].message };
  } catch (error) {
    console.error(chalk.red('⚠️ 错误:'), error.response ? error.response.data : error.message);
    return null;
  }
}

async function reportUsage(wallet, options, retryCount = 0) {
  try {
    await checkRateLimit();

    const payload = {
      wallet_address: wallet,
      agent_id: options.agent_id,
      request_text: options.question,
      response_text: options.response,
      request_metadata: {}
    };

    await axios.post('https://quests-usage-dev.prod.zettablock.com/api/report_usage', payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    console.log(chalk.green('✅ 使用数据上报成功！\n'));
  } catch (error) {
    const isRateLimit = error.response?.data?.error?.includes('Rate limit exceeded');
    
    if (isRateLimit && retryCount < rateLimitConfig.maxRetries) {
      const delay = calculateDelay(retryCount);
      const randomWaitTime = Math.floor(Math.random() * (30000 - 20000 + 1)) + 20000; // 20-30秒随机
      console.log(chalk.yellow(`⏳ 检测到速率限制，${randomWaitTime/1000} 秒后重试...`));
      await sleep(delay);
      return reportUsage(wallet, options, retryCount + 1);
    }
    
    // 记录错误但继续执行
    console.log(chalk.yellow('⚠️ 使用报告存在问题，继续执行...'));
  }
}

function loadWalletsFromFile() {
  try {
    return fs.readFileSync('wallets.txt', 'utf-8')
      .split('\n')
      .filter(wallet => wallet.trim())
      .map(wallet => wallet.trim().toLowerCase());
  } catch (error) {
    console.error(chalk.red('⚠️ 错误: 未找到wallets.txt文件'));
    return [];
  }
}

async function processAgentCycle(wallet, agentId, agentName, useProxy) {
  try {
    const proxy = useProxy ? getNextProxy() : null;
    const axiosInstance = createAxiosInstance(proxy);

    if (proxy) {
      console.log(chalk.blue(`🌐 使用代理: ${proxy}`));
    }

    const nanya = await sendRandomQuestion(agentId, axiosInstance);
    
    if (nanya) {
      console.log(chalk.cyan('❓ 问题:'), chalk.bold(nanya.question));
      console.log(chalk.green('💡 答案:'), chalk.italic(nanya?.response?.content ?? ''));

      await reportUsage(wallet, {
        agent_id: agentId,
        question: nanya.question,
        response: nanya?.response?.content ?? '无答案'
      });
    }
  } catch (error) {
    console.error(chalk.red('⚠️ 代理周期错误:'), error.message);
  }
}

async function startContinuousProcess(wallet, useProxy) {
  console.log(chalk.blue(`\n📌 正在处理钱包: ${wallet}`));
  console.log(chalk.yellow('按 Ctrl+C 停止脚本\n'));

  let cycleCount = 1;

  while (isRunning) {
    console.log(chalk.magenta(`\n🔄 第 ${cycleCount} 轮循环`));
    console.log(chalk.dim('────────────────────────────────────────'));

    for (const [agentId, agentName] of Object.entries(agents)) {
      if (!isRunning) break;
      
      console.log(chalk.magenta(`\n🤖 使用代理: ${agentName}`));
      await processAgentCycle(wallet, agentId, agentName, useProxy);
      
      if (isRunning) {
        // 修改点：生成20-30秒随机等待时间（包含边界值）
        const randomWaitTime = Math.floor(Math.random() * (30000 - 20000 + 1)) + 20000; // 20-30秒随机
        console.log(chalk.yellow(`⏳ 等待 ${randomWaitTime/1000} 秒后进行下一次交互...`));
        await sleep(randomWaitTime);
      }
    }

    cycleCount++;
    console.log(chalk.dim('────────────────────────────────────────'));
  }
}

async function main() {
  displayAppTitle();

  const askMode = () => {
    return new Promise((resolve) => {
      readline.question(chalk.yellow('🔄 选择连接模式 (1: 直连, 2: 代理): '), resolve);
    });
  };

  const askWalletMode = () => {
    return new Promise((resolve) => {
      console.log(chalk.yellow('\n📋 选择钱包模式:'));
      console.log(chalk.yellow('1. 手动输入'));
      console.log(chalk.yellow('2. 加载钱包'));
      readline.question(chalk.yellow('\n请选择: '), resolve);
    });
  };

  const askWallet = () => {
    return new Promise((resolve) => {
      readline.question(chalk.yellow('🔑 输入你的钱包地址: '), resolve);
    });
  };

  try {
    const mode = await askMode();
    proxyConfig.enabled = mode === '2';
    
    if (proxyConfig.enabled) {
      loadProxiesFromFile();
    }
    
    const walletMode = await askWalletMode();
    let wallets = [];
    
    if (walletMode === '2') {
      wallets = loadWalletsFromFile();
      if (wallets.length === 0) {
        console.log(chalk.red('❌ 没有加载到钱包，停止程序'));
        readline.close();
        return;
      }
    } else {
      const wallet = await askWallet();
      wallets = [wallet.toLowerCase()];
    }

    for (const wallet of wallets) {
      await startContinuousProcess(wallet, proxyConfig.enabled);
    }
    
  } catch (error) {
    console.error(chalk.red('⚠️ 发生错误:'), error);
    readline.close();
  }
}

main();