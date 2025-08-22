import { PaymentConfig, PaymentProviderType } from './types';
import { CREDIT_CONFIG } from '@/lib/constants';

// 支付计划配置
export const PAYMENT_PLANS = {
  pro: {
    id: 'pro',
    name: 'Pro Plan',
    price: 599, // $5.99 in cents
    credits: CREDIT_CONFIG.SUBSCRIPTION.PRO_MONTHLY_CREDITS,
    description: `专业版方案 - 每月${CREDIT_CONFIG.SUBSCRIPTION.PRO_MONTHLY_CREDITS}积分`,
    type: 'subscription' as const,
  },
  credits_100: {
    id: 'credits_100',
    name: '100 积分包',
    price: 99, // $0.99 in cents
    credits: 100,
    description: '一次性购买 100 积分',
    type: 'one_time' as const,
  },
  credits_500: {
    id: 'credits_500',
    name: '500 积分包',
    price: 399, // $3.99 in cents
    credits: 500,
    description: '一次性购买 500 积分',
    type: 'one_time' as const,
  },
};

// 支付配置
export const PAYMENT_CONFIG: PaymentConfig = {
  defaultProvider: (process.env.DEFAULT_PAYMENT_PROVIDER as PaymentProviderType) || 'mock',
  enabledProviders: [
    ...(process.env.ENABLED_PAYMENT_PROVIDERS?.split(',') as PaymentProviderType[]) || ['mock'],
  ],
  plans: PAYMENT_PLANS,
};

// 获取当前激活的支付提供商
export function getActivePaymentProvider(): PaymentProviderType {
  const defaultProvider = PAYMENT_CONFIG.defaultProvider;
  
  // 检查默认提供商是否在启用列表中
  if (PAYMENT_CONFIG.enabledProviders.includes(defaultProvider)) {
    return defaultProvider;
  }
  
  // 如果默认提供商未启用，返回第一个启用的提供商
  return PAYMENT_CONFIG.enabledProviders[0] || 'mock';
}

// 检查支付提供商是否已启用
export function isPaymentProviderEnabled(provider: PaymentProviderType): boolean {
  return PAYMENT_CONFIG.enabledProviders.includes(provider);
}

// 获取支付计划
export function getPaymentPlan(planId: string) {
  return PAYMENT_CONFIG.plans[planId];
}

// 获取所有支付计划
export function getAllPaymentPlans() {
  return Object.values(PAYMENT_CONFIG.plans);
}
