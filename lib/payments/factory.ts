import { PaymentProvider, PaymentProviderType } from './types';
import { StripePaymentProvider } from './providers/stripe';
import { MockPaymentProvider } from './providers/mock';
import { getActivePaymentProvider, isPaymentProviderEnabled } from './config';

// 支付提供商注册表
const PAYMENT_PROVIDERS: Record<PaymentProviderType, () => PaymentProvider> = {
  stripe: () => new StripePaymentProvider(),
  mock: () => new MockPaymentProvider(),
  // 未来可以添加更多支付提供商
  alipay: () => {
    throw new Error('支付宝支付提供商尚未实现');
  },
  wechat: () => {
    throw new Error('微信支付提供商尚未实现');
  },
  paypal: () => {
    throw new Error('PayPal 支付提供商尚未实现');
  },
};

export class PaymentFactory {
  private static providers: Map<PaymentProviderType, PaymentProvider> = new Map();

  /**
   * 获取支付提供商实例
   */
  static getProvider(type?: PaymentProviderType): PaymentProvider {
    const providerType = type || getActivePaymentProvider();
    
    if (!isPaymentProviderEnabled(providerType)) {
      throw new Error(`支付提供商 ${providerType} 未启用`);
    }

    // 检查缓存
    if (this.providers.has(providerType)) {
      return this.providers.get(providerType)!;
    }

    // 创建新实例
    const createProvider = PAYMENT_PROVIDERS[providerType];
    if (!createProvider) {
      throw new Error(`不支持的支付提供商: ${providerType}`);
    }

    const provider = createProvider();
    
    // 检查配置
    if (!provider.isConfigured()) {
      console.warn(`支付提供商 ${providerType} 配置不完整，回退到模拟支付`);
      return this.getProvider('mock');
    }

    // 缓存实例
    this.providers.set(providerType, provider);
    return provider;
  }

  /**
   * 获取默认支付提供商
   */
  static getDefaultProvider(): PaymentProvider {
    return this.getProvider();
  }

  /**
   * 获取所有可用的支付提供商
   */
  static getAvailableProviders(): PaymentProviderType[] {
    return Object.keys(PAYMENT_PROVIDERS).filter(type => 
      isPaymentProviderEnabled(type as PaymentProviderType)
    ) as PaymentProviderType[];
  }

  /**
   * 检查支付提供商是否可用
   */
  static isProviderAvailable(type: PaymentProviderType): boolean {
    try {
      const provider = this.getProvider(type);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  /**
   * 清除缓存（用于测试或重新配置）
   */
  static clearCache(): void {
    this.providers.clear();
  }
}
