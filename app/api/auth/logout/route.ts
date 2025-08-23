import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // 清除所有可能的认证相关cookies
    const cookiesToDelete = [
      'auth-token',
      'authToken',
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token'
    ];

    // 构建清除cookies的响应头
    const clearCookieHeaders = cookiesToDelete.map(cookieName => 
      `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`
    ).join(', ');

    return NextResponse.json(
      { message: 'Logout successful' },
      {
        status: 200,
        headers: {
          'Set-Cookie': clearCookieHeaders
        }
      }
    );
  } catch (error) {
    console.error('退出登录错误:', error);
    return NextResponse.json(
      { error: '退出登录失败' },
      { status: 500 }
    );
  }
} 