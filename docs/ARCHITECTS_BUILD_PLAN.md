# Arc Architects 建设规划

> 更新日期：2026-09-15  
> 维护者：[@xseven0908](https://github.com/xseven0908)  
> 范围：Arc Testnet；不承诺主网上线或资金安全

## 1. 目标

把现有 Arc 代码从“已跑通的个人 Demo”升级为六个可以公开验证、方向互补的成果：

1. 一个安全、可复用、文档完整的 Arc 支付开发套件；
2. 一个可现场演示的密封竞价应用；
3. 一个补足 Arc 生态空缺的支付可观测与对账工具；
4. 一个基于 ERC-8004 与 ERC-8183 的 agent 工作市场；
5. 一个可复现的 Arc 费用与性能研究工具；
6. 一组能被社区复用的基准数据、方法论和技术文章。

Arc Architects 当前把可运行的应用、集成、开发者工具或开源项目列为计划中的
`Verified Arc Builder` 活动，但验证方式和奖励尚未公布，也不保证追溯计算。因此本规划以
“公开可验证的工程质量和社区价值”为目标，不以积分或奖励为交付标准。

## 2. 当前资产盘点

| 仓库 | 定位 | 当前优势 | 主要缺口 | 建议 |
| --- | --- | --- | --- | --- |
| `arc-starter-kit` | Arc 支付与合约入门套件 | 4 个合约、17 个测试、App Kit、前端、MCP agent、链上交易证据、CI | 范围偏散；安全测试不足；前端未完成真实钱包点测；RPC 文档与容错需更新 | 作为主仓库持续建设 |
| `arc-sealed-bid-auction` | 原生 USDC 密封竞价 | 问题选择清晰；commit-reveal；8 个测试；已完成链上全流程 | `finalizeAuction` 无界循环；push payment 可被恶意 bidder 阻断；缺前端与审计材料 | 先安全重构，再做公开 Demo |
| `arc-agent-work-market` | Agent 身份、任务托管与信誉 | 已有严格状态机、Arc 结算证明校验、REST API 和 8 个测试 | 仍需持久化存储、链上写入、钱包 UI 和公开演示 | 作为 agentic economy 主项目 |
| `arc-payment-ops` | 支付索引、恢复与对账 | 已有事件解码、checkpoint、RPC failover、幂等存储和 5 个测试 | 仍需数据库、长时间回放、指标与 dashboard | 作为开发者基础设施主项目 |
| `arc-fee-lab` | 费用与区块性能研究 | 已有真实 RPC 采样、统计分析、JSON/CSV/Markdown 导出和 5 个测试 | 仍需扩大样本、历史趋势、可视化和持续采样 | 作为研究与内容贡献主项目 |
| `ethfi-lens` | 数据看板 | Next.js/Cloudflare/Drizzle 的产品化经验 | 与 Arc 无直接关系 | 保留并作为前端/数据工程能力证明 |
| `x_zama` | 极小原创仓库 | 可证明 FHE 兴趣 | 几乎无可展示内容 | 补 README 或归档 |
| 其他仓库 | 以 fork 为主 | 技术兴趣广 | 会稀释 Arc 原创成果的可见度 | 不删除；主页只置顶原创项目 |

## 3. 项目优先级

### P0：完善 GitHub 作品集

目标：访问主页 30 秒内能理解“做了什么、为何适合 Arc、如何验证”。

- 置顶：`arc-starter-kit`、`arc-sealed-bid-auction`、`ethfi-lens`。
- 两个 Arc 仓库补齐 `LICENSE`、topics、演示截图、架构图和 Testnet 链接。
- 发布 `v0.1.0` release，并附可复现的部署与验证步骤。
- README 明确区分：本地测试通过、Testnet 实测、尚未验证。
- 为账号增加 profile README，集中展示 Arc 项目、合约地址、演示链接和贡献记录。

验收：全新环境可按 README 在 15 分钟内完成安装、测试和只读验证。

### P1：`arc-starter-kit` v0.2 — 从 Starter Kit 到 Reference Lab

目标：让开发者可以复制一个完整且安全边界清晰的 Arc 支付模式，而不只是复制合约代码。

#### 安全与正确性

- 用 pull-payment/withdraw 模式替换关键路径中的 `.transfer()`，避免接收方回退逻辑阻断状态机。
- 为数组/映射访问增加明确的 ID 存在性检查和 custom errors。
- 加入重入、恶意接收合约、边界金额、时间边界、舍入和状态机性质测试。
- 引入 Slither；为资金守恒、份额守恒和单次结算编写 invariant/fuzz tests。
- 明确 `SavingsPool` 只是 ERC-4626 风格的教学实现，不宣称符合 ERC-4626。
- 保留 Testnet-only 警告；任何密钥只从环境变量或受控钱包读取。

#### 可用性与可靠性

- 将网络常量集中到一个版本化配置文件；统一使用当前官方 Arc Testnet RPC 域名。
- 为 RPC 429、短期不可用、receipt 超时和日志裁剪增加退避、检查点与降级说明。
- 前端完成真实钱包 golden path：连接、切链、支付、失败提示、交易链接。
- 部署公开前端，并提供无需密钥的只读演示模式。
- 将合约地址、部署块高、源码 commit 和链环境写入 `deployments/*.json`。

#### 文档结构

- `docs/architecture.md`：组件、信任边界、资金流。
- `docs/security-model.md`：威胁模型、已知限制、非生产用途。
- `docs/recipes/`：invoice、escrow、agent payment 三个最小配方。
- `docs/troubleshooting.md`：RPC、钱包、USDC decimals、gas 和日志查询问题。

验收：CI 同时通过 compile、unit、fuzz/invariant、static analysis、frontend build；至少一条公开
Testnet golden path 有交易哈希和短视频证据。

### P1：`arc-sealed-bid-auction` v0.2 — 安全重构

目标：消除当前最明显的资金可用性风险，再增加 UI。

- `finalizeAuction` 改为 O(1) 结算：只确定赢家和卖家收益，不遍历所有 bidder。
- 每个 bidder 使用 `claimRefund()` 自行领取退款；卖家使用 `claimProceeds()` 领取收入。
- 使用 checks-effects-interactions、低级 `call` 的明确错误处理和重入保护。
- 定义平价出价规则、无人 reveal、卖家取消、零出价和超大参与人数行为。
- 添加恶意 bidder 合约、重入、DoS、时间边界和资金守恒测试。
- 增加最小前端：创建、commit、离线保存 salt、reveal、finalize、claim。
- UI 必须醒目提醒用户备份 salt；不得将 salt 上传到服务端或写入公共日志。

验收：finalize gas 不随 bidder 数量线性增长；恶意接收者不能阻断其他人结算；两名以上 bidder
在 Testnet 完成一轮公开演示。

### P2：新项目 `arc-payment-ops`

这是建议优先新增的仓库。与官方已经较多的电商、swap、借贷、prediction market 和 agent
payment Demo 相比，可靠的支付观测、失败恢复和对账工具更有差异化，也直接来自现有项目遇到的
RPC 日志裁剪与限流问题。

#### MVP 功能

- 监听 Arc 原生 USDC 转账和指定合约事件。
- 按 block checkpoint 增量同步，支持断点续跑和小范围回填。
- 多 RPC endpoint 健康检查、轮换、指数退避和速率限制。
- 对交易、receipt 和业务事件做幂等入库。
- 将链上结算与导入的订单 CSV/JSON 对账，输出 matched、missing、duplicate、amount mismatch。
- 提供 CLI、REST API、简洁 dashboard 和 CSV 导出。
- 暴露 Prometheus/OpenTelemetry 指标：同步高度、RPC 错误率、待确认交易和对账异常。

#### 建议架构

```text
Arc RPC(s) ---> indexer ---> normalized events ---> Postgres/SQLite
                   |                |                    |
                   v                v                    v
              checkpoint       reconciler --------> REST/CLI
                                                        |
                                                        v
                                                    dashboard
```

技术栈：TypeScript、viem、Postgres（本地可用 SQLite）、Fastify、React/Vite。MVP 保持单进程，
到事件量或重放任务明显增长后再拆队列和 worker。

#### API 草案

- `POST /sources/contracts`：登记要跟踪的合约和 ABI。
- `GET /sync/status`：返回最新链高、checkpoint、延迟和 RPC 健康度。
- `POST /reconciliations`：提交订单数据并创建对账任务。
- `GET /reconciliations/:id`：获取摘要与异常项。
- `GET /transactions/:hash`：返回标准化 receipt、事件和业务映射。

验收：人为中断后能从 checkpoint 恢复；重复区块扫描不产生重复记录；单个 RPC 429 时自动切换；
示例订单集能稳定复现四类对账结果。

### P2：新项目 `arc-agent-work-market`

目标：把 Arc 已部署的 ERC-8004 身份/信誉和 ERC-8183 任务结算组合成一个可验证的 agent 协作样板。

- 用链上 identity ID 描述 agent，用 ERC-8183 job ID 关联客户、服务方、评估方、预算与状态。
- 只有在 receipt、目标合约、调用者、job 参数和完成状态均校验通过后，才写入信誉记录。
- 增加 SQLite/Postgres 持久化、钱包签名、任务创建/资助/提交/完成流程和可公开使用的 UI。
- 发布一组恶意证明、重复证明、错误评估方和状态竞争测试，明确链下服务的信任边界。

验收：两个已注册 agent 在 Arc Testnet 完成一条 ERC-8183 工作流，API 能从交易证明重建任务和信誉记录。

### P3：新项目 `arc-fee-lab`

目标：持续产出可复现的 Arc 费用、区块利用率和典型操作成本基准，而不是只给出一次性截图。

- 采样区块时间、base fee、gas 使用率，并报告 min、P50、P95、P99、变异系数。
- 将 21k、65k、150k、500k gas 的典型操作成本换算为原生 USDC。
- 每份报告包含 RPC、chain ID、区块范围、时间和源码 commit，导出 JSON、CSV、Markdown。
- 增加定时采样、历史趋势图和方法论说明；将结论整理为 Arc 社区文章。

验收：CI 可复现统计与导出；公开数据集至少覆盖一周，并对异常值和采样限制做明确说明。

## 4. 六周执行顺序

| 周 | 交付 |
| --- | --- |
| 第 1 周 | GitHub 主页整理；两个 Arc 仓库补 LICENSE/topics/release；修正文档与网络配置 |
| 第 2 周 | `arc-starter-kit` 威胁模型、静态分析、恶意合约与 invariant tests |
| 第 3 周 | starter 前端真实钱包测试、公开部署、golden path 证据 |
| 第 4 周 | auction O(1) finalize + pull claims + 安全测试 |
| 第 5 周 | auction 前端与多人 Testnet 演示；将 `arc-payment-ops` 接入持久化和 dashboard |
| 第 6 周 | 完成 agent 市场 Testnet 流程；扩大 fee lab 样本并发布首份社区研究报告 |

每周至少产出一个可公开验证的成果：release、部署、测试报告、技术文章或上游 PR。Arc House 当前可
获得积分的路径优先考虑 approved guest post、accepted answer、approved beta feedback、hackathon、
developer challenge 和 bounty；不要假设代码仓库会被追溯计分。

## 5. Git 工作流

- 每个 issue 只解决一个可验收问题；避免“update project”式大提交。
- 分支格式：`feat/<scope>`、`fix/<scope>`、`docs/<scope>`、`test/<scope>`。
- 提交格式：Conventional Commits，例如 `fix(auction): replace batch refunds with pull claims`。
- PR 必须包含：问题、方案、风险、测试、Testnet 证据（如适用）和回滚方式。
- `main` 保护：CI 必须通过；禁止提交 `.env*`、私钥、recovery file 或真实 API key。
- milestone：`starter-v0.2`、`auction-v0.2`、`payment-ops-mvp`、`agent-market-mvp`、`fee-lab-report-1`。

建议将本文件提交到 `arc-starter-kit`：

```bash
git checkout -b docs/architects-build-plan
git add docs/ARCHITECTS_BUILD_PLAN.md
git commit -m "docs: add Arc Architects build plan"
git push -u origin docs/architects-build-plan
```

推送前先更新 GitHub CLI 登录；当前机器上的 `xseven0908` 凭据已失效。不要把 token 写进仓库。

## 6. 暂不做的项目

- 再做一个普通 swap、bridge、e-commerce 或 agent-pay Demo：官方和社区已有较完整实现，差异化不足。
- 直接把当前合约描述为 production-ready：尚无审计、性质测试和长期运行证据。
- 运行 validator/node 作为第一主线：运维成本高，且不能发挥现有 TypeScript、前端和支付合约积累。
- 为了增加仓库数量拆分大量小 Demo：Architects 更需要可运行、可验证、可复用的贡献。

## 7. 决策复盘点

- `arc-starter-kit` v0.2 完成后：决定继续做综合 reference lab，还是把 agent 模块独立成 SDK。
- auction 安全重构后：根据 APS 是否正式可用，决定保留 commit-reveal 或增加隐私执行版本。
- payment ops MVP 有真实用户后：根据事件量决定是否从单进程升级为 queue + workers。
- Arc 主网、SDK 或 RPC 行为变化时：重新核对 chain config、USDC 表示、finality 和错误处理。

## 8. 参考

- Arc Architects contribution opportunities: <https://community.arc.io/public/resources/architects-contribution-opportunities>
- Circle Arc repositories: <https://github.com/circlefin>
- Arc starter examples: <https://github.com/circlefin/docs-examples>
- Arc node and ecosystem issues: <https://github.com/circlefin/arc-node/issues>
- Circle skills for Arc and USDC: <https://github.com/circlefin/skills>
