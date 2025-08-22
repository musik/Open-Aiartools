'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Home } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/providers';

interface PaymentSuccessPageProps {
  params: Promise<{
    locale: string;
  }>;
}

function PaymentSuccessContent({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [sessionData, setSessionData] = useState<any>(null);
  const t = useTranslations('payment.success');
  const { user, isLoading: authLoading, refreshUser } = useAuth();

  // 简化的认证状态检查
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('用户未登录，重定向到登录页面');
      toast({
        title: '需要登录',
        description: '请先登录后再查看支付结果',
        variant: 'destructive'
      });
      router.push(`/${locale}/auth/login`);
      return;
    }
  }, [user, authLoading, router, locale]);

  useEffect(() => {
    // 等待认证状态加载完成
    if (authLoading) return;
    
    // 如果用户未登录，不处理支付验证
    if (!user) return;
    const sessionId = searchParams.get('session_id');
    const checkoutId = searchParams.get('checkout_id');
    const provider = searchParams.get('provider');
    const requestId = searchParams.get('request_id');
    
    // 使用适当的会话ID（优先使用 checkout_id 用于 Creem）
    const actualSessionId = checkoutId || sessionId;
    
    if (!actualSessionId) {
      router.push(`/${locale}/`);
      return;
    }
    
    // 如果是占位符，检查是否有其他有效的ID
    if (actualSessionId.includes('{CHECKOUT_SESSION_ID}')) {
      console.log('检测到占位符，等待有效参数...');
      router.push(`/${locale}/`);
      return;
    }

    console.log('支付成功页面参数:', {
      sessionId,
      checkoutId,
      provider,
      requestId,
      actualSessionId
    });

    // 验证支付会话
    const verifySession = async () => {
      try {
        // 构建验证URL，包含所有相关参数
        const params = new URLSearchParams();
        if (actualSessionId) {
          if (checkoutId) {
            params.append('checkout_id', checkoutId);
          } else {
            params.append('session_id', actualSessionId);
          }
        }
        if (provider) params.append('provider', provider);
        if (requestId) params.append('request_id', requestId);
        
        const verifyUrl = `/api/verify-payment?${params.toString()}`;
        console.log('调用验证API:', verifyUrl);
        
        const response = await fetch(verifyUrl);
        const data = await response.json();
        
        if (response.ok) {
          setSessionData(data);
          // 触发支付成功事件，通知其他组件更新
          window.dispatchEvent(new CustomEvent('paymentSuccess', {
            detail: { session: data.session }
          }));
        } else {
          console.error('Payment verification failed:', data.error);
          toast({
            title: 'Payment Verification Error',
            description: data.error || 'Payment verification failed',
            variant: 'destructive'
          });
          router.push(`/${locale}/payment/failed?error=${encodeURIComponent(data.error || 'Payment verification failed')}`);
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
        toast({
          title: 'Payment Verification Error',
          description: 'An error occurred while verifying payment',
          variant: 'destructive'
        });
        router.push(`/${locale}/payment/failed?error=${encodeURIComponent('An error occurred while verifying payment')}`);
      } finally {
        setIsLoading(false);
      }
    };

            verifySession();
      }, [searchParams, router, locale, toast, authLoading, user]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {authLoading ? '验证用户状态中...' : t('processing')}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {authLoading ? '请稍等，正在验证您的登录状态' : t('processingDesc')}
          </p>
        </div>
      </div>
    );
  }

  // 如果用户未登录，显示登录提示
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Home className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-red-600 font-medium">需要登录才能查看支付结果</p>
          <p className="mt-2 text-gray-600">正在重定向到登录页面...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-green-600">
            {t('title')}
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {t('subtitle')}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">{t('subscriptionDetails')}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">{t('subscriptionPlan')}：</span>
                <span className="font-medium">{t('proVersion')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('monthlyCredits')}：</span>
                <span className="font-medium">{t('credits800')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('subscriptionFee')}：</span>
                <span className="font-medium">{t('pricePerMonth')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">{t('status')}：</span>
                <span className="font-medium text-green-600">{t('activated')}</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              onClick={() => {
                console.log('支付成功页面 - 点击返回Dashboard按钮:', {
                  user: !!user,
                  userEmail: user?.email,
                  authLoading,
                  timestamp: new Date().toISOString()
                });

                // 确保用户已登录
                if (!user) {
                  console.warn('支付成功页面 - 用户未登录，重定向到登录页');
                  toast({
                    title: '需要登录',
                    description: '请先登录后再访问 Dashboard',
                    variant: 'destructive'
                  });
                  router.push(`/${locale}/auth/login`);
                  return;
                }
                
                // 直接跳转 (数据已在支付验证时通过paymentSuccess事件刷新)
                console.log('支付成功页面 - 跳转到 Dashboard，用户状态:', {
                  userEmail: user.email,
                  credits: user.credits,
                  subscriptionStatus: user.subscriptionStatus
                });
                router.push(`/${locale}/dashboard`);
              }}
            >
              <Home className="w-4 h-4 mr-2" />
              {t('backToDashboard')}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => router.push(`/${locale}#demo`)}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              {t('startUsing')}
            </Button>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p>{t('thankYou')}</p>
            <p className="mt-1">{t('autoRenewal')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage({ params }: PaymentSuccessPageProps) {
  const { locale } = use(params);

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PaymentSuccessContent locale={locale} />
    </Suspense>
  );
} 