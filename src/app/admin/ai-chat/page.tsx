'use client'

/**
 * AI Chat Page
 * AI对话测试功能主页面
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Loader2,
  Pin,
  PanelRightOpen,
  Plus,
  Settings,
  Trash2,
  X,
} from 'lucide-react'

import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Switch } from '~/components/ui/switch'
import { cn } from '~/lib/utils/cn'
import { api } from '~/components/providers/trpc-provider'

// ==================== 类型定义 ====================

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  metadata?: Record<string, unknown> | null
}

// Provider option from API (used by tRPC response type)
interface _ProviderOption {
  provider: string
  label: string
  models: string[]
  defaultModel: string
  isConfigured: boolean
  supportsWebSearch: boolean
}

// ==================== 辅助函数 ====================

const truncatePreview = (text: string) => {
  if (!text) return '（空对话）'
  const compact = text.replace(/\s+/g, ' ').trim()
  if (compact.length <= 16) return compact
  return `${compact.slice(0, 16)}…`
}

// Format date time for display (unused for now)
// const formatDateTime = (value: string) => {
//   try {
//     return new Date(value).toLocaleString('zh-CN', {
//       hour12: false,
//     })
//   } catch {
//     return value
//   }
// }

// 解析 <think> 标签
const parseThinkBlocks = (
  content: string
): Array<{ type: 'think' | 'normal'; content: string; id?: string }> => {
  const blocks: Array<{ type: 'think' | 'normal'; content: string; id?: string }> = []
  const thinkRegex = /<think>([\s\S]*?)<\/think>/g
  let lastIndex = 0
  let match

  while ((match = thinkRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const normalContent = content.slice(lastIndex, match.index)
      if (normalContent.trim()) {
        blocks.push({ type: 'normal', content: normalContent })
      }
    }

    blocks.push({
      type: 'think',
      content: (match[1] ?? '').trim(),
      id: `think-${match.index}`,
    })

    lastIndex = match.index + match[0].length
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex)
    if (remaining.trim()) {
      blocks.push({ type: 'normal', content: remaining })
    }
  }

  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: 'normal', content })
  }

  return blocks
}

// Markdown 渲染组件
const markdownComponents: Components = {
  code({ inline, className, children, ...props }: any) {
    if (inline) {
      return (
        <code
          className={cn(
            'rounded bg-muted px-1 py-0.5 font-mono text-[0.8125rem]',
            className
          )}
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <pre className="overflow-x-auto rounded-md bg-muted/60 p-3">
        <code className={cn('block font-mono text-xs', className)} {...props}>
          {children}
        </code>
      </pre>
    )
  },
  a({ href, children, ...props }: any) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-600 underline underline-offset-4"
        {...props}
      >
        {children}
      </a>
    )
  },
}

// ==================== 主组件 ====================

export default function AIChatPage() {
  // 状态管理
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [systemInstruction, setSystemInstruction] = useState<string>('')
  const [enableWebSearch, setEnableWebSearch] = useState(false)
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [expandedThinkBlocks, setExpandedThinkBlocks] = useState<Set<string>>(new Set())
  const [pinnedConversations, setPinnedConversations] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // tRPC查询
  const utils = api.useUtils()

  const { data: providersData, isLoading: providersLoading } =
    api.chat.listProviders.useQuery()

  const { data: conversationsData, refetch: refetchConversations } =
    api.chat.listConversations.useQuery()

  const sendMessageMutation = api.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { id: data.userMessageId, role: 'user', content: inputMessage },
        {
          id: data.assistantMessageId,
          role: 'assistant',
          content: data.reply,
          metadata: data.metadata,
        },
      ])
      setCurrentConversationId(data.conversationId)
      setInputMessage('')
      void refetchConversations()
    },
  })

  const deleteConversationMutation = api.chat.deleteConversation.useMutation({
    onSuccess: () => {
      void refetchConversations()
      if (currentConversationId) {
        handleNewConversation()
      }
    },
  })

  const deleteMessageMutation = api.chat.deleteMessage.useMutation({
    onSuccess: () => {
      // 重新加载当前对话
      if (currentConversationId) {
        void loadConversation(currentConversationId)
      }
    },
  })

  // 初始化默认供应商
  useEffect(() => {
    if (providersData && providersData.length > 0 && !selectedProvider) {
      const configured = providersData.find((p) => p.isConfigured)
      const provider = configured || providersData[0]
      if (provider) {
        setSelectedProvider(provider.provider)
        setSelectedModel(provider.defaultModel)
      }
    }
  }, [providersData, selectedProvider])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 加载本地PIN数据
  useEffect(() => {
    const saved = localStorage.getItem('chat-pinned-conversations')
    if (saved) {
      try {
        setPinnedConversations(JSON.parse(saved) as string[])
      } catch {
        // ignore
      }
    }
  }, [])

  // 处理发送消息
  const handleSendMessage = useCallback(() => {
    if (!inputMessage.trim() || !selectedProvider || !selectedModel) return
    if (sendMessageMutation.isPending) return

    sendMessageMutation.mutate({
      conversationId: currentConversationId || undefined,
      provider: selectedProvider,
      model: selectedModel,
      message: inputMessage.trim(),
      systemInstruction: systemInstruction.trim() || undefined,
      enableWebSearch,
      history: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })
  }, [
    inputMessage,
    selectedProvider,
    selectedModel,
    systemInstruction,
    enableWebSearch,
    messages,
    currentConversationId,
    sendMessageMutation,
  ])

  // 加载对话
  const loadConversation = useCallback(
    async (conversationId: string) => {
      try {
        const result = await utils.chat.getConversation.fetch({ conversationId })
        if (result) {
          setMessages(
            result.messages.map((m) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              metadata: m.metadata,
            }))
          )
          setCurrentConversationId(result.id)
          setSelectedProvider(result.provider)
          setSelectedModel(result.model)
          setSystemInstruction(result.systemInstruction || '')
          setEnableWebSearch(result.enableWebSearch)
          // 关闭历史抽屉，让用户可以继续对话
          setIsHistoryOpen(false)
        }
      } catch (error) {
        console.error('Failed to load conversation:', error)
      }
    },
    [utils]
  )

  // 新建对话
  const handleNewConversation = useCallback(() => {
    setMessages([])
    setCurrentConversationId(null)
    setSystemInstruction('')
    setEnableWebSearch(false)
  }, [])

  // 删除对话
  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      if (confirm('确定要删除这个对话吗？')) {
        deleteConversationMutation.mutate({ conversationId })
      }
    },
    [deleteConversationMutation]
  )

  // 删除消息
  const handleDeleteMessage = useCallback(
    (messageId: string) => {
      if (confirm('确定要删除这条消息吗？')) {
        deleteMessageMutation.mutate({ messageId })
      }
    },
    [deleteMessageMutation]
  )

  // 复制消息
  const handleCopyMessage = useCallback((content: string) => {
    navigator.clipboard.writeText(content).catch(console.error)
  }, [])

  // Toggle think block
  const toggleThinkBlock = useCallback((id: string) => {
    setExpandedThinkBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  // Toggle PIN
  const togglePin = useCallback((conversationId: string) => {
    setPinnedConversations((prev) => {
      const next = prev.includes(conversationId)
        ? prev.filter((id) => id !== conversationId)
        : [...prev, conversationId]
      localStorage.setItem('chat-pinned-conversations', JSON.stringify(next))
      return next
    })
  }, [])

  // 获取当前供应商信息
  const currentProvider = useMemo(() => {
    return providersData?.find((p) => p.provider === selectedProvider)
  }, [providersData, selectedProvider])

  // 处理供应商切换
  const handleProviderChange = useCallback(
    (provider: string) => {
      setSelectedProvider(provider)
      const providerData = providersData?.find((p) => p.provider === provider)
      if (providerData) {
        setSelectedModel(providerData.defaultModel)
      }
    },
    [providersData]
  )

  // 渲染消息
  const renderMessage = useCallback(
    (message: ChatMessage) => {
      const blocks = parseThinkBlocks(message.content)
      const isUser = message.role === 'user'

      return (
        <div
          key={message.id}
          className={cn(
            'flex gap-3 group',
            isUser ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <div
            className={cn(
              'max-w-[80%] rounded-lg p-3',
              isUser
                ? 'bg-blue-600 text-white'
                : 'bg-muted border border-border'
            )}
          >
            {blocks.map((block, idx) =>
              block.type === 'think' ? (
                <div key={block.id || idx} className="mb-2">
                  <button
                    onClick={() => toggleThinkBlock(block.id!)}
                    className="flex w-full items-center justify-between rounded bg-muted/50 px-2 py-1 text-xs font-medium hover:bg-muted"
                  >
                    <span>思考过程</span>
                    {expandedThinkBlocks.has(block.id!) ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                  {expandedThinkBlocks.has(block.id!) && (
                    <div className="mt-1 rounded bg-muted/30 p-2 text-xs">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {block.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ) : (
                <div key={idx} className="prose prose-sm max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={markdownComponents}
                  >
                    {block.content}
                  </ReactMarkdown>
                </div>
              )
            )}

            {/* 元数据 */}
            {message.metadata && (
              <div className="mt-2 rounded-md border border-border bg-muted/30 p-2 text-xs">
                <div className="mb-1 font-medium text-muted-foreground">
                  附加元数据
                </div>
                <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {JSON.stringify(message.metadata, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopyMessage(message.content)}
            >
              <Copy className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDeleteMessage(message.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )
    },
    [
      expandedThinkBlocks,
      toggleThinkBlock,
      handleCopyMessage,
      handleDeleteMessage,
    ]
  )

  if (providersLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 主对话区域 */}
      <div className="flex flex-1 flex-col">
        {/* 顶部工具栏 */}
        <div className="border-b border-border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* 供应商选择 */}
              <select
                value={selectedProvider}
                onChange={(e) => handleProviderChange(e.target.value)}
                className="rounded-md border border-border px-3 py-2"
              >
                {providersData?.map((p) => (
                  <option key={p.provider} value={p.provider}>
                    {p.label} {!p.isConfigured && '(未配置)'}
                  </option>
                ))}
              </select>

              {/* 模型选择 */}
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="rounded-md border border-border px-3 py-2"
              >
                {currentProvider?.models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              {/* Web搜索开关 */}
              {currentProvider?.supportsWebSearch && (
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enableWebSearch}
                    onCheckedChange={setEnableWebSearch}
                  />
                  <span className="text-sm">联网搜索</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleNewConversation}>
                <Plus className="h-4 w-4" />
                新对话
              </Button>
              <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
                <PanelRightOpen className="h-4 w-4" />
                历史
              </Button>
            </div>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((message) => renderMessage(message))}
            {sendMessageMutation.isPending && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                AI正在思考...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入框 */}
        <div className="border-t border-border bg-white p-4">
          <div className="mx-auto max-w-3xl">
            <div className="flex gap-2">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder="输入消息... (Shift+Enter换行)"
                className="min-h-[60px] resize-none"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || sendMessageMutation.isPending}
              >
                发送
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 历史对话抽屉 */}
      {isHistoryOpen && (
        <div className="w-80 border-l border-border bg-white">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-semibold">历史对话</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHistoryOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="h-[calc(100vh-73px)] overflow-y-auto p-2">
            {!conversationsData || conversationsData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                暂无历史对话
              </div>
            ) : (
              conversationsData.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'mb-2 cursor-pointer rounded-lg border p-3 hover:bg-muted transition-colors',
                  currentConversationId === conv.id && 'bg-blue-50 border-blue-300'
                )}
                onClick={() => void loadConversation(conv.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {truncatePreview(conv.firstMessagePreview)}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {conv.provider} · {conv.model}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {conv.messageCount} 条消息
                    </div>
                    {currentConversationId === conv.id && (
                      <div className="mt-1 text-xs text-blue-600 font-medium">
                        当前对话
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePin(conv.id)
                      }}
                    >
                      <Pin
                        className={cn(
                          'h-3 w-3',
                          pinnedConversations.includes(conv.id) && 'fill-current text-blue-600'
                        )}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteConversation(conv.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 设置对话框 */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>对话设置</DialogTitle>
            <DialogDescription>配置系统提示词和其他选项</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">
                系统提示词
              </label>
              <Textarea
                value={systemInstruction}
                onChange={(e) => setSystemInstruction(e.target.value)}
                placeholder="例如：你是一个专业的技术助手..."
                className="min-h-[100px]"
              />
            </div>
            {currentProvider?.supportsWebSearch && (
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">启用联网搜索</label>
                <Switch
                  checked={enableWebSearch}
                  onCheckedChange={setEnableWebSearch}
                />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
