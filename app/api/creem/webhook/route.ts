import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { users, userActivities } from '@/lib/schema';
import { addCredits } from '@/lib/credit-service';
import { eq, and, like } from 'drizzle-orm';
import { PaymentService } from '@/lib/payments/service';
import { CREDIT_CONFIG } from '@/lib/constants';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('creem-signature') || request.headers.get('x-creem-signature');

    console.log('Received Creem webhook');

    // 使用 PaymentService 处理 webhook
    const webhookEvent = await PaymentService.handleWebhook(
      JSON.parse(body),
      signature || undefined,
      'creem'
    );

    if (!webhookEvent) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    }

    console.log('Creem webhook event:', webhookEvent.type);

    // 处理支付成功事件
    if (webhookEvent.type === 'checkout.completed' || webhookEvent.type === 'payment.completed') {
      const eventData = webhookEvent.data;
      
      console.log('Creem checkout completed:', eventData.id);
      console.log('Event metadata:', webhookEvent.metadata);

      if (webhookEvent.metadata) {
        const { userId, planId, credits, planType } = webhookEvent.metadata;
        
        // 检查是否已经处理过此会话（避免重复处理）
        const existingActivity = await db.query.userActivities.findFirst({
          where: and(
            eq(userActivities.userId, userId),
            like(userActivities.metadata, `%"sessionId":"${eventData.id}"%`)
          ),
        });

        if (!existingActivity) {
          try {
            // 为用户添加积分
            const creditType = planType === 'subscription' ? 'subscription' : 'permanent';
            
            await addCredits(
              userId,
              parseInt(credits),
              planType === 'subscription' ? 'credit_description.subscription_activated' : 'credit_description.credit_purchase',
              {
                type: 'payment',
                planId: planId,
                sessionId: eventData.id,
                amount: eventData.amount ? eventData.amount / 100 : 0,
                currency: eventData.currency || 'USD',
                source: 'creem-webhook',
                timestamp: new Date().toISOString()
              },
              creditType
            );

            // 如果是订阅类型，更新用户的订阅状态
            if (planType === 'subscription') {
              await db.update(users)
                .set({
                  subscriptionStatus: 'active',
                  subscriptionPlan: planId,
                  subscriptionStartDate: new Date(),
                  // 默认设置为30天后过期
                  subscriptionEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                })
                .where(eq(users.id, userId));

              console.log(`Successfully updated subscription status for user ${userId}`);
            }

            console.log(`Successfully added ${credits} ${creditType} credits to user ${userId} via Creem webhook`);
          } catch (error) {
            console.error('Error adding credits via Creem webhook:', error);
          }
        } else {
          console.log(`Session ${eventData.id} has already been processed, skipping webhook processing`);
        }
      }
    }

    // 处理订阅续费事件
    if (webhookEvent.type === 'subscription.renewed' || webhookEvent.type === 'invoice.payment_succeeded') {
      const eventData = webhookEvent.data;
      
      console.log('Creem subscription renewal:', eventData.id);
      
      // 从事件数据中获取用户信息
      if (eventData.customer && eventData.customer.email) {
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.email, eventData.customer.email),
          });

          if (user) {
            // 为订阅用户每月添加订阅积分
            await addCredits(
              user.id,
              CREDIT_CONFIG.SUBSCRIPTION.PRO_MONTHLY_CREDITS,
              'credit_description.subscription_renewal',
              {
                type: 'subscription_renewal',
                invoiceId: eventData.id,
                amount: eventData.amount ? eventData.amount / 100 : 0,
                currency: eventData.currency || 'USD',
                source: 'creem-webhook',
              },
              'subscription'
            );

            console.log(`Successfully added ${CREDIT_CONFIG.SUBSCRIPTION.PRO_MONTHLY_CREDITS} subscription credits to user ${user.id} for Creem subscription renewal`);
          }
        } catch (error) {
          console.error('Error handling Creem subscription renewal:', error);
        }
      }
    }

    // 处理订阅取消事件
    if (webhookEvent.type === 'subscription.cancelled' || webhookEvent.type === 'subscription.deleted') {
      const eventData = webhookEvent.data;
      
      console.log('Creem subscription cancelled:', eventData.id);
      
      if (eventData.customer && eventData.customer.email) {
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.email, eventData.customer.email),
          });

          if (user) {
            // 清零订阅积分
            await addCredits(user.id, 0, 'credit_description.subscription_expired', {
              type: 'subscription_expired',
              amount: 0,
              currency: 'USD',
              source: 'creem-webhook',
              timestamp: new Date().toISOString()
            }, 'subscription');
            
            // 更新订阅状态为取消
            await db.update(users)
              .set({
                subscriptionStatus: 'canceled',
                subscriptionEndDate: new Date(),
              })
              .where(eq(users.id, user.id));
            
            console.log(`Cleared subscription credits and updated status for user ${user.id} due to Creem subscription cancellation`);
          }
        } catch (error) {
          console.error('Error handling Creem subscription cancellation:', error);
        }
      }
    }

    // 处理支付失败事件
    if (webhookEvent.type === 'payment.failed' || webhookEvent.type === 'invoice.payment_failed') {
      const eventData = webhookEvent.data;
      
      console.log('Creem payment failed:', eventData.id);
      
      if (eventData.customer && eventData.customer.email) {
        try {
          const user = await db.query.users.findFirst({
            where: eq(users.email, eventData.customer.email),
          });

          if (user && user.subscriptionStatus === 'active') {
            // 如果是订阅支付失败，可能需要更新状态
            await db.update(users)
              .set({
                subscriptionStatus: 'past_due',
              })
              .where(eq(users.id, user.id));
            
            console.log(`Updated subscription status to past_due for user ${user.id} due to Creem payment failure`);
          }
        } catch (error) {
          console.error('Error handling Creem payment failure:', error);
        }
      }
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('Creem webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Creem Webhook处理失败' },
      { status: 500 }
    );
  }
}
