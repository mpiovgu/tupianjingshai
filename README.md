# 图片竞筛 — 竞品主图智能筛选

从 Amazon BSR 竞品主图中，自动识别与自有商品属于**同一产品类型**的对标竞品，过滤 liner、配件等非对标品类。

## 功能

- 上传 1 张自有商品主图（参考图）
- 上传任意多张竞品主图（如 BSR 前 10～50）
- 调用 Qwen2.5-VL-3B 视觉模型逐张对比
- 展示匹配 / 排除结果及判断理由
- 支持取消分析与单张重试

## 技术栈

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Qwen2.5-VL-3B（OpenAI 兼容 API）

## 快速开始

```bash
npm install
npm run dev
```

浏览器访问 `http://localhost:5173`。

## 环境变量

复制 `.env.example` 为 `.env` 并按需修改：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | API 基础地址 | `http://49.232.90.152:9896/v1` |
| `VITE_MODEL_NAME` | 模型名称（需与 `/v1/models` 一致） | `Qwen3-VL-4B` |
| `VITE_API_KEY` | API 密钥（如需要） | 空 |

## 构建与部署

```bash
npm run build
```

将 `dist/` 目录部署到任意静态托管服务（Nginx、OSS、Vercel 等）。

**注意：** 前端直连 API 需确保服务端已配置 CORS。若遇跨域问题，需在 API 服务端添加允许来源的响应头。

## 使用说明

1. 上传「我的商品主图」
2. 上传多张「竞品主图」（可来自 BSR 排行榜截图）
3. 点击「开始筛选」，等待逐张分析完成
4. 在「匹配竞品」Tab 查看可对标竞品；「已排除」Tab 查看被过滤的非对标商品

## 示例场景

商品为 slow cooker（慢炖锅）时，BSR 前 50 可能包含：

- **匹配**：其他品牌的 slow cooker
- **排除**：liner（内胆）、pressure cooker（压力锅）、单独售卖的盖子或配件
