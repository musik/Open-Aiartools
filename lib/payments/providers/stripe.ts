import Stripe from 'stripe';
import { 
  PaymentProvider, 
  PaymentSession, 
  PaymentWebhookEvent, 
  PaymentVerificationResult,
  PaymentCreateSessionParams,
  PaymentPlan 
} from '../types';
import { PAYMENT_PLANS } from '../config';

export class StripePaymentProvider extends PaymentProvider {
  name = 'stripe';
  supportedMethods = ['card'];
  private stripe: Stripe | null = null;

  constructor() {
    super();
    if (this.isConfigured()) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
        apiVersion: '2025-05-28.basil',
        typescript: true,
      });
    }
  }

  isConfigured(): boolean {
    return !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);
  }

  getSupportedPlans(): PaymentPlan[] {
    return Object.values(PAYMENT_PLANS);
  }

  async createCheckoutSession(params: PaymentCreateSessionParams): Promise<PaymentSession> {
    if (!this.stripe) {
      throw new Error('Stripe 未配置');
    }

    const plan = PAYMENT_PLANS[params.planId as keyof typeof PAYMENT_PLANS];
    if (!plan) {
      throw new Error(`未找到支付计划: ${params.planId}`);
    }

    // 如果没有配置实际的价格 ID，创建测试支付会话
    const stripeePriceId = process.env.STRIPE_PRICE_ID;
    if (!stripeePriceId || stripeePriceId === 'price_test_demo') {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: plan.name,
                description: plan.description,
              },
              unit_amount: plan.price,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.userEmail,
        metadata: {
          userId: params.userId,
          planId: params.planId,
          credits: plan.credits.toString(),
          planType: 'test_payment',
          provider: 'stripe',
        },
        locale: params.locale === 'zh' ? 'zh' : 'en',
      });

      return {
        id: session.id,
        url: session.url!,
        metadata: session.metadata || {},
      };
    }

    // 创建正式的订阅会话
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripeePriceId,
          quantity: 1,
        },
      ],
      mode: plan.type === 'subscription' ? 'subscription' : 'payment',
      success_url: `${params.successUrl}?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl,
      customer_email: params.userEmail,
      metadata: {
        userId: params.userId,
        planId: params.planId,
        credits: plan.credits.toString(),
        planType: plan.type,
        provider: 'stripe',
      },
      locale: params.locale === 'zh' ? 'zh' : 'en',
    });

    return {
      id: session.id,
      url: session.url!,
      metadata: session.metadata || {},
    };
  }

  async verifyPayment(sessionId: string): Promise<PaymentVerificationResult> {
    if (!this.stripe) {
      throw new Error('Stripe 未配置');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return {
          success: false,
          sessionId,
          error: '支付未完成',
        };
      }

      const metadata = session.metadata;
      return {
        success: true,
        sessionId: session.id,
        userId: metadata?.userId,
        planId: metadata?.planId,
        credits: metadata?.credits ? parseInt(metadata.credits) : undefined,
        planType: metadata?.planType,
        amount: session.amount_total ? session.amount_total / 100 : undefined,
        currency: session.currency || 'usd',
      };
    } catch (error: any) {
      return {
        success: false,
        sessionId,
        error: error.message || '验证支付失败',
      };
    }
  }

  async handleWebhook(payload: any, signature?: string): Promise<PaymentWebhookEvent | null> {
    if (!this.stripe || !signature) {
      throw new Error('Stripe webhook 配置错误');
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    try {
      const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      
      return {
        id: event.id,
        type: event.type,
        data: event.data.object,
        metadata: (event.data.object as any).metadata || {},
      };
    } catch (error: any) {
      console.error('Stripe webhook 验证失败:', error.message);
      return null;
    }
  }
}
