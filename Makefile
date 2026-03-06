# ============================================================
# indie-launch-kit Makefile
# Usage: make <command>
# ============================================================

.PHONY: help setup install dev build preview clean clean-all fmt fmt-check

.DEFAULT_GOAL := help

NPM_REGISTRY := https://registry.npmjs.org/

# 颜色定义
GREEN  := \033[0;32m
YELLOW := \033[0;33m
CYAN   := \033[0;36m
NC     := \033[0m

##@ 帮助信息

help: ## 显示此帮助信息
	@echo "$(CYAN)indie-launch-kit$(NC) - 独立开发者 App 推广落地页模板"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "$(YELLOW)用法:$(NC)\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-12s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(CYAN)快速开始:$(NC)"
	@echo "  1. make setup         # 安装依赖"
	@echo "  2. 编辑 app.config.yaml"
	@echo "  3. 放图片到 public/images/"
	@echo "  4. make dev           # 本地预览"
	@echo ""
	@echo "$(CYAN)配置文件:$(NC) app.config.yaml"
	@echo "$(CYAN)构建产物:$(NC) dist/"
	@echo ""

##@ 开发流程

install: ## 安装依赖（首次使用必须先跑这个）
	@echo "$(GREEN)📦 正在安装依赖...$(NC)"
	@npm install --registry $(NPM_REGISTRY)
	@echo ""
	@echo "$(GREEN)✅ 安装完成！$(NC) 运行 $(CYAN)make dev$(NC) 启动开发服务器"

setup: install ## install 的别名

dev: ## 启动开发服务器（http://localhost:4321）
	@echo "$(GREEN)🚀 启动开发服务器...$(NC)"
	@echo "  $(CYAN)http://localhost:4321/zh/$(NC)  中文版"
	@echo "  $(CYAN)http://localhost:4321/en/$(NC)  英文版"
	@echo ""
	@echo "  按 $(YELLOW)Ctrl+C$(NC) 停止"
	@echo ""
	@npm run dev

run: dev ## 启动开发服务器（http://localhost:4321）

fmt: ## 格式化所有代码（Prettier）
	@echo "$(GREEN)✨ 格式化代码...$(NC)"
	@npm run format
	@echo "$(GREEN)✅ 格式化完成$(NC)"

fmt-check: ## 检查代码格式（不修改文件，CI 用）
	@echo "$(CYAN)🔍 检查代码格式...$(NC)"
	@npm run format:check

##@ 构建与部署

build: ## 构建静态文件到 dist/ 目录
	@echo "$(GREEN)🔨 开始构建...$(NC)"
	@npm run build
	@echo ""
	@echo "$(GREEN)✅ 构建完成！$(NC) 产物在 $(CYAN)dist/$(NC) 目录"
	@echo "   将 dist/ 中的文件上传到静态托管服务即可"

preview: build ## 预览构建后的效果
	@echo "$(GREEN)👀 预览构建结果...$(NC)"
	@echo "  $(CYAN)http://localhost:4321/zh/$(NC)"
	@echo ""
	@npm run preview

##@ 清理

clean: ## 清理构建缓存（dist/ 和 .astro/）
	@echo "$(YELLOW)🧹 清理构建缓存...$(NC)"
	-@rm -rf dist .astro 2>/dev/null || (rd /s /q dist 2>nul & rd /s /q .astro 2>nul & exit 0)
	@echo "$(GREEN)✅ 清理完成$(NC)"

clean-all: clean ## 深度清理（包含 node_modules，需重新 make setup）
	@echo "$(YELLOW)🧹 深度清理（含 node_modules）...$(NC)"
	-@rm -rf node_modules 2>/dev/null || (rd /s /q node_modules 2>nul & exit 0)
	@echo "$(GREEN)✅ 深度清理完成$(NC)"
	@echo "   重新运行 $(CYAN)make setup$(NC) 安装依赖"
