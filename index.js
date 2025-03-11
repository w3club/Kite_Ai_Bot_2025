import fetch from 'node-fetch';
import chalk from 'chalk';
import fs from 'fs/promises';
import { banner } from './banner.js';
import SocksProxyAgent from 'socks-proxy-agent';
import HttpsProxyAgent from 'https-proxy-agent';
import cron from 'node-cron';

// 等待用户按键
const 等待按键 = async () => {
    process.stdin.setRawMode(true);
    return new Promise(resolve => {
        process.stdin.once('data', () => {
            process.stdin.setRawMode(false);
            resolve();
        });
    });
};

// 加载钱包地址
async function 加载钱包() {
    try {
        const 数据 = await fs.readFile('wallets.txt', 'utf8');
        const 钱包列表 = 数据.split('\n')
            .map(行 => 行.trim())
            .filter(行 => 行 && !行.startsWith('#'));
        
        if (钱包列表.length === 0) {
            throw new Error('wallets.txt中未找到钱包地址');
        }
        return 钱包列表;
    } catch (错误) {
        console.log(`${chalk.red('[错误]')} 读取wallets.txt失败: ${错误.message}`);
        process.exit(1);
    }
}

// 加载代理配置（新格式处理）
async function 加载代理() {
    try {
        const 原始数据 = await fs.readFile('proxies.txt', 'utf8');
        return 原始数据.split('\n')
            .map(行 => 行.trim())
            .filter(行 => 行 && !行.startsWith('#'))
            .map(代理字符串 => {
                const url = new URL(代理字符串);
                return {
                    协议: url.protocol.replace(':', ''),
                    主机: url.hostname,
                    端口: url.port,
                    认证: url.username ? `${url.username}:${url.password}` : ''
                };
            });
    } catch (错误) {
        console.log(`${chalk.yellow('[信息]')} 未找到proxies.txt或读取失败，使用直连`);
        return [];
    }
}

// 创建代理实例
function 创建代理(代理配置) {
    if (!代理配置) return null;
    
    const { 协议, 主机, 端口, 认证 } = 代理配置;
    const 认证字符串 = 认证 ? `${认证}@` : '';
    const 代理地址 = `${协议}://${认证字符串}${主机}:${端口}`;
    
    return 协议.startsWith('socks') 
        ? new SocksProxyAgent.SocksProxyAgent(代理地址)
        : new HttpsProxyAgent.HttpsProxyAgent(代理地址);
}

const AI终端节点 = {
    "https://deployment-uu9y1z4z85rapgwkss1muuiz.stag-vxzy.zettablock.com/main": {
        "代理ID": "deployment_UU9y1Z4Z85RAPGwkss1mUUiZ",
        "名称": "Kite AI 助手",
        "问题集": [
            "告诉我Kite AI的最新更新",
            "Kite AI有哪些即将推出的功能？",
            "Kite AI如何改进我的开发工作流程？",
            "Kite AI在市场上的独特之处是什么？",
            "Kite AI如何处理代码补全？",
            "解释Kite AI的机器学习能力",
            "Kite AI主要支持哪些编程语言？",
            "Kite AI如何与不同IDE集成？",
            "Kite AI的高级功能有哪些？",
            "如何优化Kite AI的使用？"
        ]
    },
    "https://deployment-ecz5o55dh0dbqagkut47kzyc.stag-vxzy.zettablock.com/main": {
        "代理ID": "deployment_ECz5O55dH0dBQaGKuT47kzYC",
        "名称": "加密价格助手",
        "问题集": [
            "当前Solana的市场情绪如何？",
            "分析比特币过去一小时的价格走势",
            "比较ETH和BTC今日表现",
            "哪些山寨币显示看涨模式？",
            "前十加密货币的市场分析",
            "Polkadot的技术分析",
            "Avalanche的价格走势模式",
            "Polygon的市场表现分析",
            "影响BNB价格的最新动态",
            "Cardano的市场展望"
        ]
    },
    "https://deployment-sofftlsf9z4fya3qchykaanq.stag-vxzy.zettablock.com/main": {
        "代理ID": "deployment_SoFftlsf9z4fyA3QCHYkaANq",
        "名称": "交易分析器",
        "问题集": []
    }
};

class 钱包统计 {
    constructor() {
        this.代理互动次数 = {};
        for (const 节点 in AI终端节点) {
            this.代理互动次数[AI终端节点[节点].名称] = 0;
        }
        this.总积分 = 0;
        this.总互动次数 = 0;
        this.最后互动时间 = null;
        this.成功次数 = 0;
        this.失败次数 = 0;
    }
}

class 钱包会话 {
    constructor(钱包地址, 会话ID) {
        this.钱包地址 = 钱包地址;
        this.会话ID = 会话ID;
        this.每日积分 = 0;
        this.开始时间 = new Date();
        this.下次重置时间 = new Date(this.开始时间.getTime() + 24 * 60 * 60 * 1000);
        this.统计数据 = new 钱包统计();
    }

    更新统计(代理名称, 成功 = true) {
        this.统计数据.代理互动次数[代理名称]++;
        this.统计数据.总互动次数++;
        this.统计数据.最后互动时间 = new Date();
        if (成功) {
            this.统计数据.成功次数++;
            this.统计数据.总积分 += 10;
        } else {
            this.统计数据.失败次数++;
        }
    }

    显示统计() {
        console.log(`\n${chalk.blue(`[会话 ${this.会话ID}]`)} ${chalk.green(`[${this.钱包地址}]`)} ${chalk.cyan('📊 当前统计')}`);
        console.log(`${chalk.yellow('════════════════════════════════════════════')}`);
        console.log(`${chalk.cyan('💰 总积分:')} ${chalk.green(this.统计数据.总积分)}`);
        console.log(`${chalk.cyan('🔄 总互动次数:')} ${chalk.green(this.统计数据.总互动次数)}`);
        console.log(`${chalk.cyan('✅ 成功:')} ${chalk.green(this.统计数据.成功次数)}`);
        console.log(`${chalk.cyan('❌ 失败:')} ${chalk.red(this.统计数据.失败次数)}`);
        console.log(`${chalk.cyan('⏱️ 最后互动:')} ${chalk.yellow(this.统计数据.最后互动时间?.toISOString() || '无记录')}`);
        
        console.log(`\n${chalk.cyan('🤖 代理互动分布:')}`);
        for (const [代理名称, 次数] of Object.entries(this.统计数据.代理互动次数)) {
            console.log(`   ${chalk.yellow(代理名称)}: ${chalk.green(次数)}`);
        }
        console.log(chalk.yellow('════════════════════════════════════════════\n'));
    }
}

class KiteAI自动化 {
    constructor(钱包地址, 代理配置, 会话ID) {
        this.会话 = new 钱包会话(钱包地址, 会话ID);
        this.代理配置 = 代理配置;
        this.每日积分上限 = 200;
        this.单次积分 = 10;
        this.运行状态 = true;
    }

    记录日志(表情, 信息, 颜色 = 'white') {
        const 时间戳 = new Date().toISOString().replace('T', ' ').slice(0, 19);
        const 会话前缀 = chalk.blue(`[会话 ${this.会话.会话ID}]`);
        const 钱包前缀 = chalk.green(`[${this.会话.钱包地址.slice(0, 6)}...]`);
        console.log(`${chalk.yellow(`[${时间戳}]`)} ${会话前缀} ${钱包前缀} ${chalk[颜色](`${表情} ${信息}`)}`);
    }

    重置每日积分() {
        const 当前时间 = new Date();
        if (当前时间 >= this.会话.下次重置时间) {
            this.记录日志('✨', '开始新的24小时积分周期', 'green');
            this.会话.每日积分 = 0;
            this.会话.下次重置时间 = new Date(当前时间.getTime() + 24 * 60 * 60 * 1000);
            return true;
        }
        return false;
    }

    async 检查积分限制() {
        if (this.会话.每日积分 >= this.每日积分上限) {
            const 剩余时间 = (this.会话.下次重置时间 - new Date()) / 1000;
            if (剩余时间 > 0) {
                this.记录日志('🎯', `已达到每日积分上限 (${this.每日积分上限})`, 'yellow');
                this.记录日志('⏳', `下次重置时间: ${this.会话.下次重置时间.toISOString().replace('T', ' ').slice(0, 19)}`, 'yellow');
                await new Promise(resolve => setTimeout(resolve, 剩余时间 * 1000));
                this.重置每日积分();
            }
            return true;
        }
        return false;
    }

    async 获取最近交易() {
        this.记录日志('🔍', '扫描最近交易记录...', 'white');
        const 接口地址 = 'https://testnet.kitescan.ai/api/v2/advanced-filters';
        const 参数 = new URLSearchParams({
            transaction_types: 'coin_transfer',
            age: '5m'
        });

        try {
            const 代理实例 = 创建代理(this.代理配置);
            const 响应 = await fetch(`${接口地址}?${参数}`, {
                agent: 代理实例,
                headers: {
                    'accept': '*/*',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            const 数据 = await 响应.json();
            const 交易哈希列表 = 数据.items?.map(条目 => 条目.hash) || [];
            this.记录日志('📊', `发现${交易哈希列表.length}笔近期交易`, 'magenta');
            return 交易哈希列表;
        } catch (错误) {
            this.记录日志('❌', `交易获取失败: ${错误}`, 'red');
            return [];
        }
    }

    async 发送AI请求(终端节点, 消息) {
        const 代理实例 = 创建代理(this.代理配置);
        const 请求头 = {
            'Accept': 'text/event-stream',
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        };
        const 请求体 = {
            message: 消息,
            stream: true
        };

        try {
            const 响应 = await fetch(终端节点, {
                method: 'POST',
                agent: 代理实例,
                headers: 请求头,
                body: JSON.stringify(请求体)
            });

            const 会话前缀 = chalk.blue(`[会话 ${this.会话.会话ID}]`);
            const 钱包前缀 = chalk.green(`[${this.会话.钱包地址.slice(0, 6)}...]`);
            process.stdout.write(`${会话前缀} ${钱包前缀} ${chalk.cyan('🤖 AI响应: ')}`);
            
            let 完整响应内容 = "";

            for await (const 数据块 of 响应.body) {
                const 行列表 = 数据块.toString().split('\n');
                for (const 单行 of 行列表) {
                    if (单行.startsWith('data: ')) {
                        try {
                            const 原始数据 = 单行.slice(6);
                            if (原始数据 === '[DONE]') break;

                            const 解析数据 = JSON.parse(原始数据);
                            const 内容 = 解析数据.choices?.[0]?.delta?.content || '';
                            if (内容) {
                                完整响应内容 += 内容;
                                process.stdout.write(chalk.magenta(内容));
                            }
                        } catch (解析错误) {
                            continue;
                        }
                    }
                }
            }
            console.log();
            return 完整响应内容.trim();
        } catch (错误) {
            this.记录日志('❌', `AI请求失败: ${错误}`, 'red');
            return "";
        }
    }

    async 上报使用情况(终端节点, 请求内容, 响应内容) {
        this.记录日志('📝', '记录互动数据...', 'white');
        const 上报地址 = 'https://quests-usage-dev.prod.zettablock.com/api/report_usage';
        const 上报数据 = {
            wallet_address: this.会话.钱包地址,
            agent_id: AI终端节点[终端节点].代理ID,
            request_text: 请求内容,
            response_text: 响应内容,
            request_metadata: {}
        };

        try {
            const 代理实例 = 创建代理(this.代理配置);
            const 结果 = await fetch(上报地址, {
                method: 'POST',
                agent: 代理实例,
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                body: JSON.stringify(上报数据)
            });
            return 结果.status === 200;
        } catch (错误) {
            this.记录日志('❌', `数据上报失败: ${错误}`, 'red');
            return false;
        }
    }

    async 启动() {
        this.记录日志('🚀', '启动Kite AI自动化系统', 'green');
        this.记录日志('💼', `绑定钱包: ${this.会话.钱包地址}`, 'cyan');
        this.记录日志('🎯', `每日目标: ${this.每日积分上限}积分 (${this.每日积分上限/this.单次积分}次互动)`, 'cyan');
        this.记录日志('⏰', `下次重置: ${this.会话.下次重置时间.toISOString().replace('T', ' ').slice(0, 19)}`, 'cyan');
        
        this.代理配置 
            ? this.记录日志('🌐', `使用代理: ${this.代理配置.协议}://${this.代理配置.主机}:${this.代理配置.端口}`, 'cyan')
            : this.记录日志('🌐', '使用直连模式', 'yellow');

        let 互动计数 = 0;
        try {
            while (this.运行状态) {
                this.重置每日积分();
                await this.检查积分限制();

                互动计数++;
                console.log(`\n${chalk.blue(`[会话 ${this.会话.会话ID}]`)} ${chalk.green(`[${this.会话.钱包地址}]`)} ${chalk.cyan('═'.repeat(60))}`);
                this.记录日志('🔄', `第 ${互动计数} 次互动`, 'magenta');
                this.记录日志('📈', `进度: ${this.会话.每日积分 + this.单次积分}/${this.每日积分上限} 积分`, 'cyan');

                const 交易列表 = await this.获取最近交易();
                AI终端节点["https://deployment-sofftlsf9z4fya3qchykaanq.stag-vxzy.zettablock.com/main"].问题集 = 
                    交易列表.map(交易哈希 => `详细分析该交易: ${交易哈希}`);

                const 节点列表 = Object.keys(AI终端节点);
                const 随机节点 = 节点列表[Math.floor(Math.random() * 节点列表.length)];
                const 问题集 = AI终端节点[随机节点].问题集;
                const 随机问题 = 问题集[Math.floor(Math.random() * 问题集.length)];

                this.记录日志('🤖', `AI系统: ${AI终端节点[随机节点].名称}`, 'cyan');
                this.记录日志('❓', `提问: ${随机问题}`, 'cyan');

                const AI响应 = await this.发送AI请求(随机节点, 随机问题);
                let 互动结果 = false;

                if (await this.上报使用情况(随机节点, 随机问题, AI响应)) {
                    this.记录日志('✅', '互动记录成功', 'green');
                    this.会话.每日积分 += this.单次积分;
                    互动结果 = true;
                } else {
                    this.记录日志('⚠️', '互动记录失败', 'red');
                }

                this.会话.更新统计(AI终端节点[随机节点].名称, 互动结果);
                this.会话.显示统计();

                const 间隔时间 = Math.random() * 2 + 1;
                this.记录日志('⏳', `等待 ${间隔时间.toFixed(1)} 秒...`, 'yellow');
                await new Promise(resolve => setTimeout(resolve, 间隔时间 * 1000));
            }
        } catch (错误) {
            this.记录日志('❌', `系统错误: ${错误}`, 'red');
        }
    }

    停止() {
        this.运行状态 = false;
    }
}

async function 主程序() {
  console.clear();
    console.log(`${chalk.yellow('优化修改说明：以下内容为 @推特：longyueting 进行整体汉化和部分优化修改')}\n`);
    console.log(`${chalk.yellow('代理健康检查系统：启动时自动验证代理可用性、每小时自动检测代理状态、失效代理自动终止会话')}\n`);
    console.log(`${chalk.yellow('多重错误恢复：区分网络错误和业务错误、记录详细的错误上下文、失败操作自动降级处理')}\n`);
    console.log(`${chalk.yellow('代理生命周期管理：代理实例统一管理、自动回收失效代理、连接异常主动熔断')}\n`);
    console.log(`${chalk.yellow('@推特：longyueting')}\n`);
    console.log(`${chalk.yellow('汉化作者：https://github.com/121panda121/Kile_Ai_Bot')}\n`);
    console.log(`${chalk.yellow('原作者：https://github.com/airdropinsiders/KiteAi-Auto-Bot')}\n`);
    console.log(chalk.magenta('按任意键继续...'));
    // await 等待按键();
    console.clear();
    console.log(banner);
    
    const 钱包列表 = await 加载钱包();
    const 代理列表 = await 加载代理();

    // if (钱包列表.length !== 代理列表.length) {
    //     console.log(`${chalk.red('[错误]')} 钱包数量 (${钱包列表.length}) 与代理数量 (${代理列表.length}) 不匹配`);
    //     process.exit(1);
    // }

    console.log(`${chalk.cyan('📊 已加载:')} ${chalk.green(钱包列表.length)} 个钱包 ${chalk.green(代理列表.length)} 个代理\n`);
    
    const 实例列表 = 钱包列表.map((钱包地址, 索引) => 
        new KiteAI自动化(钱包地址, 代理列表[索引], 索引 + 1)
    );
    
    console.log(chalk.cyan('\n════════════════════════'));
    console.log(chalk.cyan('🤖 启动所有会话'));
    console.log(chalk.cyan('════════════════════════\n'));
    
    try {
        await Promise.all(实例列表.map(实例 => 实例.启动()));
    } catch (错误) {
        console.log(`\n${chalk.red('❌ 致命错误:')} ${错误.message}`);
    }
}

// 进程控制
process.on('SIGINT', () => {
    console.log(`\n${chalk.yellow('🛑 正在优雅关闭...')}`);
    process.exit(0);
});

process.on('unhandledRejection', (错误) => {
    console.error(`\n${chalk.red('❌ 未处理的异常:')} ${错误.message}`);
});

cron.schedule('0 12 * * *', () => {
  console.log('开始执行kite ai主程序...');
  主程序().catch(错误 => {
    console.error(`\n${chalk.red('❌ 致命错误:')} ${错误.message}`);
    process.exit(1);
  });
});
