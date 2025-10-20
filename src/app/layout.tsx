import type { Metadata } from "next";
import "../styles/globals.css";
import { TRPCReactProvider } from "~/components/providers/trpc-provider";
import { Toaster } from "~/components/ui/toast";

export const metadata: Metadata = {
  title: "Media Converter",
  description: "在线视频内容提取工具",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-50 text-gray-900">
        <TRPCReactProvider>
          <div className="min-h-screen">
            {children}
          </div>
          <Toaster />
        </TRPCReactProvider>
      </body>
    </html>
  );
} 