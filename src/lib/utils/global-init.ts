/**
 * 进程级别的全局初始化管理器
 * 使用Node.js真正的全局对象来防止重复初始化
 */

import { Logger } from './logger'

// 定义全局状态类型
interface GlobalServiceState {
  doubaoVoice: {
    initialized: boolean
    initializing: boolean
    appKey?: string
    accessKey?: string
    endpoint?: string
  }
  contentDownloader: {
    initialized: boolean
    initializing: boolean
    ytDlpPath?: string
    ffmpegPath?: string
  }
  taskProcessor: {
    initialized: boolean
    initializing: boolean
  }
  metadataScraper: {
    initialized: boolean
    initializing: boolean
  }
  app: {
    initialized: boolean
    initializing: boolean
  }
}

// 在全局对象上定义状态
declare global {
  var __YT_DLP_SERVICE_STATE: GlobalServiceState | undefined
}

// 初始化全局状态（只在第一次访问时创建）
function getGlobalState(): GlobalServiceState {
  if (!global.__YT_DLP_SERVICE_STATE) {
    Logger.debug('🔧 初始化全局服务状态')
    global.__YT_DLP_SERVICE_STATE = {
      doubaoVoice: { initialized: false, initializing: false },
      contentDownloader: { initialized: false, initializing: false },
      taskProcessor: { initialized: false, initializing: false },
      metadataScraper: { initialized: false, initializing: false },
      app: { initialized: false, initializing: false }
    }
  }
  return global.__YT_DLP_SERVICE_STATE
}

// 原子操作：尝试设置初始化状态
function trySetInitializing(service: keyof GlobalServiceState): boolean {
  const state = getGlobalState()
  const serviceState = state[service]
  
  // 如果已经初始化完成，直接返回false
  if (serviceState.initialized) {
    Logger.debug(`🟢 ${service} 已初始化，跳过`)
    return false
  }
  
  // 如果正在初始化，返回false
  if (serviceState.initializing) {
    Logger.debug(`🟡 ${service} 正在初始化中，跳过`)
    return false
  }
  
  // 设置为正在初始化
  serviceState.initializing = true
  Logger.debug(`🔴 ${service} 开始初始化`)
  return true
}

// 完成初始化
function setInitialized(service: keyof GlobalServiceState, data?: any): void {
  const state = getGlobalState()
  const serviceState = state[service]
  
  serviceState.initialized = true
  serviceState.initializing = false
  
  // 保存额外数据
  if (data && service === 'contentDownloader') {
    const downloaderState = state.contentDownloader
    downloaderState.ytDlpPath = data.ytDlpPath
    downloaderState.ffmpegPath = data.ffmpegPath
  } else if (data && service === 'doubaoVoice') {
    const voiceState = state.doubaoVoice
    voiceState.appKey = data.appKey
    voiceState.accessKey = data.accessKey
    voiceState.endpoint = data.endpoint
  }
  
  Logger.debug(`✅ ${service} 初始化完成`)
}

// 初始化失败时清理状态
function setInitializationFailed(service: keyof GlobalServiceState): void {
  const state = getGlobalState()
  state[service].initializing = false
  Logger.debug(`❌ ${service} 初始化失败`)
}

// 检查是否已初始化
function isInitialized(service: keyof GlobalServiceState): boolean {
  return getGlobalState()[service].initialized
}

// 获取保存的数据
function getSavedData(service: 'contentDownloader'): { ytDlpPath?: string; ffmpegPath?: string } | undefined
function getSavedData(service: 'doubaoVoice'): { appKey?: string; accessKey?: string; endpoint?: string } | undefined
function getSavedData(service: keyof GlobalServiceState): any {
  return getGlobalState()[service]
}

// 等待初始化完成
async function waitForInitialization(service: keyof GlobalServiceState, timeoutMs = 30000): Promise<boolean> {
  const state = getGlobalState()
  const startTime = Date.now()
  
  while (state[service].initializing && (Date.now() - startTime) < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  
  return state[service].initialized
}

export const GlobalInit = {
  // DoubaoVoice相关
  tryInitializeDoubaoVoice: () => trySetInitializing('doubaoVoice'),
  setDoubaoVoiceInitialized: (data?: { appKey: string; accessKey: string; endpoint: string }) => 
    setInitialized('doubaoVoice', data),
  setDoubaoVoiceInitializationFailed: () => setInitializationFailed('doubaoVoice'),
  isDoubaoVoiceInitialized: () => isInitialized('doubaoVoice'),
  getDoubaoVoiceData: () => getSavedData('doubaoVoice'),
  waitForDoubaoVoice: (timeout?: number) => waitForInitialization('doubaoVoice', timeout),
  
  // ContentDownloader相关
  tryInitializeContentDownloader: () => trySetInitializing('contentDownloader'),
  setContentDownloaderInitialized: (data?: { ytDlpPath: string; ffmpegPath: string }) => 
    setInitialized('contentDownloader', data),
  setContentDownloaderInitializationFailed: () => setInitializationFailed('contentDownloader'),
  isContentDownloaderInitialized: () => isInitialized('contentDownloader'),
  getContentDownloaderData: () => getSavedData('contentDownloader'),
  waitForContentDownloader: (timeout?: number) => waitForInitialization('contentDownloader', timeout),
  
  // TaskProcessor相关
  tryInitializeTaskProcessor: () => trySetInitializing('taskProcessor'),
  setTaskProcessorInitialized: () => setInitialized('taskProcessor'),
  setTaskProcessorInitializationFailed: () => setInitializationFailed('taskProcessor'),
  isTaskProcessorInitialized: () => isInitialized('taskProcessor'),
  waitForTaskProcessor: (timeout?: number) => waitForInitialization('taskProcessor', timeout),
  
  // MetadataScraper相关
  tryInitializeMetadataScraper: () => trySetInitializing('metadataScraper'),
  setMetadataScraperInitialized: () => setInitialized('metadataScraper'),
  setMetadataScraperInitializationFailed: () => setInitializationFailed('metadataScraper'),
  isMetadataScraperInitialized: () => isInitialized('metadataScraper'),
  waitForMetadataScraper: (timeout?: number) => waitForInitialization('metadataScraper', timeout),
  
  // App相关
  tryInitializeApp: () => trySetInitializing('app'),
  setAppInitialized: () => setInitialized('app'),
  setAppInitializationFailed: () => setInitializationFailed('app'),
  isAppInitialized: () => isInitialized('app'),
  waitForApp: (timeout?: number) => waitForInitialization('app', timeout),
  
  // 重置状态（仅用于测试）
  reset: () => {
    if (global.__YT_DLP_SERVICE_STATE) {
      delete global.__YT_DLP_SERVICE_STATE
    }
  }
} 