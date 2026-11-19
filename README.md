# SakuraMikku · 代码与浪漫

基于 **Vite + TypeScript + 原生 CSS** 的完整静态个人博客主页。无后端、无数据库、无路由服务依赖，不包含文章管理或虚构文章列表。

## 功能

- 中文响应式主页：个人介绍、技术栈、联系入口、基础页脚。
- 四种主题：极简 / 浅色 / 深色 / 蓝粉（MTF 蓝、粉、白）。默认蓝粉。
- 使用 localStorage 记忆主题，页面绘制前恢复；跨标签同步；禁用存储时仍可切换。
- 四种独立原生 SVG 鼠标：黑白箭头、蓝色箭头、星光十字、蓝粉星形。
- 主题跟随效果：极简细点、浅色光点、深色星光、蓝粉花瓣；移出窗口时停止动画，粒子数量受限。
- 触摸设备关闭鼠标效果；尊重 prefers-reduced-motion，支持键盘焦点和跳转主内容。
- GitHub / B站等所有外部链接都使用 target="_blank" 和 rel="noopener noreferrer"；页内锚点留在当前页面。
- GitHub Actions 构建、浏览器测试并部署到 GitHub Pages。

## 本地开发

推荐 Node.js **22.12+**（CI 使用 22）及 npm。

```sh
npm ci
npm run dev
```

访问终端显示的本地地址。生产构建与预览：

```sh
npm run build
npm run preview
```

输出目录为 `dist/`。静态资源使用相对路径，兼容 `https://用户名.github.io/` 和 `https://用户名.github.io/仓库名/`，无需写死仓库名。

## GitHub Pages 部署

1. 在 GitHub 新建仓库，将本项目推送至 `main` 分支，**包含 package-lock.json**。
2. 打开仓库 **Settings → Pages → Build and deployment → Source**，选择 **GitHub Actions**。
3. 确认仓库 **Actions** 功能已启用。推送 `main`，或在 Actions 中手动运行 **Deploy to GitHub Pages**。
4. 等待 build / deploy 完成，在部署环境或 Pages 设置中查看地址。

工作流位于 `.github/workflows/deploy.yml`。PR 只构建和测试，不部署。部署使用官方 Pages artifact 和 OIDC，不需要个人访问令牌。若默认分支不是 `main`，请修改工作流分支设置。

> 当前目录生成时没有 Git 仓库，未替你初始化、提交、创建远程仓库或发布网站。启用 Pages 与首次推送需要你在自己的 GitHub 仓库操作。

如需自定义域名，在 `public/CNAME` 写入域名，并在 GitHub Pages 与 DNS 中配置；本项目不预设域名。

## 修改内容

| 文件 | 用途 |
| --- | --- |
| `index.html` | 页面内容、介绍、技术栈、外部地址、SEO 和初始主题恢复 |
| `src/style.css` | 四主题变量、响应式布局和装饰插画 |
| `src/main.ts` | 主题持久化、SVG 鼠标、Canvas 跟随效果与导航状态 |
| `public/avatar.jpg` | 从 GitHub 用户 wuxintlh 下载的原始头像 |
| `public/avatar-circle.png` | 透明底圆形头像，用于页头、页脚和站点图标；更新原图后运行 `node scripts/create-icon.mjs` 重新生成（需已安装 Playwright Chromium） |
| `vite.config.ts` | Vite 构建配置 |
| `.github/workflows/deploy.yml` | GitHub Pages 持续集成和部署 |

页脚版权作者：**SakuraMikku**，年份自动更新。

- GitHub：https://github.com/wuxintlh
- B站：https://space.bilibili.com/29058270

字体使用本机已安装的 Space Grotesk / Noto Sans SC，并回退到系统无衬线字体；不请求任何外部字体服务，页面不依赖第三方网络资源。主视觉为纯 CSS，无外部图片依赖。个人技术栈按前端开发、后端开发、游戏开发、数据库、消息队列、云运维、机器人开发、Agent 开发八类展示，可在 `index.html` 中修改分类与标签。个人技术栈展示不表示本站引入了这些运行时依赖；本站依然为 Vite + TypeScript 静态项目。

## 自动化验证

```sh
npx playwright install chromium
npm run build
npm test
```

测试自动启动并关闭生产预览服务器（端口 4173），覆盖桌面和手机：页面结构、外链安全属性、主题切换及刷新记忆、存储异常、响应式溢出、导航、鼠标与减少动态效果。测试截图和失败痕迹位于 `test-results/`，不应提交。首次在 Linux 安装浏览器可执行 `npx playwright install --with-deps chromium`。
