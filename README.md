# Cloudflare R2 Web Explorer

专为 Cloudflare 免费用户打造的桌面级 Web 版 R2 资源管理器。像在本地电脑上操作文件管理器一样，轻松拖拉拽、剪切、复制、粘贴管理 Cloudflare R2 对象存储中的文件。

---

## 🌐 线上服务入口

* **Web 管理控制台（生产环境）**：👉 **[https://r2.505250.xyz](https://r2.505250.xyz)**
* **GitHub 代码仓库**：👉 **[https://github.com/huangti/r2-explorer](https://github.com/huangti/r2-explorer)**
* **存储桶公开直链 CDN**：`https://bucketwna.505250.xyz`
* **本地开发环境**：`http://localhost:5173`（前端）+ `http://localhost:3001`（后端）

---

## 🌟 核心特性与桌面交互

1. **拖拽上传与移动 (Drag & Drop)**：
   * **本地拖拽上传**：从电脑桌面或文件夹中拖拽单文件或批量多文件，直接松开即可上传到当前目录；若悬停在某个子文件夹卡片上，则直接上传至该子文件夹。
   * **内部拖拽移动**：直接拖动列表中的文件或文件夹放入目标子目录中完成对象移动。
2. **复制、剪切与粘贴 (Copy, Cut, Paste)**：
   * 支持标准快捷键：`Ctrl + C`（复制）、`Ctrl + X`（剪切）、`Ctrl + V`（粘贴）。
   * 剪切状态具有半透明视觉反馈。
3. **右键上下文菜单 (Context Menu)**：
   * 在文件/文件夹上右键：打开/预览、复制自定义域公开链接、下载文件、剪切、复制、重命名、删除、属性详情。
   * 在空白区域右键：新建文件夹、上传文件、粘贴、刷新目录。
4. **多选与快捷键操作**：
   * `Ctrl + A`：全选当前目录。
   * `Ctrl + 单击`：多选不连续项。
   * `Shift + 单击`：区间范围多选。
   * `Delete`：删除选中项（附带防误删二次确认弹窗）。
   * `F2`：快速重命名选中项。
   * `Enter`：打开选中文件夹或文件预览。
   * `Esc`：清除选中或关闭弹窗。
5. **多媒体与文档在线预览 (Preview Modal)**：
   * 图片缩放展示、视频播放器、音频播放器、代码/文本高亮阅读、PDF 阅读器。
6. **自定义公开域名直链 (Custom Domain)**：
   * 已接入 `https://bucketwna.505250.xyz`，支持一键复制 CDN 公开访问链接。
7. **免费额度守护机制 (Free Tier Shield)**：
   * **目录内存级缓存**：30 秒内复用目录列表，避免高频请求消耗 Class A（每月 100 万次免费额度）。
   * **单级前缀列举**：严格采用 `delimiter: '/'`，杜绝全桶递归遍历。
   * **会话 API 消耗实时追踪**：导航栏与右上角配额胶囊实时统计本次会话的 Class A / Class B 调用次数与操作流水。

---

## 🚀 常用命令

```bash
# 1. 本地全栈开发测试 (自动拉起本地前后端服务)
npm run dev

# 2. 一键编译并部署到 Cloudflare 全球边缘 (生产上线)
npm run deploy
```

---

## ☁️ Cloudflare 部署架构说明

* **平台**：Cloudflare Workers + Workers Static Assets
* **静态资源托管**：全球边缘 CDN 分发
* **API 架构**：原生 R2 存储桶绑定（`env.BUCKET`），机房内部毫秒级寻址，零外部 S3 流量损耗
* **自定义域绑定**：由 Cloudflare Worker Triggers 原生托管 `r2.505250.xyz` 并自动下发 SSL 证书
