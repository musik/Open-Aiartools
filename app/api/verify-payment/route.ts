import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userActivities } from '@/lib/schema';
import { eq, and, like } from 'drizzle-orm';
import { PaymentService } from '@/lib/payments/service';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // 检查用户认证状态
    const session = await auth();
    if (!session?.user?.email) {
      console.log('未认证用户尝试验证支付');
      return NextResponse.json(
        { error: '请先登录后再验证支付' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    console.log('完整 URL:', request.url);
    console.log('URL pathname:', url.pathname);
    console.log('URL search:', url.search);
    console.log('认证用户:', session.user.email);
    
    const { searchParams } = url;
    const sessionId = searchParams.get('session_id');
    const provider = searchParams.get('provider'); // 支付提供商
    const checkoutId = searchParams.get('checkout_id'); // Creem checkout ID
    
    // 额外的 Creem 参数
    const requestId = searchParams.get('request_id');
    const orderId = searchParams.get('order_id');
    const customerId = searchParams.get('customer_id');
    const subscriptionId = searchParams.get('subscription_id');
    const productId = searchParams.get('product_id');
    const signature = searchParams.get('signature');

    console.log('解析的参数:', {
      sessionId,
      provider,
      checkoutId,
      requestId,
      orderId,
      customerId,
      subscriptionId,
      productId,
      signature
    });

    if (!sessionId && !checkoutId) {
      return NextResponse.json(
        { error: '缺少会话ID' },
        { status: 400 }
      );
    }
    
    // 使用实际的会话ID（优先使用 checkout_id，这是 Creem 的真实 ID）
    let actualSessionId = checkoutId || sessionId;
    
    // 如果 sessionId 包含占位符，忽略它并只使用 checkout_id
    if (sessionId && sessionId.includes('{CHECKOUT_SESSION_ID}')) {
      console.log('检测到占位符 sessionId，使用 checkout_id:', checkoutId);
      actualSessionId = checkoutId;
    }
    
    if (!actualSessionId) {
      return NextResponse.json(
        { error: '缺少有效的会话ID' },
        { status: 400 }
      );
    }
    
    console.log('使用的实际会话ID:', actualSessionId);
    
    // 验证支付，优先使用指定的提供商
    let paymentResult;
    if (provider && provider !== 'undefined') {
      console.log(`使用指定的提供商: ${provider}`);
      paymentResult = await PaymentService.verifyPayment(actualSessionId, provider as any);
    } else {
      // 如果没有指定提供商，尝试根据参数推断
      if (checkoutId) {
        // 有 checkout_id 通常是 Creem
        console.log('检测到 checkout_id，使用 Creem 提供商');
        paymentResult = await PaymentService.verifyPayment(actualSessionId, 'creem');
      } else {
        // 默认尝试可用的提供商
        console.log('尝试使用可用的支付提供商...');
        const availableProviders = PaymentService.getAvailableProviders().filter(p => p.isConfigured);
        
        if (availableProviders.length === 0) {
          throw new Error('没有可用的支付提供商');
        }
        
        // 尝试第一个可用的提供商
        paymentResult = await PaymentService.verifyPayment(actualSessionId, availableProviders[0].type);
      }
    }

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.error || '支付验证失败' },
        { status: 400 }
      );
    }

    const { userId, planId, credits, planType } = paymentResult;
    if (!userId) {
      return NextResponse.json(
        { error: '用户ID缺失' },
        { status: 400 }
      );
    }

    // 安全检查：确保支付属于当前登录用户
    const currentUser = await db.query.users.findFirst({
      where: eq(users.email, session.user.email),
    });

    if (!currentUser || currentUser.id !== userId) {
      console.log(`安全警告：用户 ${session.user.email} 尝试验证属于用户 ${userId} 的支付`);
      return NextResponse.json(
        { error: '支付验证失败：用户身份不匹配' },
        { status: 403 }
      );
    }

    // 获取用户信息
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      );
    }

    // 检查是否已经处理过此订阅 - 修改检查逻辑
    const existingActivity = await db.query.userActivities.findFirst({
      where: and(
        eq(userActivities.userId, userId),
        like(userActivities.metadata, `%"sessionId":"${sessionId}"%`)
      ),
    });

    if (!existingActivity) {
      const creditsAmount = credits || 800;
      const paymentPlanType = planType || 'subscription';
      
      // 检查用户是否已经有活跃的订阅
      if (paymentPlanType === 'subscription') {
        const hasActiveSubscription = user.subscriptionStatus === 'active' && 
                                    user.subscriptionEndDate && 
                                    new Date(user.subscriptionEndDate) > new Date();

        if (hasActiveSubscription) {
          return NextResponse.json(
            { error: 'alreadySubscribed' },
            { status: 400 }
          );
        }
      }
      
      // 计算订阅到期时间（一个月后）
      const subscriptionStartDate = new Date();
      const subscriptionEndDate = new Date();
      subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

      if (paymentPlanType === 'subscription') {
        // 处理订阅模式：将积分添加到订阅积分字段
        await db.update(users)
          .set({ 
            subscriptionCredits: creditsAmount, // 重置订阅积分
            subscriptionStatus: 'active',
            subscriptionPlan: planId || 'pro',
            subscriptionStartDate: subscriptionStartDate,
            subscriptionEndDate: subscriptionEndDate,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        // 记录订阅积分活动 - 使用唯一标识符避免重复
        await db.insert(userActivities).values({
          userId: userId,
          type: 'subscription_activated',
          description: 'credit_description.subscription_activated',
          creditAmount: creditsAmount,
          metadata: JSON.stringify({ 
            sessionId,
            planType: paymentPlanType,
            planId: planId || 'pro',
            subscriptionEndDate: subscriptionEndDate.toISOString(),
            source: 'verify-payment-api', // 标识来源
            timestamp: new Date().toISOString()
          }),
          createdAt: new Date(),
        });
      } else {
        // 处理一次性支付：添加到永久积分
        await db.update(users)
          .set({ 
            credits: user.credits + creditsAmount,
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));

        // 记录积分活动
        await db.insert(userActivities).values({
          userId: userId,
          type: 'credit_add',
          description: 'credit_description.purchase_credits',
          creditAmount: creditsAmount,
          metadata: JSON.stringify({ 
            sessionId,
            planType: paymentPlanType,
            planId: planId || 'pro',
            source: 'verify-payment-api', // 标识来源
            timestamp: new Date().toISOString()
          }),
          createdAt: new Date(),
        });
      }
    } else {
      console.log(`Session ${sessionId} has already been processed, skipping duplicate processing`);
    }

    return NextResponse.json({
      success: true,
      session: {
        id: paymentResult.sessionId,
        amount_total: paymentResult.amount,
        currency: paymentResult.currency,
        payment_status: 'paid',
      }
    });

  } catch (error: any) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: error.message || '验证支付失败' },
      { status: 500 }
    );
  }
} 