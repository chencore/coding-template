# Spec: AI Mentor Core（导师人格与统一 AI 出口）

**规格风格**：场景式（Scenario-based）——每条规格描述一个可验证的业务场景。

---

## 导师人格配置

### 场景 1：新用户默认人格
- **前置**：设备 ID 从未出现
- **动作**：`GET /api/mentor/profile`，头 `X-Device-Id`
- **预期**：返回 200 `{ name: "默", style: "gentle" }`；用户行懒创建且带默认人格

### 场景 2：缺少设备 ID 头
- **动作**：不带 `X-Device-Id` 请求任一 `/api/mentor/*`
- **预期**：返回 400 `missing_device_id`

### 场景 3：改导师名字
- **动作**：`PUT /api/mentor/profile`，`{ "name": "远山" }`
- **预期**：返回 200 `{ name: "远山", style: <不变> }`；随后 `GET /api/mirror/today` 响应的 `mentor.name` 为「远山」

### 场景 4：名字非法
- **动作**：`PUT` name 为纯空白 / 超过 12 字
- **预期**：返回 400 `invalid_name`；原名字不变

### 场景 5：切换风格
- **动作**：`PUT /api/mentor/profile`，`{ "style": "socratic" }`
- **预期**：返回 200，style 更新；合法值为 `gentle | socratic | companion`

### 场景 6：风格非法 / 空 body
- **动作**：`PUT` style 为枚举外值；或 body 无有效字段
- **预期**：分别返回 400 `invalid_style` / 400 `empty_profile_update`；原配置不变

---

## 统一 AI 出口与人格注入

### 场景 7：提问经导师人格发出
- **前置**：用户近 14 天有 ≥1 条回答；导师为「远山 · socratic」
- **动作**：`GET /api/mirror/today`
- **预期**：LLM 调用的 system prompt 含导师名「远山」与 socratic 风格人格段，user prompt 含近 14 天回答历史；返回问题 `questionSource="llm"`

### 场景 8：无历史仍走题库、无风格仍温和
- **前置**：新用户（默认 默/gentle），无回答历史
- **动作**：`GET /api/mirror/today`
- **预期**：`questionSource="bank"`，不调用 LLM（沿用 mirror 场景 3）

### 场景 9：LLM 失败降级不变
- **前置**：LLM 不可达 / 密钥未配置 / 输出不合格
- **动作**：`GET /api/mirror/today`
- **预期**：`questionSource="bank"`，warn 日志含失败类别、不含用户内容（沿用 mirror 场景 5）

---

## 导师回应

### 场景 10：提交回答获得导师回应
- **前置**：LLM 正常；导师为默认人格
- **动作**：`PUT /api/mirror/today/answer`，`{ "text": "今天终于把拖了一周的事做完了。" }`
- **预期**：响应含 `mentorReply`：一句 ≤60 字的中文短句，**不以问号结尾**（不追问）、不复述用户原文；`mirror_entries.mentor_reply` 落库；随后 `GET /api/mirror/today` 返回同一 `mentorReply`

### 场景 11：回应生成失败——主流程不受影响
- **前置**：LLM 不可达
- **动作**：`PUT` 提交回答
- **预期**：回答正常写入（201），`mentorReply` 为 `null`；warn 日志含失败类别、不含用户内容

### 场景 12：当天改回答——回应重新生成
- **前置**：当天已回答且有 `mentor_reply`
- **动作**：再次 `PUT` 不同内容
- **预期**：返回 200，`mentorReply` 为基于新内容的新生回应；库中 `mentor_reply` 同步更新

### 场景 13：回应也带人格
- **前置**：导师风格为 `companion`
- **动作**：提交回答
- **预期**：LLM 调用的 system prompt 含 companion 风格人格段与导师名

---

## 前端

### 场景 14：导师设置页改名 + 切风格
- **前置**：进入镜子页，点 header「导师」入口
- **动作**：名字改为「远山」，风格选「苏格拉底追问型」，保存
- **预期**：保存成功返回镜子页；镜子页署名变为「远山 · 你的导师」

### 场景 15：设置保存失败可重试
- **前置**：后端不可达
- **动作**：设置页修改后保存
- **预期**：提示保存失败、已填内容不丢；恢复网络后重试成功

### 场景 16：回应卡展示
- **前置**：提交回答后获得 `mentorReply`
- **动作**：查看已回答态
- **预期**：回应卡展示导师回应并以导师名署名；`mentorReply` 为 null 时显示固定文案「已记下。明天见。」
