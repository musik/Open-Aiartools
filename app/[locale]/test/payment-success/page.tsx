'use client';

import { use, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, ArrowRight, Home, TestTube, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/components/providers';

interface TestPaymentSuccessPageProps {
  params: Promise<{
    locale: string;
  }>;
}

function TestPaymentSuccessContent({ locale }: { locale: string }) {
  const router = useRouter();
  const { user, isLoading: authLoading, refreshUser } = useAuth();
  const t = useTranslations('payment.success');
  
  // 测试参数状态
  const [testParams, setTestParams] = useState({
    provider: 'mock',
    sessionId: 'test_session_123',
    checkoutId: 'test_checkout_456',
    requestId: 'test_request_789',
    planId: 'pro',
    credits: '800',
    amount: '9.99',
    currency: 'USD'
  });

  // 模拟支付成功数据
  const [mockSessionData, setMockSessionData] = useState<any>(null);

  // 生成测试URL
  const generateTestUrl = () => {
    const params = new URLSearchParams();
    if (testParams.provider) params.append('provider', testParams.provider);
    if (testParams.sessionId) params.append('session_id', testParams.sessionId);
    if (testParams.checkoutId) params.append('checkout_id', testParams.checkoutId);
    if (testParams.requestId) params.append('request_id', testParams.requestId);
    
    return `/${locale}/payment/success?${params.toString()}`;
  };

  // 模拟支付验证成功
  const simulatePaymentSuccess = () => {
    const mockData = {
      success: true,
      session: {
        id: testParams.sessionId || testParams.checkoutId,
        amount_total: parseFloat(testParams.amount) * 100, // 转换为分
        currency: testParams.currency,
        payment_status: 'paid',
        plan_id: testParams.planId,
        credits: parseInt(testParams.credits)
      }
    };
    
    setMockSessionData(mockData);
    
    // 触发支付成功事件
    window.dispatchEvent(new CustomEvent('paymentSuccess', {
      detail: { session: mockData.session }
    }));
    
    toast({
      title: '模拟支付成功',
      description: `已模拟 ${testParams.planId} 计划的支付成功`,
    });
  };

  // 清除模拟数据
  const clearMockData = () => {
    setMockSessionData(null);
    toast({
      title: '已清除模拟数据',
      description: '重置为初始状态',
    });
  };

  // 测试数据刷新功能
  const testDataRefresh = async () => {
    if (!user) {
      toast({
        title: '需要登录',
        description: '请先登录后再测试数据刷新',
        variant: 'destructive'
      });
      return;
    }
    
    console.log('测试数据刷新功能');
    await refreshUser();
    window.dispatchEvent(new CustomEvent('forceUserRefresh'));
    
    toast({
      title: '数据刷新测试',
      description: '已触发用户数据强制刷新',
    });
  };

  // 测试跳转到 Dashboard
  const testDashboardNavigation = async () => {
    if (!user) {
      toast({
        title: '需要登录',
        description: '请先登录后再访问 Dashboard',
        variant: 'destructive'
      });
      router.push(`/${locale}/auth/login`);
      return;
    }
    
    // 强制刷新用户数据
    console.log('测试支付成功，强制刷新用户数据');
    await refreshUser();
    
    // 触发用户数据刷新事件
    window.dispatchEvent(new CustomEvent('forceUserRefresh'));
    
    // 延时一下确保数据刷新完成
    setTimeout(() => {
      router.push(`/${locale}/dashboard`);
    }, 100);
    
    toast({
      title: '测试跳转',
      description: '正在跳转到 Dashboard...',
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">验证用户状态中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 页面标题 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="w-5 h-5" />
              支付成功页面测试工具
            </CardTitle>
            <p className="text-sm text-gray-600">
              此页面用于测试支付成功页面的各种功能，无需真实支付流程
            </p>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：测试参数配置 */}
          <div className="space-y-6">
            {/* 测试参数设置 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  测试参数配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="provider">支付提供商</Label>
                    <Select value={testParams.provider} onValueChange={(value) => 
                      setTestParams(prev => ({ ...prev, provider: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mock">Mock</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="creem">Creem</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="planId">计划ID</Label>
                    <Select value={testParams.planId} onValueChange={(value) => 
                      setTestParams(prev => ({ ...prev, planId: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pro">Pro 订阅</SelectItem>
                        <SelectItem value="credits_100">100积分包</SelectItem>
                        <SelectItem value="credits_500">500积分包</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sessionId">Session ID</Label>
                    <Input
                      id="sessionId"
                      value={testParams.sessionId}
                      onChange={(e) => setTestParams(prev => ({ ...prev, sessionId: e.target.value }))}
                      placeholder="test_session_123"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="checkoutId">Checkout ID</Label>
                    <Input
                      id="checkoutId"
                      value={testParams.checkoutId}
                      onChange={(e) => setTestParams(prev => ({ ...prev, checkoutId: e.target.value }))}
                      placeholder="test_checkout_456"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="credits">积分数量</Label>
                    <Input
                      id="credits"
                      value={testParams.credits}
                      onChange={(e) => setTestParams(prev => ({ ...prev, credits: e.target.value }))}
                      placeholder="800"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="amount">金额</Label>
                    <Input
                      id="amount"
                      value={testParams.amount}
                      onChange={(e) => setTestParams(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="9.99"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="currency">货币</Label>
                    <Input
                      id="currency"
                      value={testParams.currency}
                      onChange={(e) => setTestParams(prev => ({ ...prev, currency: e.target.value }))}
                      placeholder="USD"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 测试操作 */}
            <Card>
              <CardHeader>
                <CardTitle>测试操作</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => router.push(generateTestUrl())}
                  className="w-full"
                  variant="outline"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  跳转到真实支付成功页面
                </Button>
                
                <Button
                  onClick={simulatePaymentSuccess}
                  className="w-full"
                  variant="default"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  模拟支付成功
                </Button>
                
                <Button
                  onClick={testDataRefresh}
                  className="w-full"
                  variant="secondary"
                >
                  测试数据刷新
                </Button>
                
                <Button
                  onClick={testDashboardNavigation}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                >
                  <Home className="w-4 h-4 mr-2" />
                  测试跳转到 Dashboard
                </Button>
                
                {mockSessionData && (
                  <Button
                    onClick={clearMockData}
                    className="w-full"
                    variant="destructive"
                  >
                    清除模拟数据
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：模拟支付成功页面预览 */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>支付成功页面预览</CardTitle>
                <p className="text-sm text-gray-600">模拟真实支付成功页面的显示效果</p>
              </CardHeader>
              <CardContent>
                {mockSessionData ? (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg p-6">
                    <div className="text-center">
                      <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-green-600 mb-2">
                        支付成功！
                      </h3>
                      <p className="text-gray-600 mb-4">
                        感谢您的购买，您的{testParams.planId}已激活
                      </p>
                      
                      <div className="bg-white rounded-lg p-4 mb-4 text-left">
                        <h4 className="font-medium mb-2">支付详情</h4>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>订单号:</span>
                            <span>{mockSessionData.session.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>支付金额:</span>
                            <span>${testParams.amount} {testParams.currency}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>获得积分:</span>
                            <span>{testParams.credits} 积分</span>
                          </div>
                          <div className="flex justify-between">
                            <span>支付方式:</span>
                            <span className="capitalize">{testParams.provider}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>状态:</span>
                            <span className="font-medium text-green-600">已激活</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <Button 
                          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                          onClick={testDashboardNavigation}
                        >
                          <Home className="w-4 h-4 mr-2" />
                          返回 Dashboard
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => router.push(`/${locale}#demo`)}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          开始使用
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <TestTube className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>点击"模拟支付成功"查看效果</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 用户状态信息 */}
        <Card>
          <CardHeader>
            <CardTitle>当前用户状态</CardTitle>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">邮箱:</span>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">永久积分:</span>
                  <p className="font-medium">{user.credits || 0}</p>
                </div>
                <div>
                  <span className="text-gray-500">订阅积分:</span>
                  <p className="font-medium">{user.subscriptionCredits || 0}</p>
                </div>
                <div>
                  <span className="text-gray-500">订阅状态:</span>
                  <p className="font-medium">{user.subscriptionStatus || 'none'}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-4">未登录状态</p>
                <Button onClick={() => router.push(`/${locale}/auth/login`)}>
                  前往登录
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 生成的测试URL */}
        <Card>
          <CardHeader>
            <CardTitle>生成的测试URL</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-3 rounded-lg">
              <code className="text-sm break-all">{generateTestUrl()}</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function TestPaymentSuccessPage({ params }: TestPaymentSuccessPageProps) {
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
      <TestPaymentSuccessContent locale={locale} />
    </Suspense>
  );
}
