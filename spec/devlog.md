# Development Log

> **维护规则**：每次 PR 合并后，由 AI 自动追加一条记录。
>
> 每条记录应包含：日期、变更名、摘要、关键决策/坑点。

---

## Entry Template

```markdown
### YYYY-MM-DD · <change-name>

**摘要**：一句话说清楚这次变更做了什么。

**关键决策**：
- 决策点 1 — 选了什么、放弃了什么、为什么
- 决策点 2 — ...

**踩坑 / 经验**：
- 坑点描述 + 如何解决（可选）

**相关产出**：
- 归档位置：`openspec/changes/archive/<change-name>/`
- PR：#xxx（如适用）
```

---

## Log Entries

<!-- 最新条目在最上面 -->

### 2026-08-21 · cang-knowledge-base（父分支：version/v1.0）

**摘要**：落地 R-v1.0-CK-4 藏——新 cang 模块（迁移 0004 三表：`cang_items` / `cang_themes`(UNIQUE user+name) / `cang_item_themes`）；MentorService 新增 `cang_tag` 场景（收藏时增量打标：≤2 主题、单个 ≤8 字、优先复用已有；打标失败降级「未归组」不阻塞 201）；接口 POST/GET/DELETE（四码 400、404 不泄露存在性、GET map 剥掉内部 userId）；前端镜子页两处 + 召唤页一处「收进藏里」入口 + 头部「藏」入口 + 藏页（手动收藏、主题分组浏览、长按删除确认）。后端 111 测试、前端 35 测试全绿；场景 1~11 curl 实证（含真实 LLM 打标与主题复用、打标失败降级）、12~15 模拟器截图验证。

**关键决策**：
- 先收后标、打标静默降级：收藏是主行动、打标是增强——打标失败落「未归组」不阻塞 201（对照 renwen 召唤类主动作失败 = 显式 503 的原则：有主流程可让路才允许缺省）
- cang_tag 走 MentorService 网关：导师人格整理思想地图，AI 出口统一不破
- sourceLabel 客户端写入（≤64 字）：是展示物不是事实源，不跨模块反查

**踩坑 / 经验**：
- vitest：`null ?? default` 把显式 null 当缺省——可选参数要区分"没传"用 `"key" in opts`
- `upsertTheme` 用 `ON CONFLICT (user_id, name) DO UPDATE` 拿 id 会有 sequence 空洞（id 跳号无害，勿误判为 bug）
- 来源 label 勿含日期：藏页条目 meta 已拼 createdAt 日期，label 再带日期会重复（修复后旧行保留旧 label 属预期）

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-08-21-cang-knowledge-base/`（含 screenshots/）

### 2026-08-20 · renwen-mentors（父分支：version/v1.0）

**摘要**：落地 R-v1.0-CK-3 人文导师团——新 renwen 模块（canon 出处库代码常量：苏格拉底/马可·奥勒留/王阳明/曾国藩 × 3~4 条真实原典；迁移 0003 `renwen_sessions`）；MentorService 新增 `renwen_reply` 场景（人物 persona 顶替导师人格、记忆照注）；召唤接口（指定人物/导师代选轮转、出处轮转、每日上限 3 次 429、LLM 失败显式 503 不落库）+ 人物列表/历史回看接口；前端镜子页常驻入口 + 召唤页（困惑输入、人物选择卡、回应卡含引荐语与出处、过往列表）。后端 84 测试、前端 28 测试全绿；场景 1~10 curl 实证（含真实 LLM 召唤、429/503/400）、11~14 模拟器截图验证。

**关键决策**：
- 注入式出处防幻觉：出处从「生成物」变「选择物」——先选 canon 条目注入 prompt，标注用库内篇名，LLM 输出的任何引文样式不作数
- 召唤类主动作失败语义 = 显式 503 不假兜底（与导师回应 null 缺省对照：有主流程可让路才允许缺省）
- 人物代选/出处轮转 = 累计召唤数取模（确定性、可测试，不引入 LLM 代选与随机）
- 同人物相邻条目篇名不重复（canon 测试钉住）——轮转时用户看到的出处必换；王阳明两条《传习录》细分到徐爱录/钱德洪录

**踩坑 / 经验**：
- ListView 懒加载：widget 测试对视口外按钮/区块须先 `scrollUntilVisible` 再断言/点击
- 自查发现：召唤成功后「过往」列表不刷新（首屏快照）——成功后重拉 sessions 修复；async 间隙的 setState 全部补 mounted 守卫
- 已接受 V1 风险：每日上限的计数-写入并发窗口（单人设备最坏当日多召唤一次，成本风险，不加锁）
- 本机累积多个历史 `tsx watch` 进程会守护重启占用 3000——做 503 降级验证前须先 pkill 干净

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-08-20-renwen-mentors/`
- spec/design.md 提升：人文导师团约束（注入式出处防幻觉 + 召唤失败语义）、RenwenSession 数据模型行、日期口径补 `shanghaiDayStartMs`、模块划分加 renwen
- 主规格同步：`openspec/specs/renwen/spec.md`（14 场景，新建）

### 2026-08-19 · ai-mentor-core（父分支：version/v1.0）

**摘要**：落地 R-v1.0-CK-2 导师核心——users 加 mentor_name/mentor_style（迁移 0002），新建 mentor 模块作为唯一 LLM 网关（MentorService 场景化：人格+记忆注入、按场景降级），收口并删除 mirror 的散装 QuestionGenerator；新增导师回应（≤60 字不追问，失败缺省 null）与 `GET/PUT /api/mentor/profile`；前端导师设置页（改名/切风格）+ 回应卡 + 动态署名。后端 51 测试、前端 21 测试全绿；场景 1~13 curl 实证、14~16 模拟器截图验证。

**关键决策**：
- 人格存 users 加列（1:1 不建独立表）；记忆 V1 = 近 14 天原始回答注入 + MemoryProvider 令牌预留蒸馏
- 模块环（Mirror→Mentor 用服务、记忆反向读 Mirror 数据）用全局 MemoryModule 解开，不用 forwardRef
- DeviceIdMiddleware 移入 common（mentor/mirror 共用，不跨模块偷调）

**踩坑 / 经验**：
- vitest 4 下 `vi.fn().mockImplementation(箭头函数)` 不能 `new`（"is not a constructor"）——llm.probe 存量测试因此失效（HEAD 上即失败），改用 `function` 修复
- adb input 无法输入中文，模拟器改名交互靠 widget 测试覆盖；风格切换+保存返回流程模拟器实测

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-08-19-ai-mentor-core/`
- spec/design.md 提升：AI 出口统一约束、导师回应契约、User/MirrorEntry/MentorMemory 落地行
- 主规格同步：`openspec/specs/mentor/spec.md`（16 场景）

### 2026-08-18 · mirror-moment（父分支：version/v1.0）

**摘要**：镜子时刻落地——每日一问（LLM 个性化 + 14 条问题库兜底）、文字回答（当天可改）、声音档案分页回看。后端首批业务表（users / mirror_entries + SQL 迁移机制）、X-Device-Id 懒建用户；前端数字文房 theme token + 镜子时刻/声音档案两页，App 入口从骨架页切换。spec 场景 1~15 全部验证（后端 curl 实跑 + Android 模拟器截图 5 张），CI run 32153059097 绿灯。

**关键决策**：
- 裸 pg + `backend/migrations/*.sql` 顺序迁移（启动自动执行、失败即启动失败），不引 ORM——后续变更默认沿用的先例
- X-Device-Id 匿名设备标识 + 懒建 users；换设备即新身份是已知局限，绑定留后续
- 每日问题：有近 7 天回答 → LLM 生成（≤40 字单问句校验），任何失败落问题库兜底，用户无感；问题落库当天幂等
- 回答只记录无即时回应；当天重复提交为幂等更新（201/200）
- QuestionGenerator 是临时散装 LLM 出口——ai-mentor-core 的 tasks 必含「收口 QuestionGenerator」

**踩坑 / 经验**：
- glm-5.2 是推理模型：不显式 `thinking:{type:disabled}` 会把 max_tokens 烧在 reasoning 上、content 返回空（finish_reason=length）——已写入 spec/design.md 通用约束
- Flutter 文字稿 setState(() => future) 箭头闭包返回 Future 会炸——一律用块体
- Android 模拟器无衬线 CJK 字体，「数字文房」衬线回退无衬线；iOS（首发目标）有 Songti SC，差异记录在 screenshots/README.md
- 遗留：已回答态 UI 暂不支持修改当天回答（API 已支持 200 更新，UI 入口留待导师变更）；`docs/硬件-默窗-概念与众筹文案.md` 为人工新增文档，未随本变更提交

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-08-18-mirror-moment/`
- 主规格：`openspec/specs/mirror/spec.md`；design 提升：迁移机制 / 用户标识 / 日期口径 / glm thinking 约束 / shared_preferences 依赖
- CI run：32153059097（success）

### 2026-08-18 · bootstrap-app-scaffold（父分支：version/v1.0）

**摘要**：照见全栈骨架落地——NestJS 后端（/api/health db 探针 + /api/health/llm 火山方舟三态探针）、Flutter 前端（iOS+Android 工程、健康状态启动页）、docker-compose 本地 postgres:16+pgvector、GitHub Actions 双 job CI。spec 场景 1~11 全部实跑验证通过（场景 8 经 Android 模拟器，Xcode 未装）。

**关键决策**：
- 模板示例代码（server.js/tasks.js/app.js 等）删除，README 第 3 节改写为真实项目本地开发指引
- 执行期修正×3：①Docker Hub/容器 apt 网络受阻→本地构建 pgvector 镜像（宿主机代理 build-arg）②Xcode 缺失→开放 Android 平台作开发验证目标（首发仍仅 iOS）③LLM 实际用方舟 Coding Plan（base URL `.../api/coding/v1`，model 填模型名）

**踩坑 / 经验**：
- tsx/esbuild 不保证 emitDecoratorMetadata，NestJS 按类型注入静默失效——**约定：所有构造器注入显式 @Inject()**
- vitest 两坑：mock 工厂里 class+参数属性、mockResolvedValue 后 mockReset 再 reject，都会把已 catch 的 rejection 误报 unhandled——用 vi.fn() 构造器 + Once 变体
- macOS 无 pwsh/cmd，validate-template 用 python 等价复刻校验（hardness + ui 均通过）

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-08-18-bootstrap-app-scaffold/`
- CI run：32099389370（backend/frontend 均 success）
- 遗留：iOS 模拟器验证待 Xcode 安装后补；validate-template 的 macOS 原生支持可另开变更

### 2026-08-17 · 版本 v1.0 首次 kickoff · 由 CK 追加：新增 R-v1.0-CK-1~12

**摘要**：基于 `docs/照见-PRD-v1.md` 完成项目首次 kickoff——`spec/requirements.md` 写入 12 条 Must Have 需求（含非目标/Future/成功标准），`spec/tasks.md` 拆出 M1~M4 共 15 条任务，`spec/design.md` 初始化架构方向。

**关键决策**：
- 跨端框架（Flutter/RN 待定）但仅 iOS 首发——拦截等 iOS 能力仍需原生模块，审核风险在 M3 早验证
- 国内大模型路线——可直连、合规低、成本可承受
- 镜子时刻 V1 文字先行，语音（ASR）后置
- 拦截「只打断不阻止」，写入非目标防范围蔓延

**相关产出**：
- 版本分支：`version/v1.0`（本地，未推远程）
- 需求 ID 段：R-v1.0-CK-1 ~ R-v1.0-CK-12

### 2026-07-30 · fix-ui-validation-fp（父分支：main）

**摘要**：修复 `validate-ui.ps1` 对非界面变更的关键词误判——关键词扫描前剥离反引号行内代码（路径/目录引用不参与分类），并新增显式豁免标记 `<!-- not-ui: 原因 -->`。

**关键决策**：
- 两刀并施：反引号剥离解决"引用 `standard-ui-change` 目录名"类误报；`not-ui` 豁免标记解决"正文不可避免含 UI 关键词但非界面变更"（如修 UI 校验器本身）
- 豁免标记是显式契约，在 CLAUDE.md/AGENTS.md/README.md/examples 同步记录，并警示"真界面变更滥用等于绕过 UI Check"

**踩坑 / 经验**：
- 回归夹具用 bash heredoc 写中文致编码乱码、关键词匹配假阴性，改用 PowerShell `WriteAllText`（UTF-8 无 BOM）后真 UI 缺 Check 的场景正确失败——测试夹具编码是被测逻辑成立的前提
- 三个回归场景（反引号引用通过 / 豁免生效 / 真 UI 缺 Check 仍失败）确认不误伤正常校验

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-07-30-fix-ui-validation-fp/`
- 闭环了 2026-07-23 doc-task-decomposition-guide 条目预告的 validate-ui 修复

### 2026-07-23 · doc-task-decomposition-guide（父分支：main）

**摘要**：为「任务拆解」阶段补齐编写指引——CLAUDE.md/AGENTS.md 新增「任务拆解规则」六条小节，工作流.mdc 补内联速记，examples 两个 tasks.md 骨架补规则指针。

**关键决策**：
- 规则沉淀在 CLAUDE.md 一处，examples 骨架只放指针，避免多处维护漂移
- 工作流.mdc 用内联速记而非指针——它是独立精简版，引用 CLAUDE.md 会制造耦合

**踩坑 / 经验**：
- 执行期发现 tasks.md 与实现偏差（mdc 指针→速记），按规则 6"执行期可修正"停下来改 tasks.md 再继续——该机制首次实战验证有效
- **发现 validate-ui.ps1 误报 bug**：变更目录内文本引用 `standard-ui-change` 时，`ui` 被 `\b(ui|...)\b` 关键词命中，非 UI 变更被误判。待另开变更修复

**相关产出**：
- 归档位置：`openspec/changes/archive/2026-07-23-doc-task-decomposition-guide/`

### 2026-04-16 · bootstrap-speccoding-template

**摘要**：从 SpecCoding Template 初始化项目骨架。

**关键决策**：
- 采用「两级 Spec 体系」：`spec/` 管全局、`openspec/` 管单次变更
- 开发工作流固化为七阶段：git branch → scaffold → brainstorm → plan → execute → archive → merge

**相关产出**：
- 项目级 spec 文档骨架（requirements / design / tasks / devlog / structure）
- OpenSpec 配置 + 示例归档变更 `example-add-user-auth`
