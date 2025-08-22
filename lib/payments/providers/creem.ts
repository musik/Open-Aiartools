import { Creem } from 'creem';
import { 
  PaymentProvider, 
  PaymentSession, 
  PaymentWebhookEvent, 
  PaymentVerificationResult,
  PaymentCreateSessionParams,
  PaymentPlan 
} from '../types';
import { PAYMENT_PLANS } from '../config';

export class CreemPaymentProvider extends PaymentProvider {
  name = 'creem';
  supportedMethods = ['card', 'bank_transfer', 'digital_wallet'];
  private creem: Creem | null = null;

  constructor() {
    super();
    if (this.isConfigured()) {
      this.creem = new Creem({
        // 根据环境选择服务器
        serverIdx: process.env.NODE_ENV === 'production' ? 0 : 1, // 0: production, 1: test-mode
      });
    }
  }

  isConfigured(): boolean {
    // 检查基本的 API Key
    if (!process.env.CREEM_API_KEY) {
      return false;
    }
    
    // 检查是否至少配置了一个产品 ID
    const hasAnyProductId = Object.keys(PAYMENT_PLANS).some(planId => {
      const envKey = `CREEM_PRODUCT_ID_${planId.toUpperCase()}`;
      return !!process.env[envKey];
    });
    
    return hasAnyProductId;
  }

  getSupportedPlans(): PaymentPlan[] {
    return Object.values(PAYMENT_PLANS);
  }

  async createCheckoutSession(params: PaymentCreateSessionParams): Promise<PaymentSession> {
    if (!this.creem) {
      throw new Error('Creem 未配置');
    }

    const plan = PAYMENT_PLANS[params.planId as keyof typeof PAYMENT_PLANS];
    if (!plan) {
      throw new Error(`未找到支付计划: ${params.planId}`);
    }

    // 获取预设的 Creem Product ID
    const creemProductId = this.getCreemProductId(params.planId);
    if (!creemProductId) {
      throw new Error(`未找到 Creem Product ID for plan: ${params.planId}。请在 Creem 控制台创建产品并配置环境变量。`);
    }

    try {
      // 生成唯一的 request_id 用于跟踪
      const requestId = `${params.userId}_${params.planId}_${Date.now()}`;

      // 创建 Checkout 会话  
      const checkout = await this.creem.createCheckout({
        xApiKey: process.env.CREEM_API_KEY!,
        createCheckoutRequest: {
          productId: creemProductId,
          successUrl: params.successUrl, // Creem 会自动添加参数，不需要我们手动添加
          requestId: requestId, // 用于跟踪支付
          metadata: {
            userId: params.userId,
            planId: params.planId,
            credits: plan.credits.toString(),
            planType: plan.type,
            provider: 'creem',
            requestId: requestId,
          },
        }
      });

      return {
        id: checkout.id,
        url: checkout.checkoutUrl || (checkout as any).url,
        metadata: {
          userId: params.userId,
          planId: params.planId,
          credits: plan.credits.toString(),
          planType: plan.type,
          provider: 'creem',
          requestId: requestId,
          productId: creemProductId,
        },
      };
    } catch (error: any) {
      console.error('Creem checkout creation failed:', error);
      throw new Error(`创建 Creem 支付会话失败: ${error.message}`);
    }
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerificationResult> {
    if (!this.creem) {
      throw new Error('Creem 未配置');
    }

    try {
      // 获取 checkout 信息
      const checkout = await this.creem.retrieveCheckout({
        xApiKey: process.env.CREEM_API_KEY!,
        checkoutId: sessionId,
      });

      // 检查支付状态
      if (checkout.status !== 'completed') {
        return {
          success: false,
          sessionId,
          error: '支付未完成',
        };
      }

      // 从 metadata 或 requestId 中获取用户信息
      let metadata: any = {};
      if (checkout.metadata && typeof checkout.metadata === 'object') {
        metadata = checkout.metadata;
      } else if (checkout.metadata && typeof checkout.metadata === 'string') {
        try {
          metadata = JSON.parse(checkout.metadata);
        } catch {
          metadata = {};
        }
      }
      const requestId = checkout.requestId || metadata.requestId;
      
      // 如果有 request_id，解析用户信息
      let userId = metadata.userId;
      let planId = metadata.planId;
      
      if (requestId && !userId) {
        // 从 request_id 解析用户信息 (format: userId_planId_timestamp)
        const parts = requestId.split('_');
        if (parts.length >= 2) {
          userId = parts[0];
          planId = parts[1];
        }
      }

      // 根据 planId 获取积分信息
      let credits = metadata.credits ? parseInt(metadata.credits) : undefined;
      let planType = metadata.planType;
      
      if (planId && !credits) {
        const plan = PAYMENT_PLANS[planId as keyof typeof PAYMENT_PLANS];
        if (plan) {
          credits = plan.credits;
          planType = plan.type;
        }
      }

      return {
        success: true,
        sessionId: checkout.id,
        userId: userId,
        planId: planId,
        credits: credits,
        planType: planType,
        amount: (checkout as any).amount ? (checkout as any).amount / 100 : undefined,
        currency: (checkout as any).currency || 'USD',
      };
    } catch (error: any) {
      console.error('Creem payment verification failed:', error);
      return {
        success: false,
        sessionId,
        error: error.message || '验证支付失败',
      };
    }
  }

  async handleWebhook(payload: any, signature?: string): Promise<PaymentWebhookEvent | null> {
    // Creem webhook 处理
    // 注意：Creem 的 webhook 验证机制可能与 Stripe 不同，需要根据实际文档调整
    
    try {
      // 这里应该根据 Creem 的实际 webhook 验证方式来实现
      // 由于文档中没有详细的 webhook 验证信息，这里提供一个基础实现
      
      if (!payload || typeof payload !== 'object') {
        throw new Error('Invalid webhook payload');
      }

      // 基础的 webhook 事件处理
      return {
        id: payload.id || `creem_webhook_${Date.now()}`,
        type: payload.event_type || payload.type || 'checkout.completed',
        data: payload.data || payload,
        metadata: payload.metadata || {},
      };
    } catch (error: any) {
      console.error('Creem webhook handling failed:', error);
      return null;
    }
  }

  // 获取预设的 Creem Product ID
  private getCreemProductId(planId: string): string | null {
    // 从环境变量中获取对应计划的 Creem Product ID
    const envKey = `CREEM_PRODUCT_ID_${planId.toUpperCase()}`;
    return process.env[envKey] || null;
  }

  // 辅助方法：获取或创建客户
  private async getOrCreateCustomer(email: string, userId: string) {
    if (!this.creem) {
      throw new Error('Creem 未配置');
    }

    try {
      // 尝试通过 email 查找现有客户
      // 注意：这里需要根据 Creem 实际的客户查询 API 来实现
      // 由于文档中没有详细的客户查询方法，这里使用一个简化的实现
      
      // 生成客户链接或使用现有客户
      const customer = await this.creem.generateCustomerLinks({
        xApiKey: process.env.CREEM_API_KEY!,
        createCustomerPortalLinkRequestEntity: {
          customerId: userId, // 使用我们的用户 ID 作为客户 ID
        }
      });

      return {
        id: userId,
        email: email,
      };
    } catch (error: any) {
      console.error('Failed to get or create Creem customer:', error);
      throw new Error(`客户创建失败: ${error.message}`);
    }
  }



  // 取消订阅
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.creem) {
      throw new Error('Creem 未配置');
    }

    try {
      await this.creem.cancelSubscription({
        xApiKey: process.env.CREEM_API_KEY!,
        id: subscriptionId,
      });
      return true;
    } catch (error: any) {
      console.error('Failed to cancel Creem subscription:', error);
      return false;
    }
  }

  // 升级订阅
  async upgradeSubscription(subscriptionId: string, newPlanId: string): Promise<boolean> {
    if (!this.creem) {
      throw new Error('Creem 未配置');
    }

    const newPlan = PAYMENT_PLANS[newPlanId as keyof typeof PAYMENT_PLANS];
    if (!newPlan) {
      throw new Error(`未找到支付计划: ${newPlanId}`);
    }

    try {
      const newCreemProductId = this.getCreemProductId(newPlanId);
      if (!newCreemProductId) {
        throw new Error(`未找到新计划的 Creem Product ID: ${newPlanId}`);
      }

      await this.creem.upgradeSubscription({
        xApiKey: process.env.CREEM_API_KEY!,
        id: subscriptionId,
        upgradeSubscriptionRequestEntity: {
          productId: newCreemProductId,
        }
      });
      return true;
    } catch (error: any) {
      console.error('Failed to upgrade Creem subscription:', error);
      return false;
    }
  }
}
