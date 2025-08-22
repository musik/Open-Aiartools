import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

// 智能加载环境变量：本地优先使用 .env.local，远程使用系统环境变量
if (process.env.NODE_ENV !== 'production') {
  // 开发环境：尝试加载 .env.local，如果不存在则回退到 .env
  config({ path: '.env.local' });
  config({ path: '.env' });
} else {
  // 生产环境：只加载 .env（如果存在）
  config();
}

export default {
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config; 