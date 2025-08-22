import type React from "react"
import { notFound } from "next/navigation"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server"
import type { Metadata, Viewport } from "next"
import Providers from "@/components/providers"

const locales = ["en", "zh"]

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

// 单独导出viewport配置
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

// 动态生成 metadata
export async function generateMetadata({ 
  params 
}: { 
  params: Promise<{ locale: string }> 
}): Promise<Metadata> {
  const { locale } = await params
  
  // 获取翻译
  const t = await getTranslations({ locale, namespace: 'seo' })
  
  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    authors: [{ name: 'Aiartools Team' }],
    creator: 'Aiartools',
    publisher: 'Aiartools',
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: 'website',
      locale: locale,
      alternateLocale: locale === 'en' ? 'zh' : 'en',
      url: 'https://aiartools.com',
      title: t('ogTitle'),
      description: t('ogDescription'),
      siteName: 'Aiartools',
      images: [
        {
          url: '/images/og-image.png',
          width: 1200,
          height: 630,
          alt: t('ogTitle'),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('twitterTitle'),
      description: t('twitterDescription'),
      images: ['/images/og-image.png'],
      creator: '@aiartools',
      site: '@aiartools',
    },
    icons: {
      icon: "/images/favicon.ico",
    },
    manifest: '/site.webmanifest',
    alternates: {
      canonical: `https://aiartools.com/${locale}`,
      languages: {
        'en': 'https://aiartools.com/en',
        'zh': 'https://aiartools.com/zh',
        'x-default': 'https://aiartools.com/en',
      },
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  
  if (!locale || !locales.includes(locale)) {
    console.log(`Invalid locale received: ${locale}`)
    notFound()
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages()

  return (
    <Providers>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </Providers>
  )
}
