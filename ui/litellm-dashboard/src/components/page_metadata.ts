/**
 * Page metadata for UI Settings configuration
 * This file contains descriptions and metadata for all navigation pages
 */

// Page descriptions for UI Settings configuration
export const pageDescriptions: Record<string, string> = {
  "api-keys": "管理用于 API 访问和认证的虚拟密钥",
  models: "配置和管理 LLM 模型及端点",
  new_usage: "查看用量分析和指标",
  logs: "查看请求和响应日志",
  users: "管理内部用户账号和权限",
  teams: "创建和管理访问控制团队",
  projects: "管理团队内的项目",
  caching: "配置响应缓存和协调 Redis 设置",
  "router-settings": "配置路由和负载均衡设置",
  "admin-panel": "访问管理面板和设置",
};

export interface PageMetadata {
  page: string;
  label: string;
  group: string;
  description: string;
}
