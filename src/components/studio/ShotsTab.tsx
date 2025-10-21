/**
 * 镜头制作 Tab 组件
 * 核心功能: 创建镜头、添加角色、生成AI首帧和动画
 */

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/components/providers/trpc-provider";
import { ShotAIGenerationPanel } from "./ShotAIGenerationPanel";
import { toast } from "~/components/ui/toast";

type Props = {
  episodeId: string;
  projectId: string;
  shots: any[];
  characters: any[];
  setting: any;
  objective?: string | null;
  onRefresh?: () => void;
};

export function ShotsTab({
  episodeId,
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
  const [isSceneDescriptionExpanded, setIsSceneDescriptionExpanded] =
    useState(false);
  const [isActorsExpanded, setIsActorsExpanded] = useState(false);

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

  // 构建完整 Prompt
  // 格式: 当前镜头action + '说' + 当前镜头dialogue (不使用逗号分隔)
  const buildPrompt = (shot: any) => {
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
            "摄像机拍摄微微侧面",
            char.environment,
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
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* 左侧：镜头列表 */}
      <div className="w-full lg:w-1/2 flex flex-col space-y-4 overflow-y-auto pr-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">镜头制作</h2>
            <p className="text-sm text-gray-500 mt-1">
              创建镜头,添加角色和台词,生成 AI 首帧和动画
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSyncFromObjective}
              variant="outline"
              className="gap-2"
              disabled={syncShotsMutation.isPending}
            >
              <RefreshCw className="h-4 w-4" />
              {syncShotsMutation.isPending ? "同步中..." : "从目标同步"}
            </Button>
            <Button
              onClick={handleCreateShot}
              className="gap-2"
              disabled={createShotMutation.isPending}
            >
              <Plus className="h-4 w-4" />
              添加镜头
            </Button>
          </div>
        </div>

        {/* 完整场景描述 - 可展开收起 */}
        {sceneDescriptions && sceneDescriptions.length > 0 ? (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-lg shadow-md min-h-[60px] relative z-10">
            <button
              onClick={() =>
                setIsSceneDescriptionExpanded(!isSceneDescriptionExpanded)
              }
              className="w-full flex items-center justify-between p-4 hover:bg-orange-100/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isSceneDescriptionExpanded ? (
                  <ChevronDown className="h-5 w-5 text-orange-700" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-orange-700" />
                )}
                <span className="text-base font-bold text-orange-900">
                  完整场景描述
                </span>
                <span className="text-sm text-orange-600 bg-orange-200 px-3 py-1 rounded-full font-medium">
                  {sceneDescriptions.length} 个角色
                </span>
              </div>
              <span className="text-sm text-orange-700 font-medium">
                {isSceneDescriptionExpanded ? "点击收起 ▲" : "点击展开 ▼"}
              </span>
            </button>
            {isSceneDescriptionExpanded && (
              <div className="px-4 pb-4 pt-2 space-y-3">
                {sceneDescriptions.map((scene: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white rounded-md border border-orange-200 p-4 shadow-sm"
                  >
                    <div className="font-medium text-orange-900 mb-2 text-sm">
                      {scene.characterName}
                    </div>
                    <div className="text-xs text-orange-800 leading-relaxed">
                      {scene.description}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
            <div className="text-sm text-orange-800 font-medium">
              ⚠️ 暂无场景描述
            </div>
            <div className="text-xs text-orange-700 mt-2">
              请先在"目标（脚本）"tab中生成目标确认，系统会自动提取角色的完整场景描述。
            </div>
          </div>
        )}

        {/* 演员列表 */}
        {characters.length > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg relative z-0">
            <button
              onClick={() => setIsActorsExpanded(!isActorsExpanded)}
              className="w-full flex items-center justify-between p-3 hover:bg-blue-100/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isActorsExpanded ? (
                  <ChevronDown className="h-4 w-4 text-blue-700" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-blue-700" />
                )}
                <span className="text-xs font-semibold text-blue-900">演员表</span>
                <span className="text-xs text-blue-600 bg-blue-200 px-2 py-0.5 rounded-full">
                  {characters.length}
                </span>
              </div>
              <span className="text-xs text-blue-700">
                {isActorsExpanded ? "收起 ▲" : "展开 ▼"}
              </span>
            </button>
            {isActorsExpanded && (
              <div className="px-3 pb-3 pt-1">
                <div className="flex flex-wrap gap-2">
                  {characters.map((char: any) => (
                    <div
                      key={char.id}
                      className="flex items-center gap-1.5 bg-white rounded-full pl-0.5 pr-2 py-0.5 border border-blue-200"
                    >
                      <div className="h-6 w-6 rounded-full bg-purple-400 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {char.referenceImage ? (
                          <img
                            src={char.referenceImage}
                            alt={char.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <User className="h-3 w-3 text-white" />
                        )}
                      </div>
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
                </div>
              </div>
            )}
          </div>
        )}

        {/* 同步提示消息 */}
        {syncMessage && (
          <div
            className={`rounded-md border p-3 text-sm ${
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
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
            ⚠️ 还没有角色。请先在"背景设定"tab中创建或导入角色。
          </div>
        )}

        {/* 镜头列表 */}
        <div className="space-y-4">
          {shots.map((shot) => (
            <ShotCard
              key={shot.id}
              shot={shot}
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

      {/* 右侧：AI生成区域 */}
      <div className="w-full lg:w-1/2 border-l pl-4 overflow-y-auto">
        {expandedShot ? (
          <div className="space-y-6">
            <ShotAIGenerationPanel
              shotId={expandedShot}
              onTaskCreated={onRefresh}
              sceneDescriptions={sceneDescriptions}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <FilmIcon className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-sm">请先展开一个镜头以使用 AI 生成工具</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 单个镜头卡片组件
function ShotCard({
  shot,
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
}: {
  shot: any;
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

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="bg-gray-50 p-4 flex items-center justify-between cursor-pointer"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-blue-500 rounded flex items-center justify-center text-white font-bold">
            #{shot.shotNumber}
          </div>
          <div>
            <h3 className="font-medium">
              {shot.name || `镜头 ${shot.shotNumber}`}
            </h3>
            <p className="text-xs text-gray-500">
              {shot.characters?.length || 0} 个角色 · {(() => {
                // 计算该镜头所有关联任务的总成本
                const totalCost = (shot.generationTasks || []).reduce(
                  (sum: number, task: any) => sum + (task.costUSD || 0),
                  0
                );
                return totalCost > 0 ? `$${totalCost.toFixed(4)}` : '无消耗';
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* 首帧按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (imageUrl) {
                setPreviewMedia({ type: "image", url: imageUrl });
              } else {
                setShowImageUrlInput(true);
              }
            }}
            className={`h-12 w-12 border-2 rounded flex items-center justify-center transition-colors ${
              imageUrl
                ? "border-green-500 bg-green-50 hover:bg-green-100"
                : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            }`}
            title={imageUrl ? "查看首帧" : "添加首帧"}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="首帧"
                className="h-full w-full object-cover rounded"
              />
            ) : (
              <ImageIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>

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
            className={`h-12 w-12 border-2 rounded flex items-center justify-center transition-colors ${
              videoUrl
                ? "border-purple-500 bg-purple-50 hover:bg-purple-100"
                : "border-gray-300 hover:border-blue-500 hover:bg-blue-50"
            }`}
            title={videoUrl ? "查看视频" : "添加视频"}
          >
            {videoUrl ? (
              <FilmIcon className="h-5 w-5 text-purple-600" />
            ) : (
              <FilmIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {/* 音频按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (audioUrl) {
                setPreviewMedia({ type: "audio", url: audioUrl });
              } else {
                // 音频不能直接点击添加，只显示状态
                toast.info("请从右侧任务历史中选择音频");
              }
            }}
            className={`h-12 w-12 border-2 rounded flex items-center justify-center transition-colors ${
              audioUrl
                ? "border-orange-500 bg-orange-50 hover:bg-orange-100"
                : "border-gray-300 hover:border-gray-400"
            }`}
            title={audioUrl ? "查看音频" : "从任务历史选择音频"}
          >
            {audioUrl ? (
              <MusicIcon className="h-5 w-5 text-orange-600" />
            ) : (
              <MusicIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 hover:bg-red-50 rounded text-red-500"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* 角色管理 */}
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

          {/* 完整 Prompt 预览 */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">完整场景 Prompt</h4>
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(fullPrompt);
                  toast.success("已复制 Prompt");
                }}
                variant="outline"
                className="gap-1"
              >
                <Copy className="h-3 w-3" />
                复制
              </Button>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed max-h-32 overflow-y-auto">
              {fullPrompt || <span className="text-gray-400">暂无内容</span>}
            </div>
          </div>
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
