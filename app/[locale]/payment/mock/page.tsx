"use client"

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function MockPaymentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const t = useTranslations('payment')
  
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending')
  
  const sessionId = searchParams.get('session_id')
  const planId = searchParams.get('plan_id')
  const amount = searchParams.get('amount')
  const credits = searchParams.get('credits')
  const locale = window.location.pathname.split('/')[1]

  const handlePayment = async (success: boolean) => {
    setIsProcessing(true)
    
    // 模拟支付处理时间
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (success) {
      setPaymentStatus('success')
      // 跳转到成功页面
      setTimeout(() => {
        router.push(`/${locale}/payment/success?session_id=${sessionId}`)
      }, 1500)
    } else {
      setPaymentStatus('failed')
      setTimeout(() => {
        setPaymentStatus('pending')
        setIsProcessing(false)
      }, 2000)
    }
  }

  const handleCancel = () => {
    router.push(`/${locale}?canceled=true`)
  }

  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">支付成功！</CardTitle>
            <CardDescription>正在跳转到成功页面...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (paymentStatus === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-600">支付失败</CardTitle>
            <CardDescription>支付处理失败，请重试</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>模拟支付</CardTitle>
          <CardDescription>
            这是一个模拟支付页面，用于测试支付流程
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">订单详情</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>会话ID:</span>
                <span className="font-mono text-xs">{sessionId}</span>
              </div>
              <div className="flex justify-between">
                <span>计划:</span>
                <span>{planId}</span>
              </div>
              <div className="flex justify-between">
                <span>积分:</span>
                <span>{credits}</span>
              </div>
              <div className="flex justify-between">
                <span>金额:</span>
                <span>${(parseInt(amount || '0') / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              选择支付结果进行测试：
            </p>
            
            <Button 
              onClick={() => handlePayment(true)}
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                '模拟支付成功'
              )}
            </Button>
            
            <Button 
              variant="destructive"
              onClick={() => handlePayment(false)}
              disabled={isProcessing}
              className="w-full"
            >
              模拟支付失败
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleCancel}
              disabled={isProcessing}
              className="w-full"
            >
              取消支付
            </Button>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            ⚠️ 这是开发环境的模拟支付，不会产生真实费用
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
