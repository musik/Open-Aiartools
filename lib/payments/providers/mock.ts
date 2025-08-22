import { 
  PaymentProvider, 
  PaymentSession, 
  PaymentWebhookEvent, 
  PaymentVerificationResult,
  PaymentCreateSessionParams,
  PaymentPlan 
} from '../types';
import { PAYMENT_PLANS } from '../config';

export class MockPaymentProvider extends PaymentProvider {
  name = 'mock';
  supportedMethods = ['mock_card', 'mock_alipay', 'mock_wechat'];

  isConfigured(): boolean {
    return true; // 模拟支付总是可用的
  }

  getSupportedPlans(): PaymentPlan[] {
    return Object.values(PAYMENT_PLANS);
  }

  async createCheckoutSession(params: PaymentCreateSessionParams): Promise<PaymentSession> {
    const plan = PAYMENT_PLANS[params.planId as keyof typeof PAYMENT_PLANS];
    if (!plan) {
      throw new Error(`未找到支付计划: ${params.planId}`);
    }

    // 生成模拟会话 ID
    const sessionId = `mock_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建模拟支付页面 URL（实际应用中可以是您自己的支付页面）
    const mockPaymentUrl = `${params.successUrl.split('/payment/success')[0]}/payment/mock?session_id=${sessionId}&plan_id=${params.planId}&user_id=${params.userId}&credits=${plan.credits}&amount=${plan.price}&provider=mock`;

    return {
      id: sessionId,
      url: mockPaymentUrl,
      metadata: {
        userId: params.userId,
        planId: params.planId,
        credits: plan.credits.toString(),
        planType: plan.type,
        provider: 'mock',
        amount: plan.price,
      },
    };
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerificationResult> {
    // 模拟支付验证
    if (!sessionId.startsWith('mock_session_')) {
      return {
        success: false,
        sessionId,
        error: '无效的模拟支付会话',
      };
    }

    // 从会话 ID 中提取信息（实际应用中应该从数据库或缓存中获取）
    const mockData = this.extractMockSessionData(sessionId);
    
    return {
      success: true,
      sessionId,
      userId: mockData.userId,
      planId: mockData.planId,
      credits: mockData.credits,
      planType: mockData.planType,
      amount: mockData.amount,
      currency: 'usd',
    };
  }

  async handleWebhook(payload: any, signature?: string): Promise<PaymentWebhookEvent | null> {
    // 模拟 webhook 处理
    return {
      id: `mock_webhook_${Date.now()}`,
      type: 'payment.completed',
      data: payload,
      metadata: payload.metadata || {},
    };
  }

  private extractMockSessionData(sessionId: string) {
    // 这里应该从实际的存储中获取数据
    // 为了演示，我们返回默认值
    return {
      userId: 'mock_user',
      planId: 'pro',
      credits: 800,
      planType: 'subscription',
      amount: 599,
    };
  }
}
