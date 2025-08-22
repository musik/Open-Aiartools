'use client';

import { use, useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface PaymentFailedPageProps {
  params: Promise<{
    locale: string;
  }>;
}

function PaymentFailedContent({ locale }: { locale: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const t = useTranslations('payment.failed');

  useEffect(() => {
    // 获取错误信息
    const error = searchParams.get('error');
    const sessionId = searchParams.get('session_id');
    const checkoutId = searchParams.get('checkout_id');
    const provider = searchParams.get('provider');
    
    setErrorDetails({
      error,
      sessionId,
      checkoutId,
      provider,
      timestamp: new Date().toISOString()
    });

    console.log('支付失败页面参数:', {
      error,
      sessionId,
      checkoutId,
      provider
    });
  }, [searchParams]);

  const handleRetry = () => {
    // 重新尝试支付，回到计划选择页面
    router.push(`/${locale}/dashboard#pricing`);
  };

  const handleBackHome = () => {
    router.push(`/${locale}/`);
  };

  const handleContactSupport = () => {
    // 可以跳转到客服页面或显示联系方式
    router.push(`/${locale}/blog/contact-us`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-600">
            支付失败
          </CardTitle>
          <p className="text-gray-600 mt-2">
            很抱歉，您的支付未能成功完成
          </p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {errorDetails?.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h3 className="font-semibold text-red-800 mb-2">错误详情</h3>
              <p className="text-sm text-red-700">{errorDetails.error}</p>
              {errorDetails.sessionId && (
                <p className="text-xs text-red-600 mt-1">
                  会话ID: {errorDetails.sessionId}
                </p>
              )}
              {errorDetails.checkoutId && (
                <p className="text-xs text-red-600 mt-1">
                  结账ID: {errorDetails.checkoutId}
                </p>
              )}
            </div>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">可能的原因</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 银行卡余额不足</li>
              <li>• 卡片信息输入错误</li>
              <li>• 网络连接问题</li>
              <li>• 银行安全验证失败</li>
              <li>• 支付系统临时故障</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <Button 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
              onClick={handleRetry}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              重新尝试支付
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleBackHome}
              >
                <Home className="w-4 h-4 mr-2" />
                返回首页
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleContactSupport}
              >
                联系客服
              </Button>
            </div>
          </div>
          
          <div className="text-center text-sm text-gray-500">
            <p>如果问题持续存在，请联系我们的客服团队</p>
            <p className="mt-1">我们将尽快为您解决问题</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentFailedPage({ params }: PaymentFailedPageProps) {
  const { locale } = use(params);

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    }>
      <PaymentFailedContent locale={locale} />
    </Suspense>
  );
}
