/**
 * 镜头制作 Tab 组件
 * 核心功能: 创建镜头、添加角色、生成AI首帧和动画
 */

import { useState, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  User,
  Image as ImageIcon,
  Film as FilmIcon,
  Music as MusicIcon,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Download,
  Upload,
  Copy,
  X,
  ChevronRight,
  Eye,
  CloudUpload,
  FileImage,
  ChevronLeft,
  FastForward,
  Rewind,
  UserCircle,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/components/providers/trpc-provider";
import { ShotAIGenerationPanel, type ShotAIGenerationPanelRef } from "./ShotAIGenerationPanel";
import { ShotTaskHistory } from "./ShotTaskHistory";
import { toast } from "~/components/ui/toast";

type Props = {
  episodeId: string;
  episodeType: string; // TYPE01 | TYPE02
  projectId: string;
  shots: any[];
  characters: any[];
  setting: any;
  objective?: string | null;
  onRefresh?: () => void;
};

export function ShotsTab({
  episodeId,
  episodeType,
  projectId,
  shots,
  characters,
  setting,
  objective,
  onRefresh,
}: Props) {
  const [expandedShot, setExpandedShot] = useState<string | null>(null);
  const [showAddCharacterDialog, setShowAddCharacterDialog] = useState<
    string | null
  >(null);
  const [syncMessage, setSyncMessage] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showTTSLanguageMenu, setShowTTSLanguageMenu] = useState(false);
  const [showAudioExtendMenu, setShowAudioExtendMenu] = useState(false);

  // Ref to access ShotAIGenerationPanel methods
  const shotAIGenerationPanelRef = useRef<ShotAIGenerationPanelRef>(null);

  // 数字人任务轮询 - 检查是否有正在处理的任务，每30秒刷新一次
  useEffect(() => {
    const hasProcessingDigitalHuman = shots.some((shot) => {
      const latestTask = shot.digitalHumanTasks?.[0];
      return latestTask && [
        'UPLOADING_ASSETS',
        'FACE_RECOGNITION_SUBMITTED',
        'FACE_RECOGNITION_PROCESSING',
        'FACE_RECOGNITION_COMPLETED',
        'SUBJECT_DETECTION_COMPLETED',
        'AWAITING_SUBJECT_SELECTION',
        'VIDEO_GENERATION_SUBMITTED',
        'VIDEO_GENERATION_PROCESSING',
      ].includes(latestTask.stage);
    });

    if (!hasProcessingDigitalHuman) return;

    const timer = setInterval(() => {
      onRefresh?.();
    }, 30000); // 30秒

    return () => clearInterval(timer);
  }, [shots, onRefresh]);

  // Mutations
  const createShotMutation = api.studio.createShot.useMutation({
    onSuccess: () => onRefresh?.(),
  });

  const updateShotMutation = api.studio.updateShot.useMutation({
    onSuccess: () => onRefresh?.(),
  });

  const deleteShotMutation = api.studio.deleteShot.useMutation({
    onSuccess: () => onRefresh?.(),
  });

  const addCharacterMutation = api.studio.addCharacterToShot.useMutation({
    onSuccess: () => {
      setShowAddCharacterDialog(null);
      onRefresh?.();
    },
  });

  const removeCharacterMutation =
    api.studio.removeCharacterFromShot.useMutation({
      onSuccess: () => onRefresh?.(),
    });

  const updateShotCharacterMutation =
    api.studio.updateShotCharacter.useMutation({
      onSuccess: () => onRefresh?.(),
    });

  const syncShotsMutation = api.studio.syncShotsFromObjective.useMutation({
    onSuccess: (data) => {
      console.log("[ShotsTab] Sync success:", data);
      setSyncMessage({
        type: "success",
        message: `同步成功！新建 ${data.created} 个镜头，更新 ${data.updated} 个镜头`,
      });
      setTimeout(() => setSyncMessage(null), 5000);
      onRefresh?.();
    },
    onError: (error) => {
      console.error("[ShotsTab] Sync error:", error);
      setSyncMessage({
        type: "error",
        message: `同步失败: ${error.message}`,
      });
      setTimeout(() => setSyncMessage(null), 5000);
    },
  });

  const batchGenerateTTSMutation = api.studio.batchGenerateTTS.useMutation({
    onSuccess: (data) => {
      console.log("[ShotsTab] TTS batch generation success:", data);
      toast.success(data.message);
      setShowTTSLanguageMenu(false);
      onRefresh?.();
    },
    onError: (error) => {
      console.error("[ShotsTab] TTS batch generation error:", error);
      toast.error(`TTS生成失败: ${error.message}`);
      setShowTTSLanguageMenu(false);
    },
  });

  const batchExtendAudioMutation = api.studio.batchExtendAudio.useMutation({
    onSuccess: (data) => {
      console.log("[ShotsTab] Audio extension success:", data);
      toast.success(data.message);
      setShowAudioExtendMenu(false);
      onRefresh?.();
    },
    onError: (error) => {
      console.error("[ShotsTab] Audio extension error:", error);
      toast.error(`音频扩展失败: ${error.message}`);
      setShowAudioExtendMenu(false);
    },
  });

  const cleanExtendedAudioMutation = api.studio.cleanExtendedAudio.useMutation({
    onSuccess: (data) => {
      console.log("[ShotsTab] Clean extended audio success:", data);
      toast.success(data.message);
      onRefresh?.();
    },
    onError: (error) => {
      console.error("[ShotsTab] Clean extended audio error:", error);
      toast.error(`清理失败: ${error.message}`);
    },
  });

  const handleCreateShot = () => {
    createShotMutation.mutate({
      episodeId,
      name: `镜头 ${shots.length + 1}`,
    });
  };

  const handleDeleteShot = (shotId: string, shotName: string) => {
    if (!confirm(`确定删除"${shotName}"吗?`)) return;
    deleteShotMutation.mutate({ shotId });
  };

  const handleAddCharacter = (shotId: string, characterId: string) => {
    addCharacterMutation.mutate({
      shotId,
      characterId,
    });
  };

  const handleSyncFromObjective = () => {
    if (!confirm("从目标同步镜头会创建或更新镜头数据，确定继续吗？")) return;
    syncShotsMutation.mutate({ episodeId });
  };

  const handleBatchGenerateTTS = (language: 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de') => {
    if (!confirm(`确定要为所有镜头生成${getLanguageName(language)}语音吗？这会为每个有台词的角色创建TTS任��。`)) return;
    batchGenerateTTSMutation.mutate({ episodeId, language });
  };

  const handleBatchExtendAudio = (duration: number = 2) => {
    if (!confirm(`确定要扩展所有镜头的音频吗？这会为每个有音频的镜头前后各增加${duration}秒静音。已经扩展过的音频会被跳过。`)) return;
    batchExtendAudioMutation.mutate({
      episodeId,
      prefixDuration: duration,
      suffixDuration: duration
    });
  };

  const handleCleanExtendedAudio = () => {
    if (!confirm(`确定要清理所有扩展的音频文件吗？这会删除所有扩展音频文件和数据库记录。`)) return;
    cleanExtendedAudioMutation.mutate({ episodeId });
  };

  const getLanguageName = (lang: string) => {
    const names: Record<string, string> = {
      en: '英语',
      zh: '中文',
      ja: '日语',
      ko: '韩语',
      es: '西班牙语',
      fr: '法语',
      de: '德语',
    };
    return names[lang] || lang;
  };

  // 构建完整 Prompt
  const buildPrompt = (shot: any) => {
    // TYPE03: 对话为主v2.0
    if (episodeType === 'TYPE03') {
      // 从 objective 提取 styleSettings
      let styleSettings = '';
      if (objective) {
        try {
          const extractJsonFromString = (str: string): string => {
            const firstBrace = str.indexOf('{');
            const lastBrace = str.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
              return str;
            }
            return str.substring(firstBrace, lastBrace + 1);
          };
          const jsonStr = extractJsonFromString(objective);
          const data = JSON.parse(jsonStr);
          styleSettings = data.styleSettings || '';
        } catch (e) {
          console.error('解析 objective 失败:', e);
        }
      }

      const parts = [
        styleSettings,
        shot.framing,
        shot.cameraMovement,
        shot.bodyOrientation,
        shot.faceDirection,
        shot.expression,
        shot.action,
        shot.dialogue ? `说"${shot.dialogue}"` : '',
      ].filter(Boolean);

      return parts.join('\n');
    }

    // TYPE02: 故事短片模式
    if (episodeType === 'TYPE02') {
      // 从 objective 提取 styleSettings
      let styleSettings = '';
      if (objective) {
        try {
          const extractJsonFromString = (str: string): string => {
            const firstBrace = str.indexOf('{');
            const lastBrace = str.lastIndexOf('}');
            if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
              return str;
            }
            return str.substring(firstBrace, lastBrace + 1);
          };
          const jsonStr = extractJsonFromString(objective);
          const data = JSON.parse(jsonStr);
          styleSettings = data.styleSettings || '';
        } catch (e) {
          console.error('解析 objective 失败:', e);
        }
      }

      // 获取主要角色名称
      const mainCharacterName = shot.characters?.[0]?.character?.name || '';

      const parts = [
        styleSettings,
        shot.shotSizeView,
        shot.settingBackground,
        shot.compositionPosition,
        mainCharacterName,
        shot.poseExpressionCostume,
      ].filter(Boolean);

      return parts.join(' ');
    }

    // TYPE01: 对话为主模式（原有逻辑）
    const parts: string[] = [];

    shot.characters?.forEach((sc: any) => {
      const characterParts: string[] = [];

      // 1. 当前镜头动作
      if (sc.action) {
        characterParts.push(sc.action);
      }

      // 2. 台词（如果有）
      if (sc.dialogue) {
        characterParts.push(`说"${sc.dialogue}"`);
      }

      // 不使用逗号分隔，直接拼接
      if (characterParts.length > 0) {
        parts.push(characterParts.join(""));
      }
    });

    return parts.join(" ");
  };

  // 解析目标确定中的完整场景描述
  const getFullSceneDescription = () => {
    if (!objective) {
      console.log("[ShotsTab] 没有 objective 数据");
      return null;
    }

    try {
      // 提取 JSON（从第一个 { 到最后一个 }）
      const extractJsonFromString = (str: string): string => {
        const firstBrace = str.indexOf("{");
        const lastBrace = str.lastIndexOf("}");
        if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) {
          return str;
        }
        return str.substring(firstBrace, lastBrace + 1);
      };

      const jsonStr =
        typeof objective === "string"
          ? extractJsonFromString(objective)
          : objective;
      const objectiveData =
        typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;

      console.log("[ShotsTab] 解析后的 objective:", objectiveData);

      // 从目标确定的数据结构中提取完整场景描述
      if (
        objectiveData.characters &&
        objectiveData.characters.length > 0 &&
        objectiveData.styleSettings
      ) {
        const descriptions = objectiveData.characters.map((char: any) => {
          const compositeParts = [
            objectiveData.styleSettings,
            "角色",
            char.appearance,
            char.environment,
            "摄像机拍摄微微侧面",
          ];
          return {
            characterName: char.name,
            description: compositeParts.filter(Boolean).join(" "),
          };
        });
        console.log("[ShotsTab] 生成的场景描述:", descriptions);
        return descriptions;
      } else {
        console.log("[ShotsTab] objective 缺少必要字段:", {
          hasCharacters: !!objectiveData.characters,
          charactersLength: objectiveData.characters?.length,
          hasStyleSettings: !!objectiveData.styleSettings,
        });
      }
    } catch (e) {
      console.error("[ShotsTab] 解析 objective 失败:", e);
    }
    return null;
  };

  const sceneDescriptions = getFullSceneDescription();

  return (
    <div className="flex flex-col lg:flex-row gap-2 h-full">
      {/* 左侧：镜头列表 */}
      <div className="w-full lg:w-1/2 xl:flex-1 flex flex-col space-y-2 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden">
        {/* 按钮操作区域 */}
        <div className="flex flex-wrap gap-1">
          <Button
            onClick={handleSyncFromObjective}
            variant="outline"
            size="sm"
            className="gap-1"
            disabled={syncShotsMutation.isPending}
          >
            <RefreshCw className="h-3 w-3" />
            {syncShotsMutation.isPending ? "同步中..." : "同步"}
          </Button>

          <Button
            onClick={handleCreateShot}
            size="sm"
            className="gap-1"
            disabled={createShotMutation.isPending}
          >
            <Plus className="h-3 w-3" />
            添加
          </Button>

          {shots.length > 0 && (
            <>
              <Button
                onClick={() => {
                  const currentIndex = shots.findIndex(s => s.id === expandedShot);
                  if (currentIndex === -1) return;

                  const currentShot = shots[currentIndex];
                  const currentCharacterIds = new Set(
                    currentShot?.characters?.map((sc: any) => sc.character.id) || []
                  );

                  // 找到最近的前一个有相同演员的镜头
                  for (let i = currentIndex - 1; i >= 0; i--) {
                    const shot = shots[i];
                    const shotCharacterIds = shot?.characters?.map((sc: any) => sc.character.id) || [];
                    const hasCommonCharacter = shotCharacterIds.some((id: string) => currentCharacterIds.has(id));

                    if (hasCommonCharacter) {
                      setExpandedShot(shot.id);
                      return;
                    }
                  }
                  toast.info('前面没有相同演员的镜头');
                }}
                disabled={!expandedShot}
                variant="outline"
                size="sm"
                className="gap-1"
                title="跳转到前一个有相同演员的镜头"
              >
                <Rewind className="h-3 w-3" />
                连前
              </Button>
              <Button
                onClick={() => {
                  const currentIndex = shots.findIndex(s => s.id === expandedShot);
                  if (currentIndex > 0) {
                    setExpandedShot(shots[currentIndex - 1].id);
                  } else if (currentIndex === -1 && shots.length > 0) {
                    setExpandedShot(shots[0].id);
                  }
                }}
                disabled={!expandedShot || shots.findIndex(s => s.id === expandedShot) === 0}
                variant="outline"
                size="sm"
                className="gap-1"
                title="前镜头"
              >
                <ChevronLeft className="h-3 w-3" />
                前
              </Button>
              <Button
                onClick={() => {
                  const currentIndex = shots.findIndex(s => s.id === expandedShot);
                  if (currentIndex >= 0 && currentIndex < shots.length - 1) {
                    setExpandedShot(shots[currentIndex + 1].id);
                  } else if (currentIndex === -1 && shots.length > 0) {
                    setExpandedShot(shots[0].id);
                  }
                }}
                disabled={!expandedShot || shots.findIndex(s => s.id === expandedShot) === shots.length - 1}
                variant="outline"
                size="sm"
                className="gap-1"
                title="后镜头"
              >
                后
                <ChevronRight className="h-3 w-3" />
              </Button>
              <Button
                onClick={() => {
                  const currentIndex = shots.findIndex(s => s.id === expandedShot);
                  if (currentIndex === -1) return;

                  const currentShot = shots[currentIndex];
                  const currentCharacterIds = new Set(
                    currentShot?.characters?.map((sc: any) => sc.character.id) || []
                  );

                  // 找到最近的后一个有相同演员的镜头
                  for (let i = currentIndex + 1; i < shots.length; i++) {
                    const shot = shots[i];
                    const shotCharacterIds = shot?.characters?.map((sc: any) => sc.character.id) || [];
                    const hasCommonCharacter = shotCharacterIds.some((id: string) => currentCharacterIds.has(id));

                    if (hasCommonCharacter) {
                      setExpandedShot(shot.id);
                      return;
                    }
                  }
                  toast.info('后面没有相同演员的镜头');
                }}
                disabled={!expandedShot}
                variant="outline"
                size="sm"
                className="gap-1"
                title="跳转到后一个有相同演员的镜头"
              >
                <FastForward className="h-3 w-3" />
                连后
              </Button>
            </>
          )}
        </div>

        {/* 同步提示消息 */}
        {syncMessage && (
          <div
            className={`rounded-md border p-2 text-xs ${
              syncMessage.type === "success"
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {syncMessage.type === "success" ? "✓" : "✗"} {syncMessage.message}
          </div>
        )}

        {/* 角色提示 */}
        {characters.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
            ⚠️ 还没有角色。请先在"背景设定"tab中创建或导入角色。
          </div>
        )}

        {/* 镜头列表 */}
        <div className="space-y-2">
          {shots.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
              episodeType={episodeType}
              characters={characters}
              isExpanded={expandedShot === shot.id}
              onToggleExpand={() =>
                setExpandedShot(expandedShot === shot.id ? null : shot.id)
              }
              onUpdate={(data) =>
                updateShotMutation.mutate({ shotId: shot.id, ...data })
              }
              onDelete={() =>
                handleDeleteShot(
                  shot.id,
                  shot.name || `镜头 #${shot.shotNumber}`,
                )
              }
              onAddCharacter={(charId) => handleAddCharacter(shot.id, charId)}
              onRemoveCharacter={(scId) =>
                removeCharacterMutation.mutate({ shotCharacterId: scId })
              }
              onUpdateShotCharacter={(scId, data) =>
                updateShotCharacterMutation.mutate({
                  shotCharacterId: scId,
                  ...data,
                })
              }
              fullPrompt={buildPrompt(shot)}
              setting={setting}
              shotAIGenerationPanelRef={shotAIGenerationPanelRef}
              onRefresh={onRefresh}
            />
          ))}

          {shots.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FilmIcon className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">还没有镜头</p>
              <p className="text-sm mb-4">开始创建第一个镜头</p>
              <Button onClick={handleCreateShot} className="gap-2">
                <Plus className="h-4 w-4" />
                添加镜头
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 中间：AI生成区域 */}
      <div className="w-full lg:w-1/2 xl:flex-1 pl-2 overflow-y-auto [&::-webkit-scrollbar]:hidden xl:pr-2">
        <div className="space-y-4 xl:[&>*:last-child]:hidden">
          {/* TTS按钮组和演员列表 */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* TYPE01 和 TYPE03: 一键TTS按钮组 */}
            {(episodeType === 'TYPE01' || episodeType === 'TYPE03') && (
              <>
                <div className="relative">
                  <div className="flex">
                    <Button
                      onClick={() => handleBatchGenerateTTS('en')}
                      variant="default"
                      size="sm"
                      className="gap-2 rounded-r-none"
                      disabled={batchGenerateTTSMutation.isPending || shots.length === 0}
                    >
                      <MusicIcon className="h-4 w-4" />
                      {batchGenerateTTSMutation.isPending ? "生成中..." : "TTS"}
                    </Button>
                    <Button
                      onClick={() => setShowTTSLanguageMenu(!showTTSLanguageMenu)}
                      variant="default"
                      size="sm"
                      className="px-2 rounded-l-none border-l border-white/20"
                      disabled={batchGenerateTTSMutation.isPending || shots.length === 0}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 语言选择下拉菜单 */}
                  {showTTSLanguageMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 min-w-[120px]">
                      {[
                        { code: 'en', name: '英语' },
                        { code: 'zh', name: '中文' },
                        { code: 'ja', name: '日语' },
                        { code: 'ko', name: '韩语' },
                        { code: 'es', name: '西班牙语' },
                        { code: 'fr', name: '法语' },
                        { code: 'de', name: '德语' },
                      ].map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => handleBatchGenerateTTS(lang.code as any)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                        >
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 音频扩展按钮组 */}
                <div className="relative">
                  <div className="flex">
                    <Button
                      onClick={() => handleBatchExtendAudio(2)}
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-r-none"
                      disabled={batchExtendAudioMutation.isPending || shots.length === 0}
                    >
                      <MusicIcon className="h-4 w-4" />
                      {batchExtendAudioMutation.isPending ? "扩展中..." : "扩音频"}
                    </Button>
                    <Button
                      onClick={() => setShowAudioExtendMenu(!showAudioExtendMenu)}
                      variant="outline"
                      size="sm"
                      className="px-2 rounded-l-none border-l border-gray-300"
                      disabled={batchExtendAudioMutation.isPending || shots.length === 0}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 扩展时长选择下拉菜单 */}
                  {showAudioExtendMenu && (
                    <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1 min-w-[120px]">
                      {[
                        { duration: 0.5, label: '0.5秒' },
                        { duration: 1, label: '1秒' },
                        { duration: 1.5, label: '1.5秒' },
                        { duration: 2, label: '2秒' },
                        { duration: 2.5, label: '2.5秒' },
                        { duration: 3, label: '3秒' },
                      ].map((option) => (
                        <button
                          key={option.duration}
                          onClick={() => handleBatchExtendAudio(option.duration)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleCleanExtendedAudio}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={cleanExtendedAudioMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  删音频
                </Button>
              </>
            )}

            {/* 演员列表 - 直接展示，与按钮同行 */}
            {characters.length > 0 && (
              <>
                {characters.map((char: any) => (
                  <div
                    key={char.id}
                    className="flex items-center gap-1.5 bg-white rounded-full pl-0.5 pr-2 py-0.5 border border-gray-300"
                  >
                    <button
                      onClick={() => {
                        if (char.referenceImage && shotAIGenerationPanelRef.current) {
                          shotAIGenerationPanelRef.current.addReferenceImage(char.referenceImage);
                        } else if (!char.referenceImage) {
                          toast.error('该演员没有参考图');
                        } else {
                          toast.error('AI生成面板未就绪');
                        }
                      }}
                      className="h-6 w-6 rounded-full bg-purple-400 flex items-center justify-center flex-shrink-0 overflow-hidden hover:ring-2 hover:ring-purple-500 transition-all cursor-pointer"
                      title={char.referenceImage ? '点击添加到AI生成参考图' : '该演员没有参考图'}
                    >
                      {char.referenceImage ? (
                        <img
                          src={char.referenceImage}
                          alt={char.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-3 w-3 text-white" />
                      )}
                    </button>
                    <span className="text-xs font-medium text-gray-700">
                      {char.name}
                    </span>
                    {char.referenceImage && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(char.referenceImage);
                          toast.success("链接已复制");
                        }}
                        className="ml-0.5 text-blue-600 hover:text-blue-700"
                        title="复制形象参考图链接"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>

          <ShotAIGenerationPanel
            ref={shotAIGenerationPanelRef}
            shotId={expandedShot || ''}
            onTaskCreated={onRefresh}
            sceneDescriptions={sceneDescriptions}
            currentShot={shots.find(s => s.id === expandedShot)}
          />
        </div>
      </div>

      {/* 右侧：任务（仅在xl屏幕显示为第三列，固定宽度） */}
      <div className="hidden xl:block xl:w-[154px] xl:flex-shrink-0 pl-2 overflow-y-auto [&::-webkit-scrollbar]:hidden">
        <ShotTaskHistory
          shotId={expandedShot || ''}
          onRefreshShot={onRefresh}
          currentShot={shots.find(s => s.id === expandedShot)}
          onApplyTask={(task) => {
            if (shotAIGenerationPanelRef.current) {
              shotAIGenerationPanelRef.current.applyTask(task);
            } else {
              toast.error('AI生成面板未就绪');
            }
          }}
          onConvertToVideo={(imageUrl) => {
            if (shotAIGenerationPanelRef.current) {
              shotAIGenerationPanelRef.current.convertToVideo(imageUrl);
            } else {
              toast.error('AI生成面板未就绪');
            }
          }}
        />
      </div>
    </div>
  );
}

// 单个镜头卡片组件
function ShotCard({
  shot,
  episodeType,
  characters,
  isExpanded,
  onToggleExpand,
  onUpdate,
  onDelete,
  onAddCharacter,
  onRemoveCharacter,
  onUpdateShotCharacter,
  fullPrompt,
  setting,
  shotAIGenerationPanelRef,
  onRefresh,
}: {
  shot: any;
  episodeType: string;
  characters: any[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (data: any) => void;
  onDelete: () => void;
  onAddCharacter: (characterId: string) => void;
  onRemoveCharacter: (shotCharacterId: string) => void;
  onUpdateShotCharacter: (shotCharacterId: string, data: any) => void;
  fullPrompt: string;
  setting: any;
  shotAIGenerationPanelRef: React.RefObject<ShotAIGenerationPanelRef>;
  onRefresh?: () => void;
}) {
  const [showAddCharacter, setShowAddCharacter] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState("");
  const [showImageUrlInput, setShowImageUrlInput] = useState(false);
  const [showVideoUrlInput, setShowVideoUrlInput] = useState(false);
  const [showAudioUrlInput, setShowAudioUrlInput] = useState(false);
  const [imageUrl, setImageUrl] = useState(shot.scenePrompt || "");
  const [videoUrl, setVideoUrl] = useState(shot.actionPrompt || "");
  const [audioUrl, setAudioUrl] = useState(shot.cameraPrompt || "");
  const [previewMedia, setPreviewMedia] = useState<{
    type: "image" | "video" | "audio";
    url: string;
  } | null>(null);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const imageMenuRef = useRef<HTMLDivElement>(null);
  const [digitalHumanPolling, setDigitalHumanPolling] = useState(false);

  // 创建数字人任务 mutation
  const createDigitalHumanTaskMutation = api.studio.createShotDigitalHumanTask.useMutation({
    onSuccess: () => {
      toast.success("数字人任务已创建");
      setDigitalHumanPolling(true);
      // 触发父组件刷新以获取最新的任务状态
      onRefresh?.();
    },
    onError: (error) => {
      const errorMessage = error?.message || "创建失败，请重试";
      toast.error(`创建失败: ${errorMessage}`);
      console.error("数字人任务创建失败:", error);
    },
  });

  // 重试数字人任务 mutation
  const retryDigitalHumanTaskMutation = api.studio.retryDigitalHumanTask.useMutation({
    onSuccess: () => {
      toast.success("已开始重试任务");
      setDigitalHumanPolling(true);
      // 触发父组件刷新以获取最新的任务状态
      onRefresh?.();
    },
    onError: (error) => {
      const errorMessage = error?.message || "重试失败，请稍后再试";
      toast.error(`重试失败: ${errorMessage}`);
      console.error("数字人任务重试失败:", error);
    },
  });

  // 获取最新的数字人任务
  const latestDigitalHumanTask = shot.digitalHumanTasks?.[0];
  const isDigitalHumanProcessing = latestDigitalHumanTask && [
    'UPLOADING_ASSETS',
    'FACE_RECOGNITION_SUBMITTED',
    'FACE_RECOGNITION_PROCESSING',
    'FACE_RECOGNITION_COMPLETED',
    'SUBJECT_DETECTION_COMPLETED',
    'AWAITING_SUBJECT_SELECTION',
    'VIDEO_GENERATION_SUBMITTED',
    'VIDEO_GENERATION_PROCESSING',
  ].includes(latestDigitalHumanTask.stage);
  const isDigitalHumanCompleted = latestDigitalHumanTask?.stage === 'VIDEO_GENERATION_COMPLETED';
  const isDigitalHumanFailed = latestDigitalHumanTask?.stage === 'FAILED';

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (imageMenuRef.current && !imageMenuRef.current.contains(event.target as Node)) {
        setShowImageMenu(false);
      }
    };
    if (showImageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showImageMenu]);

  // 数字人任务轮询 - 每30秒
  // 注意：这里只是触发UI更新的标志，实际刷新由父组件的 refetchShots 处理
  useEffect(() => {
    if (!isDigitalHumanProcessing && !digitalHumanPolling) return;

    // 如果任务完成或失败，停止轮询
    if (isDigitalHumanCompleted || isDigitalHumanFailed) {
      setDigitalHumanPolling(false);
    }
  }, [isDigitalHumanProcessing, digitalHumanPolling, isDigitalHumanCompleted, isDigitalHumanFailed]);

  // 同步 shot 的 URL 到本地状态
  useEffect(() => {
    setImageUrl(shot.scenePrompt || "");
  }, [shot.scenePrompt]);

  useEffect(() => {
    setVideoUrl(shot.actionPrompt || "");
  }, [shot.actionPrompt]);

  useEffect(() => {
    setAudioUrl(shot.cameraPrompt || "");
  }, [shot.cameraPrompt]);

  // 查询可用的图像模型
  const { data: imageModels } = api.aiGeneration.listModels.useQuery({
    outputType: "IMAGE",
    isActive: true,
  });

  // 查询可用的视频模型
  const { data: videoModels } = api.aiGeneration.listModels.useQuery({
    outputType: "VIDEO",
    isActive: true,
  });

  const generateFrameMutation = api.studio.generateFrame.useMutation();

  const handleGenerateKeyframe = () => {
    if (!selectedModelId) {
      alert("请先选择图像生成模型");
      return;
    }

    generateFrameMutation.mutate({
      shotId: shot.id,
      type: "keyframe",
      modelId: selectedModelId,
      prompt: fullPrompt,
    });
  };

  const keyframes =
    shot.frames?.filter((f: any) => f.type === "keyframe") || [];
  const selectedKeyframe =
    keyframes.find((f: any) => f.isSelected) || keyframes[0];

  const handleSaveImageUrl = () => {
    onUpdate({ scenePrompt: imageUrl });
    setShowImageUrlInput(false);
  };

  const handleSaveVideoUrl = () => {
    onUpdate({ actionPrompt: videoUrl });
    setShowVideoUrlInput(false);
  };

  const handleSaveAudioUrl = () => {
    onUpdate({ cameraPrompt: audioUrl });
    setShowAudioUrlInput(false);
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("已复制到剪贴板");
  };

  const handleDownload = (url: string) => {
    window.open(url, "_blank");
  };

  const handleDelete = (type: "image" | "video" | "audio") => {
    if (!confirm("确定删除吗？")) return;
    if (type === "image") {
      setImageUrl("");
      onUpdate({ scenePrompt: "" });
    } else if (type === "video") {
      setVideoUrl("");
      onUpdate({ actionPrompt: "" });
    } else {
      setAudioUrl("");
      onUpdate({ cameraPrompt: "" });
    }
    setPreviewMedia(null);
  };

  // 处理数字人生成
  const handleDigitalHumanClick = () => {
    const hasFirstFrame = !!imageUrl;
    const hasAudio = !!audioUrl;

    if (!hasFirstFrame || !hasAudio) {
      return; // 按钮已禁用，不应该到这里
    }

    if (isDigitalHumanProcessing) {
      return; // 正在处理中，不做任何操作
    }

    if (isDigitalHumanCompleted && latestDigitalHumanTask?.resultVideoUrl) {
      // 已完成，打开新页面查看
      window.open(latestDigitalHumanTask.resultVideoUrl, '_blank');
      return;
    }

    // 弹出确认对话框
    if (confirm('是否生成数字人视频？')) {
      createDigitalHumanTaskMutation.mutate({
        shotId: shot.id,
        peFastMode: false,
      });
    }
  };

  // 处理数字人任务重试
  const handleDigitalHumanRetry = () => {
    if (!latestDigitalHumanTask) {
      return;
    }

    if (confirm(`是否重试此任务？\n\n错误信息: ${latestDigitalHumanTask.errorMessage || '未知错误'}`)) {
      retryDigitalHumanTaskMutation.mutate({
        taskId: latestDigitalHumanTask.id,
      });
    }
  };

  // 处理手动取回任务结果
  const handleDigitalHumanFetch = () => {
    if (!latestDigitalHumanTask) {
      return;
    }

    if (confirm('手动取回任务结果？\n\n这会尝试从即梦API获取最新的任务状态。')) {
      retryDigitalHumanTaskMutation.mutate({
        taskId: latestDigitalHumanTask.id,
      });
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="bg-gray-50 p-2 flex items-center justify-between cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-500 rounded flex items-center justify-center text-white font-bold text-xs">
            #{shot.shotNumber}
          </div>
          <div>
            <h3 className="font-medium text-sm">
              {shot.name || `镜头 ${shot.shotNumber}`}
            </h3>
            <p className="text-[10px] text-gray-500">
              {shot.characters?.length || 0} 个角色 · {(() => {
                // 计算该镜头所有关联任务的总成本
                let totalCost = (shot.generationTasks || []).reduce(
                  (sum: number, task: any) => sum + (task.costUSD || 0),
                  0
                );

                // 加入数字人任务成本：$0.2/秒，只要成功创建任务就计费
                const digitalHumanCost = (shot.digitalHumanTasks || []).reduce(
                  (sum: number, task: any) => {
                    // 只要有 duration（任务成功创建）就计费
                    if (!task.duration) {
                      return sum;
                    }
                    // 按 $0.2/秒 计费
                    return sum + (task.duration * 0.2);
                  },
                  0
                );

                totalCost += digitalHumanCost;
                return totalCost > 0 ? `$${totalCost.toFixed(4)}` : '无消耗';
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* 首帧按钮 */}
          <div className="relative" ref={imageMenuRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                console.log('首帧按钮点击', { imageUrl, showImageMenu });
                if (imageUrl) {
                  setShowImageMenu(!showImageMenu);
                } else {
                  setShowImageUrlInput(true);
                }
              }}
              className={`h-8 w-8 border rounded flex items-center justify-center transition-colors ${
                imageUrl
                  ? "border-green-500 bg-green-50 hover:bg-green-100"
                  : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
              }`}
              title={imageUrl ? "点击查看操作" : "添加首帧"}
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="首帧"
                  className="h-full w-full object-cover rounded"
                />
              ) : (
                <ImageIcon className="h-3 w-3 text-gray-400" />
              )}
            </button>

            {/* 首帧操作菜单 */}
            {showImageMenu && imageUrl && (
              <div className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[100] min-w-[140px] py-1"
                style={{
                  top: imageMenuRef.current ? imageMenuRef.current.getBoundingClientRect().bottom + 4 : 0,
                  left: imageMenuRef.current ? imageMenuRef.current.getBoundingClientRect().left : 0,
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewMedia({ type: "image", url: imageUrl });
                    setShowImageMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Eye className="h-3.5 w-3.5" />
                  查看
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (shotAIGenerationPanelRef.current) {
                      shotAIGenerationPanelRef.current.addReferenceImage(imageUrl);
                      toast.success('已添加到AI生成参考图');
                    } else {
                      toast.error('AI生成面板未就绪');
                    }
                    setShowImageMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-green-50 flex items-center gap-2"
                >
                  <FileImage className="h-3.5 w-3.5 text-green-600" />
                  <span className="font-bold text-green-600">作为参考</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(imageUrl);
                    toast.success('URL已复制');
                    setShowImageMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Copy className="h-3.5 w-3.5" />
                  复制URL
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // TODO: 实现转存S3功能
                    toast.info('转存S3功能开发中');
                    setShowImageMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <CloudUpload className="h-3.5 w-3.5" />
                  转存S3
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('确定要删除首帧吗？')) {
                      onUpdate({ scenePrompt: '' });
                      toast.success('首帧已删除');
                    }
                    setShowImageMenu(false);
                  }}
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </button>
              </div>
            )}
          </div>

          {/* 视频按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (videoUrl) {
                setPreviewMedia({ type: "video", url: videoUrl });
              } else {
                setShowVideoUrlInput(true);
              }
            }}
            className={`h-8 w-8 border rounded flex items-center justify-center transition-colors ${
              videoUrl
                ? "border-purple-500 bg-purple-50 hover:bg-purple-100"
                : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            }`}
            title={videoUrl ? "查看视频" : "添加视频"}
          >
            {videoUrl ? (
              <FilmIcon className="h-3 w-3 text-purple-600" />
            ) : (
              <FilmIcon className="h-3 w-3 text-gray-400" />
            )}
          </button>

          {/* 音频按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (audioUrl) {
                setPreviewMedia({ type: "audio", url: audioUrl });
              } else {
                setShowAudioUrlInput(true);
              }
            }}
            className={`h-8 w-8 border rounded flex items-center justify-center transition-colors ${
              audioUrl
                ? "border-orange-500 bg-orange-50 hover:bg-orange-100"
                : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            }`}
            title={audioUrl ? "查看音频" : "添加音频"}
          >
            {audioUrl ? (
              <MusicIcon className="h-3 w-3 text-orange-600" />
            ) : (
              <MusicIcon className="h-3 w-3 text-gray-400" />
            )}
          </button>

          {/* 数字人按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDigitalHumanClick();
            }}
            disabled={!imageUrl || !audioUrl}
            className={`h-8 w-8 border rounded flex items-center justify-center transition-colors relative ${
              !imageUrl || !audioUrl
                ? "border-gray-200 bg-gray-100 cursor-not-allowed"
                : isDigitalHumanCompleted
                ? "border-green-500 bg-green-50 hover:bg-green-100 cursor-pointer"
                : isDigitalHumanProcessing
                ? "border-blue-500 bg-blue-50"
                : isDigitalHumanFailed
                ? "border-red-500 bg-red-50 hover:bg-red-100 cursor-pointer"
                : "border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
            }`}
            title={
              !imageUrl || !audioUrl
                ? "需要首帧和音频"
                : isDigitalHumanCompleted
                ? "查看数字人视频"
                : isDigitalHumanProcessing
                ? "生成中..."
                : isDigitalHumanFailed
                ? `任务失败: ${latestDigitalHumanTask?.errorMessage || '未知错误'}`
                : "生成数字人"
            }
          >
            {isDigitalHumanProcessing ? (
              <Loader2 className="h-3 w-3 text-blue-600 animate-spin" />
            ) : isDigitalHumanCompleted ? (
              <CheckCircle className="h-3 w-3 text-green-600" />
            ) : isDigitalHumanFailed ? (
              <X className="h-3 w-3 text-red-600" />
            ) : (
              <UserCircle className={`h-3 w-3 ${!imageUrl || !audioUrl ? "text-gray-400" : "text-gray-600"}`} />
            )}
          </button>

          {/* 数字人重试/手动取回按钮 - 失败或处理中时显示 */}
          {(isDigitalHumanFailed || isDigitalHumanProcessing) && latestDigitalHumanTask && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isDigitalHumanFailed) {
                  handleDigitalHumanRetry();
                } else {
                  handleDigitalHumanFetch();
                }
              }}
              disabled={retryDigitalHumanTaskMutation.isPending}
              className={`h-8 w-8 border rounded flex items-center justify-center transition-colors cursor-pointer ${
                isDigitalHumanFailed
                  ? "border-orange-500 bg-orange-50 hover:bg-orange-100"
                  : "border-blue-500 bg-blue-50 hover:bg-blue-100"
              }`}
              title={isDigitalHumanFailed ? "重试任务" : "手动取回结果"}
            >
              {retryDigitalHumanTaskMutation.isPending ? (
                <Loader2 className={`h-3 w-3 animate-spin ${isDigitalHumanFailed ? "text-orange-600" : "text-blue-600"}`} />
              ) : isDigitalHumanFailed ? (
                <RefreshCw className="h-3 w-3 text-orange-600" />
              ) : (
                <Download className="h-3 w-3 text-blue-600" />
              )}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-50 rounded text-red-500"
          >
            <Trash2 className="h-3 w-3" />
          </button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-2 space-y-2">
          {/* TYPE02: 镜头字段编辑 */}
          {episodeType === 'TYPE02' && (
            <div className="space-y-2">
              {/* 景别与视角 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  景别与视角 (ShotSize & View)
                </label>
                <input
                  type="text"
                  defaultValue={shot.shotSizeView || ""}
                  onBlur={(e) =>
                    onUpdate({
                      shotSizeView: e.target.value,
                    })
                  }
                  placeholder="例如: 全景 (FS) / 跟踪镜头 (Tracking Shot)"
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 场景与背景 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  场景与背景 (Setting & Background)
                </label>
                <textarea
                  defaultValue={shot.settingBackground || ""}
                  onBlur={(e) =>
                    onUpdate({
                      settingBackground: e.target.value,
                    })
                  }
                  placeholder="例如: 繁忙的客机客舱内部，过道"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 构图与位置 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  构图与人物位置 (Composition & Position)
                </label>
                <textarea
                  defaultValue={shot.compositionPosition || ""}
                  onBlur={(e) =>
                    onUpdate({
                      compositionPosition: e.target.value,
                    })
                  }
                  placeholder="例如: Priya 腾空而起，双手抓住了客机收起的起落架轮胎"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 姿势表情服装 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  姿势表情与服装 (Pose, Expression & Costume)
                </label>
                <textarea
                  defaultValue={shot.poseExpressionCostume || ""}
                  onBlur={(e) =>
                    onUpdate({
                      poseExpressionCostume: e.target.value,
                    })
                  }
                  placeholder="例如: 奔跑，全身军装迷彩服，背部印有印度国旗"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 台词 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  台词 (可选)
                </label>
                <input
                  type="text"
                  defaultValue={shot.dialogue || ""}
                  onBlur={(e) =>
                    onUpdate({
                      dialogue: e.target.value,
                    })
                  }
                  placeholder="台词内容..."
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TYPE03: 对话为主v2.0 字段 */}
          {episodeType === 'TYPE03' && (
            <div className="space-y-3">
              {/* 第一行：景别 + 身体朝向 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    景别 (Framing)
                  </label>
                  <input
                    type="text"
                    defaultValue={shot.framing || ""}
                    onBlur={(e) =>
                      onUpdate({
                        framing: e.target.value,
                      })
                    }
                    placeholder="例如: 特写、近景、中景、全景"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    身体朝向 (Body Orientation)
                  </label>
                  <input
                    type="text"
                    defaultValue={shot.bodyOrientation || ""}
                    onBlur={(e) =>
                      onUpdate({
                        bodyOrientation: e.target.value,
                      })
                    }
                    placeholder="例如: 身体正对前方、身体稍朝右"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 第二行：面部和眼神朝向 + 镜头运动 */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    面部和眼神朝向 (Face Direction)
                  </label>
                  <input
                    type="text"
                    defaultValue={shot.faceDirection || ""}
                    onBlur={(e) =>
                      onUpdate({
                        faceDirection: e.target.value,
                      })
                    }
                    placeholder="例如: 面朝左前方，眼睛看着左前方"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-500 mb-1 block">
                    镜头运动 (Camera Movement)
                  </label>
                  <input
                    type="text"
                    defaultValue={shot.cameraMovement || ""}
                    onBlur={(e) =>
                      onUpdate({
                        cameraMovement: e.target.value,
                      })
                    }
                    placeholder="例如: 镜头静止、镜头缓慢推进"
                    className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* 表情描述 - 多行 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  表情描述 (Expression)
                </label>
                <textarea
                  defaultValue={shot.expression || ""}
                  onBlur={(e) =>
                    onUpdate({
                      expression: e.target.value,
                    })
                  }
                  placeholder="例如: 很高兴，显得很可爱"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 动作描述 - 多行 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  动作描述 (Action)
                </label>
                <textarea
                  defaultValue={shot.action || ""}
                  onBlur={(e) =>
                    onUpdate({
                      action: e.target.value,
                    })
                  }
                  placeholder="例如: 边说话边在键盘上打字"
                  rows={2}
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* 台词 - 单行 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  台词 (Dialogue)
                </label>
                <input
                  type="text"
                  defaultValue={shot.dialogue || ""}
                  onBlur={(e) =>
                    onUpdate({
                      dialogue: e.target.value,
                    })
                  }
                  placeholder="台词内容..."
                  className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TYPE01: 角色管理 */}
          {episodeType === 'TYPE01' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">角色与台词</h4>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowAddCharacter(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                添加角色
              </Button>
            </div>

            <div className="space-y-3">
              {shot.characters?.map((sc: any) => (
                <div
                  key={sc.id}
                  className="border border-gray-200 rounded-lg p-3 bg-white"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-full bg-purple-400 flex items-center justify-center text-white text-sm flex-shrink-0">
                      {sc.character.name[0]}
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="font-medium text-sm">
                        {sc.character.name}
                      </div>

                      {/* 动作输入框 */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          动作与表情
                          <Copy className="h-3 w-3 text-gray-400" />
                        </label>
                        <textarea
                          defaultValue={sc.action || ""}
                          onBlur={(e) =>
                            onUpdateShotCharacter(sc.id, {
                              action: e.target.value,
                            })
                          }
                          onClick={(e) => {
                            const text = (e.target as HTMLTextAreaElement)
                              .value;
                            if (text) {
                              navigator.clipboard.writeText(text);
                              toast.success("已复制动作与表情");
                            }
                          }}
                          placeholder="例如: 微笑着点头，双手放在柜台上（点击文本框复制）"
                          rows={2}
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none cursor-pointer hover:bg-blue-50 transition-colors"
                          title="点击复制内容"
                        />
                      </div>

                      {/* 台词输入框 */}
                      <div>
                        <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          台词
                          <Copy className="h-3 w-3 text-gray-400" />
                        </label>
                        <input
                          type="text"
                          defaultValue={sc.dialogue || ""}
                          onBlur={(e) =>
                            onUpdateShotCharacter(sc.id, {
                              dialogue: e.target.value,
                            })
                          }
                          onClick={(e) => {
                            const text = (e.target as HTMLInputElement).value;
                            if (text) {
                              navigator.clipboard.writeText(text);
                              toast.success("已复制台词");
                            }
                          }}
                          placeholder="角色台词...（点击文本框复制）"
                          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none cursor-pointer hover:bg-blue-50 transition-colors"
                          title="点击复制内容"
                        />
                      </div>
                    </div>
                    <button
                      onClick={() => onRemoveCharacter(sc.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              {shot.characters?.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm">
                  还没有添加角色
                </div>
              )}
            </div>

            {/* 添加角色对话框 */}
            {showAddCharacter && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full">
                  <h3 className="font-medium mb-4">选择角色</h3>
                  <div className="space-y-2 max-h-96 overflow-auto">
                    {characters.map((char) => (
                      <button
                        key={char.id}
                        onClick={() => {
                          onAddCharacter(char.id);
                          setShowAddCharacter(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 border rounded hover:bg-blue-50 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-purple-400 flex items-center justify-center text-white">
                          {char.name[0]}
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{char.name}</div>
                          <div className="text-sm text-gray-500">
                            {char.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddCharacter(false)}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
          )}

          {/* 完整 Prompt 预览 */}
          <PromptEditor
            shot={shot}
            fullPrompt={fullPrompt}
            onUpdate={onUpdate}
          />
        </div>
      )}

      {/* URL输入对话框 - 首帧 */}
      {showImageUrlInput && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowImageUrlInput(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium mb-4">添加首帧 URL</h3>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="请输入图片 URL"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowImageUrlInput(false)}
              >
                取消
              </Button>
              <Button onClick={handleSaveImageUrl}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* URL输入对话框 - 视频 */}
      {showVideoUrlInput && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowVideoUrlInput(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium mb-4">添加视频 URL</h3>
            <input
              type="text"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="请输入视频 URL"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowVideoUrlInput(false)}
              >
                取消
              </Button>
              <Button onClick={handleSaveVideoUrl}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* URL输入对话框 - 音频 */}
      {showAudioUrlInput && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAudioUrlInput(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-medium mb-4">添加音频 URL</h3>
            <input
              type="text"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              placeholder="请输入音频 URL"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAudioUrlInput(false)}
              >
                取消
              </Button>
              <Button onClick={handleSaveAudioUrl}>保存</Button>
            </div>
          </div>
        </div>
      )}

      {/* 媒体预览弹窗 */}
      {previewMedia && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-8"
          onClick={() => setPreviewMedia(null)}
        >
          <div
            className="bg-white rounded-lg max-w-6xl w-full max-h-full overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex">
              {/* 左侧预览区 */}
              <div className="flex-1 p-6 flex items-center justify-center bg-gray-100">
                {previewMedia.type === "image" ? (
                  <img
                    src={previewMedia.url}
                    alt="预览"
                    className="max-w-full max-h-[80vh] object-contain"
                  />
                ) : previewMedia.type === "video" ? (
                  <video
                    src={previewMedia.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-[80vh]"
                  />
                ) : (
                  <div className="w-full max-w-2xl">
                    <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-8 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
                          <MusicIcon className="h-8 w-8 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">音频播放</h3>
                          <p className="text-sm text-neutral-600">镜头音频文件</p>
                        </div>
                      </div>
                      <audio
                        src={previewMedia.url}
                        controls
                        autoPlay
                        className="w-full"
                        preload="metadata"
                      >
                        您的浏览器不支持音频播放
                      </audio>
                    </div>
                  </div>
                )}
              </div>

              {/* 右侧操作区 */}
              <div className="w-64 p-6 border-l bg-white flex flex-col gap-3">
                <h3 className="font-medium mb-2">操作</h3>

                {/* 下载 */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleDownload(previewMedia.url)}
                >
                  <Download className="h-4 w-4" />
                  下载
                </Button>

                {/* 下载扩展音频（仅当是音频且有扩展音频时显示） */}
                {previewMedia.type === "audio" && shot.extendedAudioUrl && (
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 bg-green-50 border-green-300 hover:bg-green-100"
                    onClick={() => handleDownload(shot.extendedAudioUrl!)}
                  >
                    <Download className="h-4 w-4" />
                    下载扩展音频 (+4s)
                  </Button>
                )}

                {/* 转存S3 */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => alert("转存S3功能待实现")}
                >
                  <Upload className="h-4 w-4" />
                  转存 S3
                </Button>

                {/* 复制地址 */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleCopyUrl(previewMedia.url)}
                >
                  <Copy className="h-4 w-4" />
                  复制地址
                </Button>

                {/* 删除 */}
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2 text-red-500 hover:text-red-700 hover:border-red-500"
                  onClick={() => handleDelete(previewMedia.type)}
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </Button>

                <div className="mt-auto pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setPreviewMedia(null)}
                  >
                    关闭
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 可编辑的 Prompt 组件
function PromptEditor({
  shot,
  fullPrompt,
  onUpdate,
}: {
  shot: any;
  fullPrompt: string;
  onUpdate: (data: any) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  // 优先使用数据库中的 promptText，如果为空则使用实时构建的 fullPrompt
  const displayPrompt = shot.promptText || fullPrompt;

  const handleStartEdit = () => {
    setEditValue(displayPrompt);
    setIsEditing(true);
  };

  const handleSave = () => {
    onUpdate({ promptText: editValue });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue("");
  };

  return (
    <div className="pt-1">
      <div className="flex items-center gap-1 mb-1">
        <h4 className="font-medium text-sm">完整场景 Prompt</h4>
        {isEditing ? (
          <div className="flex gap-1 ml-auto">
            <Button
              size="sm"
              onClick={handleCancel}
              variant="outline"
              className="h-6 px-2 text-xs"
            >
              取消
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-6 px-2 text-xs"
            >
              保存
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              navigator.clipboard.writeText(displayPrompt);
              toast.success("已复制 Prompt");
            }}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="复制"
          >
            <Copy className="h-3 w-3 text-gray-500" />
          </button>
        )}
      </div>
      {isEditing ? (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-full rounded border border-blue-500 p-2 text-xs text-gray-700 leading-relaxed min-h-[80px] focus:outline-none focus:ring-1 focus:ring-blue-500"
          autoFocus
          onBlur={handleSave}
        />
      ) : (
        <div
          onClick={handleStartEdit}
          className="bg-gray-50 rounded p-2 text-xs text-gray-700 leading-relaxed max-h-24 overflow-y-auto cursor-text hover:bg-gray-100 transition-colors"
          title="点击编辑"
        >
          {displayPrompt || <span className="text-gray-400">暂无内容（点击编辑）</span>}
        </div>
      )}
    </div>
  );
}
