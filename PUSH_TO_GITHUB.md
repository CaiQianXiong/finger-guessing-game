# 推送到 GitHub 指南

## 方法一：使用命令行（推荐）

### 1. 在 GitHub 上创建新仓库
- 访问 https://github.com/new
- 输入仓库名称（例如：`ai-finger-guessing`）
- **不要**勾选"Initialize this repository with a README"
- 点击"Create repository"

### 2. 添加远程仓库并推送

```bash
# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/仓库名.git

# 或者使用SSH（如果你配置了SSH密钥）
git remote add origin git@github.com:你的用户名/仓库名.git

# 推送代码
git branch -M main
git push -u origin main
```

## 方法二：使用 GitHub CLI（如果已安装）

```bash
# 创建仓库并推送
gh repo create ai-finger-guessing --public --source=. --remote=origin --push
```

## 如果遇到问题

### 认证问题
如果推送时要求输入用户名密码：
1. 使用 Personal Access Token 代替密码
2. 或者配置 SSH 密钥

### 分支名称
如果默认分支是 `master` 而不是 `main`：
```bash
git branch -M main
```

### 强制推送（不推荐，除非确定）
```bash
git push -u origin main --force
```

