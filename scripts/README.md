# 数据管理脚本

本目录包含用于管理数据库数据的实用脚本。

## 🧪 添加测试用户

### 基本用法

```bash
# 创建默认测试用户
npm run add-test-user

# 显示帮助信息
npm run add-test-user -- --help
```

### 自定义选项

```bash
# 创建自定义用户
npm run add-test-user -- --email user@test.com --password mypass --credits 500

# 创建无订阅用户
npm run add-test-user -- --email free@test.com --subscription-status none --subscription-credits 0

# 创建未验证邮箱的用户
npm run add-test-user -- --email unverified@test.com --verified false
```

### 可用选项

| 选项 | 描述 | 默认值 |
|------|------|--------|
| `--email` | 邮箱地址 | `test@example.com` |
| `--password` | 密码 | `test123456` |
| `--username` | 用户名 | `testuser` |
| `--credits` | 普通积分 | `100` |
| `--subscription-credits` | 订阅积分 | `800` |
| `--subscription-status` | 订阅状态 (`none`/`active`/`cancelled`/`expired`) | `active` |
| `--subscription-plan` | 订阅计划 | `pro` |
| `--verified` | 邮箱是否验证 (`true`/`false`) | `true` |

### 默认测试用户信息

创建的默认测试用户具有以下特征：
- ✅ 邮箱已验证
- 🎯 拥有 Pro 订阅（活跃状态）
- 💰 800 订阅积分 + 100 普通积分
- 📅 订阅有效期一个月
- 🔑 可直接登录使用

### 注意事项

- 如果邮箱已存在，脚本会显示现有用户信息而不会重复创建
- 密码会自动加密存储
- 活跃订阅会自动设置到期时间（一个月后）
- 脚本会显示详细的创建结果和使用说明

## 🔧 添加新脚本

要添加新的数据管理脚本：

1. 在 `scripts/` 目录创建新的 `.ts` 文件
2. 在 `package.json` 的 `scripts` 部分添加对应的命令
3. 更新此 README 文档

### 脚本模板

```typescript
#!/usr/bin/env tsx

import { db } from '../lib/db';
import { users } from '../lib/schema';

async function yourTask() {
  try {
    console.log('🚀 执行任务...');
    
    // 你的逻辑
    
    console.log('✅ 任务完成!');
  } catch (error: any) {
    console.error('❌ 任务失败:', error.message);
    process.exit(1);
  }
}

yourTask();
```
