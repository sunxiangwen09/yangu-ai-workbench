import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://huoke-os-ai-video.sunxiangwen09.chatgpt.site'),
  title: '衍谷AI自媒体获客工作台',
  description: '面向中小企业的证据驱动 AI 短视频获客工作台。',
  openGraph: {
    title: '衍谷AI自媒体获客工作台',
    description: '从选题证据到发布复盘，把短视频真正变成客户增长流水线。',
    images: [
      {
        url: 'https://huoke-os-ai-video.sunxiangwen09.chatgpt.site/og.png',
        width: 1200,
        height: 630,
        alt: '衍谷AI自媒体获客工作台',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '衍谷AI自媒体获客工作台',
    description: '从选题证据到发布复盘，把短视频真正变成客户增长流水线。',
    images: ['https://huoke-os-ai-video.sunxiangwen09.chatgpt.site/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
