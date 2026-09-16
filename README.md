# Base Converter Trainer

> 面向学生与程序员的进制转换与算法训练平台 —— 把进制转换练成肌肉记忆。

[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-66%20tests%20passed-6da544?logo=vitest&logoColor=white)](https://vitest.dev/)
[![PWA](https://img.shields.io/badge/PWA-installable-5a0fc8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Deploy](https://github.com/FanMojun/base-converter-trainer/actions/workflows/deploy.yml/badge.svg)](https://github.com/FanMojun/base-converter-trainer/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-在线演示-2ea44f?logo=googlechrome&logoColor=white)](https://fanmojun.github.io/base-converter-trainer/)

进制转换是一个「看懂只要五分钟，练熟要练一百题」的知识点。这个项目把**转换工具**、**随机出题**、**学习数据**、**错题复盘**放进同一个 PWA 里，形成一个能自我强化的练习闭环。

## 在线 Demo

**https://fanmojun.github.io/base-converter-trainer/**

无需安装，直接打开即可使用全部功能。支持手机浏览器访问，也可以「添加到主屏幕」当作 App 使用。

> 站点由 GitHub Actions 自动发布（见 `.github/workflows/deploy.yml`）：推送 `main` 后先跑
> `lint → test → build` 三道门禁，全绿才把 `dist/` 部署到 GitHub Pages。
> 因为 Pages 把站点挂在 `/<repo>/` 子路径下，构建时会注入 `VITE_BASE_PATH`，
> 并额外生成 `dist/404.html` 作为 SPA 深链接的回退页。

## 项目截图

| 首页 | 进制转换器 |
| --- | --- |
| ![首页](docs/screenshots/home.png) | ![转换器](docs/screenshots/converter.png) |

| 随机练习 | 学习统计 |
| --- | --- |
| ![练习](docs/screenshots/practice.png) | ![统计](docs/screenshots/dashboard-data.png) |

| 错题本 | 深色主题 |
| --- | --- |
| ![错题本](docs/screenshots/mistakes-data.png) | ![深色](docs/screenshots/home-dark.png) |

## 功能特性

| 模块 | 说明 |
| --- | --- |
| **进制转换器** | 二进制 / 八进制 / 十二进制 / 十进制 / 十六进制任意互转；支持大小写混输、空格与下划线自动忽略；一键交换输入与目标进制；结果可复制 |
| **随机练习** | 随机生成数值 + 源进制 + 目标进制，三档难度（入门 / 进阶 / 挑战）；提交即时判题，附「源进制 → 十进制 → 目标进制」解析 |
| **学习统计** | 总转换次数、总练习次数、正确次数、错误次数、正确率、当前连对、历史最高连对；练习数据按天聚合 |
| **转换历史** | 转换器每次成功转换都会记录「输入值 → 结果」与所用进制，统计页展示总次数与最近 5 条；重复提交同一组参数不会重复计数 |
| **数据可视化** | Recharts 每日练习量堆叠柱状图 + 正确率折线图，另有最近 30 天明细表 |
| **错题本** | 答错自动收录，保留原题 / 你的答案 / 正确答案 / 十进制值；支持一键重练、单条移除、清空（二次确认） |
| **PWA** | 可安装到桌面，二次访问离线可用 |
| **响应式** | 桌面 / 平板 / 手机三档布局，导航在小屏折叠 |
| **主题** | 跟随系统明暗偏好自动切换，图表配色同步 |

## 技术栈

- **React 18** + **Vite 5** —— 组件化与极速构建
- **JavaScript**（不使用 TypeScript）
- **原生 CSS** —— 设计令牌 + 语义化类名，无 CSS 框架
- **React Router 6** —— 多页面路由
- **Recharts 2** —— 统计图表
- **Vitest 2** —— 单元测试与整机冒烟测试
- **ESLint 9**（flat config）—— 代码规范
- **原生 Service Worker + Web App Manifest** —— PWA，未引入额外依赖

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认 http://localhost:5173）
npm run dev

# 3. 生产构建 + 本地预览（PWA 离线能力需要在预览下验证）
npm run build
npm run preview
```

## 可用脚本

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动开发服务器，带 HMR |
| `npm run build` | 生产构建，输出到 `dist/` |
| `npm run preview` | 本地预览生产产物 |
| `npm test` | 运行全部测试（Vitest） |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run lint` | ESLint 检查 |
| `npm run icons` | 重新生成 PWA 图标（手写 PNG 编码器，无需额外依赖） |

## 项目结构

```
src/
├── components/          # 可复用组件，样式与组件同目录
│   ├── AppShell.jsx     # 导航 + 路由出口 + 页脚（与 Router 解耦，便于测试）
│   ├── Navbar.jsx
│   ├── BaseSelect.jsx   # 进制选择器，转换页与练习页共用
│   ├── ConverterForm.jsx
│   ├── PracticeCard.jsx
│   └── Statistics.jsx
├── pages/
│   ├── Home.jsx
│   ├── Converter.jsx
│   ├── Practice.jsx
│   ├── Dashboard.jsx
│   └── Mistakes.jsx
├── utils/
│   ├── converter.js     # 进制转换引擎（纯函数，无 React 依赖）
│   └── generator.js     # 出题与判题（纯函数）
├── hooks/
│   ├── useStorage.js    # localStorage 封装：异常回退 + 跨标签页同步
│   └── useStats.js
├── context/
│   ├── StatsContext.js  # Context、初始结构、按天聚合等纯逻辑
│   └── StatsProvider.jsx
├── pwa/
│   └── registerServiceWorker.js
├── styles/
│   ├── tokens.css       # 设计令牌：颜色 / 间距 / 圆角 / 阴影
│   ├── base.css         # 重置 + 通用原子类
│   └── pages.css        # 页面级布局
└── tests/
    ├── converter.test.js
    ├── generator.test.js
    └── app.test.jsx     # 整机渲染冒烟测试
```

## 设计要点

### 1. 一套流水线，而不是 4×3 个转换函数

进制之间两两组合有 12 种方向。如果为每种组合单独实现，代码会迅速失控。因此所有转换都走同一条路径：

```
输入进制字符串 ──parseToDecimal──▶ 十进制 (BigInt) ──decimalToBase──▶ 目标进制字符串
```

- **中间值用 `BigInt`**，而不是 `Number`。`Number` 只有 53 位安全整数，64 位二进制串会静默丢精度；`BigInt` 可以精确处理任意长度。
- 底层只有两个函数（`parseToDecimal` / `decimalToBase`），上层 `convert()` 负责组合与错误处理。
- 输入校验与解析分离：`validateInput` 返回结构化结果不抛异常，供 UI 做实时提示；`parseToDecimal` 失败即中断，供业务逻辑使用。

### 2. 判题比较数值，而不是字符串

用户输入 `2d`、`2D`、`02D` 在语义上是同一件事。判题时统一规范化输入并比较解析后的数值，避免因大小写或前导零误判。

### 3. 状态写入收口到单一 Provider

练习页只负责「出题 / 显示 / 收集答案」，转换器只负责算出结果；统计、错题、转换历史的写入统一由 `StatsProvider` 完成（`recordAttempt` / `recordConversion`）。首页内嵌的转换器与独立的转换页共用同一个表单组件，因此两条入口写出来的数据结构一定一致。

**「练习次数」与「转换次数」是两个独立口径，刻意没有合并**：随手转一个数不等于做了一道题，把两者混在一起会让正确率失去意义。

### 4. 数据只存本地

所有学习数据保存在 `localStorage`，不上传任何服务器，也无需登录。`useStorage` 额外处理了三件事：写入失败（隐私模式 / 配额满）不崩溃、监听 `storage` 事件实现多标签页同步、提供 `reset()`。

转换历史另有一条去重规则：同一组「输入值 + 源进制 + 目标进制」重复提交（例如连点两次转换按钮）只刷新最近一条，不增加次数；把进制调换过来（16→2 变成 2→16）则算新的一次。

### 5. 错误提示面向使用者

错误码（`EMPTY_INPUT` / `INVALID_CHARACTERS` / `INVALID_BASE` / `UNSUPPORTED_SIGN`）与提示文案分离。提示会直接告诉用户「哪个字符不合法」以及「合法字符集是什么」，而不是只丢一个「输入无效」。

## 测试

```bash
npm test
```

```
 ✓ src/tests/converter.test.js   (31 tests)
 ✓ src/tests/generator.test.js   (24 tests)
 ✓ src/tests/app.test.jsx        (11 tests)

 Test Files  3 passed (3)
      Tests  66 passed (66)
```

覆盖范围：

- **四种进制互转**：二进制↔十六进制、八进制、十二进制（含 `A=10` / `B=11` 的边界）、十进制中转
- **全进制往返一致性**：2 / 8 / 10 / 12 / 16 两两组合共 25 组，`A → B → A` 结果必须一致
- **大数精度**：64 位全 1 二进制串转十进制与十六进制
- **错误输入**：空输入、空白字符串、非法字符、负数、不支持的进制，以及错误码是否正确
- **大小写与空白**：`2d` / `FF` / `1010 1010` / `1010_1010`
- **出题逻辑**：题面合法、源目标进制不同、难度约束（位数与可用进制）、答案自洽、题目 id 不重复
- **判题容错**：大小写、前导零、空答案、目标进制非法字符
- **整机冒烟**：五个路由各渲染一遍，防止页面级崩溃与未知路径白屏

## PWA 与离线

- `public/manifest.webmanifest` 提供 `standalone` 显示模式与 any / maskable 图标
- `public/sw.js` 策略：页面导航**网络优先 + 缓存回退**，静态资源**缓存优先 + 后台更新**，只处理同源 GET 请求
- 开发环境不注册 Service Worker（避免干扰 HMR），验证离线请使用 `npm run build && npm run preview`
- `npm run icons` 内置一个手写的最小 PNG 编码器生成图标，不需要 canvas / sharp 等原生依赖
- Manifest 与 Service Worker 内部一律使用**相对路径**，因此根路径部署与子路径部署（GitHub Pages 的 `/<repo>/`）共用同一份代码，不需要为了换部署位置改路径

## 浏览器支持

需要支持 ES2020+ 与 `BigInt` 的现代浏览器：Chrome / Edge 88+、Firefox 78+、Safari 14+。

## 开发提交记录

项目按真实开发节奏分阶段提交：

```
chore: initialize react project       # 工程骨架与样式体系
feat: implement base conversion engine # 转换引擎 + 转换页
feat: add practice system             # 出题判题 + 错题本 + 存储层
feat: add statistics dashboard        # Recharts 可视化 + 明细表
feat: add PWA support                 # 安装能力 + 离线访问
test: add unit tests                  # 66 项测试 + 可测试性重构
docs: update README                   # 文档与截图
ci: deploy to GitHub Pages            # Actions 自动构建发布 + 子路径适配
```

## 未来优化方向

- **小数与负数支持**：扩展 `parseToDecimal` / `decimalToBase` 支持小数位与符号位
- **更多进制**：把字符集抽象成配置后，扩展到 3 / 5 / 32 / 36 进制成本很低
- **更多题型**：进制加减法、补码与反码、位运算练习
- **训练模式**：限时挑战、按进制专项训练、间隔重复（SRS）复习错题
- **数据导出**：导出错题与统计数据为 JSON / CSV，支持云端同步
- **可达性**：补充键盘导航细节与屏幕阅读器文案，目标 WCAG 2.1 AA
- **性能**：统计页已改为按路由懒加载，首屏不再下载图表库；下一步可以做鼠标悬停导航时预取统计页，消掉首次进入的那一下等待
- **部署**：接入 CI（lint + test + build）后自动发布，免去手动构建再上线
- **工程**：为 CI 增加构建产物体积预算（bundle size budget），超限时让流水线失败

## License

[MIT](./LICENSE)
