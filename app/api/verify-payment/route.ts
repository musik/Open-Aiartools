import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userActivities } from '@/lib/schema';
import { eq, and, like } from 'drizzle-orm';
import { PaymentService } from '@/lib/payments/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { error: '缺少会话ID' },
        { status: 400 }
      );
    }

    // 验证支付
    const paymentResult = await PaymentService.verifyPayment(sessionId);

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