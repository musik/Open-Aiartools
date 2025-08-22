import { PaymentFactory } from './factory';
import { PaymentCreateSessionParams, PaymentVerificationResult, PaymentWebhookEvent, PaymentProviderType } from './types';
import { getPaymentPlan } from './config';

export class PaymentService {
  /**
   * 创建支付会话
   */
  static async createCheckoutSession(
    params: PaymentCreateSessionParams,
    providerType?: PaymentProviderType
  ) {
    const provider = PaymentFactory.getProvider(providerType);
    
    // 验证计划是否存在
    const plan = getPaymentPlan(params.planId);
    if (!plan) {
      throw new Error(`未找到支付计划: ${params.planId}`);
    }

    console.log(`使用 ${provider.name} 创建支付会话，计划: ${params.planId}`);
    
    return await provider.createCheckoutSession(params);
  }

  /**
   * 验证支付
   */
  static async verifyPayment(
    sessionId: string,
    providerType?: PaymentProviderType
  ): Promise<PaymentVerificationResult> {
    const provider = PaymentFactory.getProvider(providerType);
    
    console.log(`使用 ${provider.name} 验证支付会话: ${sessionId}`);
    
    return await provider.verifyPayment(sessionId);
  }

  /**
   * 处理 Webhook
   */
  static async handleWebhook(
    payload: any,
    signature?: string,
    providerType?: PaymentProviderType
  ): Promise<PaymentWebhookEvent | null> {
    const provider = PaymentFactory.getProvider(providerType);
    
    console.log(`使用 ${provider.name} 处理 webhook`);
    
    return await provider.handleWebhook(payload, signature);
  }

  /**
   * 获取支持的支付计划
   */
  static getSupportedPlans(providerType?: PaymentProviderType) {
    const provider = PaymentFactory.getProvider(providerType);
    return provider.getSupportedPlans();
  }

  /**
   * 获取支持的支付方式
   */
  static getSupportedMethods(providerType?: PaymentProviderType) {
    const provider = PaymentFactory.getProvider(providerType);
    return provider.supportedMethods;
  }

  /**
   * 获取可用的支付提供商
   */
  static getAvailableProviders() {
    return PaymentFactory.getAvailableProviders().map(type => {
      const provider = PaymentFactory.getProvider(type);
      return {
        type,
        name: provider.name,
        supportedMethods: provider.supportedMethods,
        isConfigured: provider.isConfigured(),
      };
    });
  }

  /**
   * 检查特定提供商是否可用
   */
  static isProviderAvailable(providerType: PaymentProviderType) {
    return PaymentFactory.isProviderAvailable(providerType);
  }
}
