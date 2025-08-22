import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { PaymentService } from '@/lib/payments/service';
import { getPaymentPlan } from '@/lib/payments/config';

export async function POST(request: NextRequest) {
  try {
    console.log('Creating checkout session...');

    // 检查基础环境变量
    if (!process.env.NEXTAUTH_URL) {
      console.error('NEXTAUTH_URL is not configured');
      return NextResponse.json(
        { error: '应用配置错误' },
        { status: 500 }
      );
    }

    // 检查用户认证
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    console.log('User authenticated:', session.user.email);

    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    console.log('User found:', user.id);

    // 检查用户是否已有活跃订阅
    const hasActiveSubscription = user.subscriptionStatus === 'active' && 
                                user.subscriptionEndDate && 
                                new Date(user.subscriptionEndDate) > new Date();

    if (hasActiveSubscription) {
      return NextResponse.json(
        { error: 'alreadySubscribed' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { locale = 'zh', planId = 'pro', paymentProvider } = body;

    // 验证支付计划
    const plan = getPaymentPlan(planId);
    if (!plan) {
      return NextResponse.json(
        { error: `未找到支付计划: ${planId}` },
        { status: 400 }
      );
    }

    console.log('Using plan:', plan);

    // 检查是否指定了支付提供商
    if (paymentProvider && !PaymentService.isProviderAvailable(paymentProvider)) {
      return NextResponse.json(
        { error: `支付提供商 ${paymentProvider} 不可用` },
        { status: 400 }
      );
    }

    // 创建支付会话
    const checkoutSession = await PaymentService.createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      planId: planId,
      locale: locale,
      successUrl: `${process.env.NEXTAUTH_URL}/${locale}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXTAUTH_URL}/${locale}?canceled=true`,
    }, paymentProvider);

    console.log('Checkout session created:', checkoutSession.id);

    return NextResponse.json({ 
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
      provider: paymentProvider || 'default'
    });

  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    
    return NextResponse.json(
      { error: error.message || '创建支付会话失败' },
      { status: 500 }
    );
  }
} 