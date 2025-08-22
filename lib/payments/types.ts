// 支付系统类型定义

export interface PaymentPlan {
  id: string;
  name: string;
  price: number; // 以分为单位
  credits: number;
  description: string;
  type: 'subscription' | 'one_time';
}

export interface PaymentSession {
  id: string;
  url: string;
  metadata?: Record<string, any>;
}

export interface PaymentWebhookEvent {
  id: string;
  type: string;
  data: any;
  metadata?: Record<string, any>;
}

export interface PaymentVerificationResult {
  success: boolean;
  sessionId: string;
  userId?: string;
  planId?: string;
  credits?: number;
  planType?: string;
  amount?: number;
  currency?: string;
  error?: string;
}

export interface PaymentCreateSessionParams {
  userId: string;
  userEmail: string;
  planId: string;
  locale?: string;
  successUrl: string;
  cancelUrl: string;
}

// 支付提供商抽象接口
export abstract class PaymentProvider {
  abstract name: string;
  abstract supportedMethods: string[];

  // 创建支付会话
  abstract createCheckoutSession(params: PaymentCreateSessionParams): Promise<PaymentSession>;

  // 验证支付
  abstract verifyPayment(sessionId: string): Promise<PaymentVerificationResult>;

  // 处理 Webhook
  abstract handleWebhook(payload: any, signature?: string): Promise<PaymentWebhookEvent | null>;

  // 获取支持的计划
  abstract getSupportedPlans(): PaymentPlan[];

  // 检查配置是否有效
  abstract isConfigured(): boolean;
}

export type PaymentProviderType = 'stripe' | 'alipay' | 'wechat' | 'paypal' | 'mock';

export interface PaymentConfig {
  defaultProvider: PaymentProviderType;
  enabledProviders: PaymentProviderType[];
  plans: Record<string, PaymentPlan>;
}
