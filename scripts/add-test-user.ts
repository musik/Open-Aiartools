#!/usr/bin/env tsx

import { db } from '../lib/db';
import { users } from '../lib/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

interface TestUserOptions {
  email?: string;
  password?: string;
  username?: string;
  credits?: number;
  subscriptionCredits?: number;
  subscriptionStatus?: 'none' | 'active' | 'cancelled' | 'expired';
  subscriptionPlan?: string;
  isEmailVerified?: boolean;
}

async function addTestUser(options: TestUserOptions = {}) {
  const {
    email = 'test@example.com',
    password = 'test123456',
    username = 'testuser',
    credits = 100,
    subscriptionCredits = 800,
    subscriptionStatus = 'active',
    subscriptionPlan = 'pro',
    isEmailVerified = true
  } = options;

  try {
    console.log('🔍 检查用户是否已存在...');
    
    // 检查用户是否已存在
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      console.log(`❌ 用户 ${email} 已存在 (ID: ${existingUser.id})`);
      console.log('📊 现有用户信息:');
      console.log(`   - 用户名: ${existingUser.username}`);
      console.log(`   - 积分: ${existingUser.credits}`);
      console.log(`   - 订阅积分: ${existingUser.subscriptionCredits}`);
      console.log(`   - 订阅状态: ${existingUser.subscriptionStatus}`);
      console.log(`   - 邮箱验证: ${existingUser.isEmailVerified ? '✅' : '❌'}`);
      return;
    }

    console.log('🔐 加密密码...');
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('👤 创建测试用户...');
    
    // 创建订阅结束时间（一个月后）
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

    const newUser = await db.insert(users).values({
      email,
      password: hashedPassword,
      username,
      credits,
      subscriptionCredits,
      subscriptionStatus,
      subscriptionPlan,
      subscriptionStartDate: new Date(),
      subscriptionEndDate: subscriptionStatus === 'active' ? subscriptionEndDate : null,
      isEmailVerified,
      emailVerified: isEmailVerified ? new Date() : null,
    }).returning();

    console.log('✅ 测试用户创建成功!');
    console.log('📊 用户信息:');
    console.log(`   - ID: ${newUser[0].id}`);
    console.log(`   - 邮箱: ${newUser[0].email}`);
    console.log(`   - 用户名: ${newUser[0].username}`);
    console.log(`   - 密码: ${password}`);
    console.log(`   - 积分: ${newUser[0].credits}`);
    console.log(`   - 订阅积分: ${newUser[0].subscriptionCredits}`);
    console.log(`   - 订阅状态: ${newUser[0].subscriptionStatus}`);
    console.log(`   - 订阅计划: ${newUser[0].subscriptionPlan}`);
    console.log(`   - 邮箱验证: ${newUser[0].isEmailVerified ? '✅' : '❌'}`);
    
    if (subscriptionStatus === 'active') {
      console.log(`   - 订阅到期: ${subscriptionEndDate.toLocaleDateString()}`);
    }

    console.log('');
    console.log('🎯 使用方法:');
    console.log('   1. 在登录页面使用上述邮箱和密码登录');
    console.log('   2. 或者直接访问 /dashboard 查看用户状态');
    
  } catch (error: any) {
    console.error('❌ 创建用户失败:', error.message);
    process.exit(1);
  }
}

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options: TestUserOptions = {};

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--email':
        options.email = value;
        break;
      case '--password':
        options.password = value;
        break;
      case '--username':
        options.username = value;
        break;
      case '--credits':
        options.credits = parseInt(value);
        break;
      case '--subscription-credits':
        options.subscriptionCredits = parseInt(value);
        break;
      case '--subscription-status':
        options.subscriptionStatus = value as any;
        break;
      case '--subscription-plan':
        options.subscriptionPlan = value;
        break;
      case '--verified':
        options.isEmailVerified = value === 'true';
        break;
      case '--help':
        showHelp();
        process.exit(0);
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
🧪 测试用户创建工具

用法:
  npm run add-test-user [选项]

选项:
  --email <email>              邮箱地址 (默认: test@example.com)
  --password <password>        密码 (默认: test123456)
  --username <username>        用户名 (默认: testuser)
  --credits <number>           普通积分 (默认: 100)
  --subscription-credits <num> 订阅积分 (默认: 800)
  --subscription-status <stat> 订阅状态: none|active|cancelled|expired (默认: active)
  --subscription-plan <plan>   订阅计划 (默认: pro)
  --verified <true|false>      邮箱是否验证 (默认: true)
  --help                       显示帮助信息

示例:
  # 创建默认测试用户
  npm run add-test-user

  # 创建自定义用户
  npm run add-test-user --email user@test.com --password mypass --credits 500

  # 创建无订阅用户
  npm run add-test-user --email free@test.com --subscription-status none --subscription-credits 0
`);
}

// 主执行函数
async function main() {
  if (process.argv.includes('--help')) {
    showHelp();
    return;
  }

  console.log('🚀 启动测试用户创建工具...');
  console.log('');

  const options = parseArgs();
  await addTestUser(options);
  
  console.log('');
  console.log('✨ 任务完成!');
  process.exit(0);
}

// 执行脚本
main().catch((error) => {
  console.error('💥 脚本执行失败:', error);
  process.exit(1);
});
