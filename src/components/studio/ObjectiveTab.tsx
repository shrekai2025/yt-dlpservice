/**
 * 目标确定 Tab 组件
 * 使用 LLM 分析原始输入,提取核心目标
 */

import { useState, useEffect } from "react";
import {
  Save,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { api } from "~/components/providers/trpc-provider";
import { ScriptDataViewer } from "./ScriptDataViewer";

type Props = {
  episodeId: string;
  initialObjective?: string | null;
  initialObjectiveLLM?: string | null;
  initialSystemPrompt?: string | null;
  rawInput?: string | null;
  corePoint?: string | null;
  onSave?: () => void;
};

export function ObjectiveTab({
  episodeId,
  initialObjective,
  initialObjectiveLLM,
  initialSystemPrompt,
  rawInput,
  corePoint,
  onSave,
}: Props) {
  const [objective, setObjective] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // UI 状态
  const [isRawInputExpanded, setIsRawInputExpanded] = useState(false);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);

  // 查询可用的 LLM 提供商
  const { data: providers } = api.chat.listProviders.useQuery();

  const updateMutation = api.studio.updateEpisode.useMutation({
    onSuccess: () => {
      setIsSaving(false);
      setIsGenerating(false);
      onSave?.();
    },
    onError: () => {
      setIsSaving(false);
      setIsGenerating(false);
    },
  });

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const generateMutation = api.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      console.log("[ObjectiveTab] Generate success:", data);
      setObjective(data.reply);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);

      // 保存到数据库
      updateMutation.mutate({
        episodeId,
        objective: data.reply.trim() || undefined,
        objectiveLLM: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
        }),
      });
    },
    onError: (error) => {
      console.error("[ObjectiveTab] Generate error:", error);
      setIsGenerating(false);
      alert(`生成失败: ${error.message}`);
    },
  });

  useEffect(() => {
    if (initialObjective !== undefined && initialObjective !== null) {
      setObjective(initialObjective);
    } else {
      setObjective("");
    }
  }, [initialObjective]);

  useEffect(() => {
    if (initialObjectiveLLM) {
      try {
        const llmInfo = JSON.parse(initialObjectiveLLM);
        if (llmInfo.provider) setSelectedProvider(llmInfo.provider);
        if (llmInfo.model) setSelectedModel(llmInfo.model);
      } catch {
        // ignore
      }
    }
  }, [initialObjectiveLLM]);

  useEffect(() => {
    if (initialSystemPrompt !== undefined && initialSystemPrompt !== null) {
      setSystemPrompt(initialSystemPrompt);
      setTempSystemPrompt(initialSystemPrompt);
    } else {
      setSystemPrompt("");
      setTempSystemPrompt("");
    }
  }, [initialSystemPrompt]);

  // 自动选择第一个可用的提供商和模型
  useEffect(() => {
    if (providers && providers.length > 0 && !selectedProvider) {
      const firstProvider = providers.find((p) => p.isConfigured);
      if (firstProvider) {
        setSelectedProvider(firstProvider.provider);
        if (firstProvider.defaultModel) {
          setSelectedModel(firstProvider.defaultModel);
        }
      }
    }
  }, [providers, selectedProvider]);

  const handleGenerate = () => {
    console.log("[ObjectiveTab] handleGenerate called", {
      selectedProvider,
      selectedModel,
      rawInput: rawInput?.substring(0, 50),
      systemPrompt: systemPrompt?.substring(0, 50),
    });

    if (!selectedProvider || !selectedModel || !rawInput?.trim()) {
      console.log("[ObjectiveTab] Validation failed - missing required fields");
      return;
    }

    if (!systemPrompt?.trim()) {
      console.log("[ObjectiveTab] System Prompt is required but empty");
      alert("请先填写 System Prompt");
      return;
    }

    setIsGenerating(true);

    // 替换 {{rawInput}} 和 {{point}} 变量
    const finalPrompt = systemPrompt
      .replace(/\{\{rawInput\}\}/g, rawInput || "")
      .replace(/\{\{point\}\}/g, corePoint || "");

    console.log(
      "[ObjectiveTab] Sending generate request with finalPrompt:",
      finalPrompt.substring(0, 100),
    );

    generateMutation.mutate({
      provider: selectedProvider,
      model: selectedModel,
      message: "开始生成",
      systemInstruction: finalPrompt,
    });
  };

  const handleSave = () => {
    setIsSaving(true);
    updateMutation.mutate({
      episodeId,
      objective: objective.trim() || undefined,
      objectiveLLM: JSON.stringify({
        provider: selectedProvider,
        model: selectedModel,
      }),
    });
  };

  const handleEditPrompt = () => {
    setTempSystemPrompt(systemPrompt);
    setIsEditingPrompt(true);
  };

  const handleSavePrompt = () => {
    setSystemPrompt(tempSystemPrompt);
    setIsEditingPrompt(false);

    // 立即保存到数据库
    updateMutation.mutate({
      episodeId,
      systemPrompt: tempSystemPrompt,
    });
  };

  const handleCancelEditPrompt = () => {
    setTempSystemPrompt(systemPrompt);
    setIsEditingPrompt(false);
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById(
      "system-prompt-input",
    ) as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = tempSystemPrompt;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const variableText = `{{${variable}}}`;
      setTempSystemPrompt(before + variableText + after);

      // 恢复光标位置
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + variableText.length,
          start + variableText.length,
        );
      }, 0);
    }
  };

  const currentProvider = providers?.find(
    (p) => p.provider === selectedProvider,
  );
  const hasRawInput = rawInput && rawInput.trim().length > 0;

  // 获取原始输入的第一行
  const firstLineOfRawInput = rawInput?.split("\n")[0] || "";

  return (
    <div className="space-y-4">
      {/* 原始输入预览 - 默认收起 */}
      <div className="rounded-md bg-gray-50 border border-gray-200">
        <div
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => setIsRawInputExpanded(!isRawInputExpanded)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {isRawInputExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
            )}
            <span className="text-sm font-medium text-gray-700">
              原始输入预览
            </span>
            {!isRawInputExpanded && hasRawInput && (
              <span className="text-sm text-gray-500 truncate ml-2">
                {firstLineOfRawInput}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!hasRawInput && (
              <span className="text-xs text-orange-600">⚠️ 无素材</span>
            )}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleSave();
              }}
              disabled={isSaving}
              size="sm"
              className="gap-2"
            >
              <Save className="h-3 w-3" />
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        </div>
        {isRawInputExpanded && (
          <div className="px-3 pb-3 pt-0">
            {hasRawInput ? (
              <div className="text-sm text-gray-600 max-h-48 overflow-auto whitespace-pre-wrap font-mono bg-white rounded p-2 border border-gray-200">
                {rawInput}
              </div>
            ) : (
              <div className="text-sm text-gray-400 italic">暂无原始输入</div>
            )}
          </div>
        )}
      </div>

      {/* LLM 配置 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">LLM 提供商</label>
          <select
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value);
              const provider = providers?.find(
                (p) => p.provider === e.target.value,
              );
              if (provider?.defaultModel) {
                setSelectedModel(provider.defaultModel);
              }
            }}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">选择提供商</option>
            {providers?.map((p) => (
              <option
                key={p.provider}
                value={p.provider}
                disabled={!p.isConfigured}
              >
                {p.label} {!p.isConfigured && "(未配置)"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">模型</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={!selectedProvider}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
          >
            <option value="">选择模型</option>
            {currentProvider?.models.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* System Prompt - 两种状态 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">System Prompt</label>

        {!isEditingPrompt ? (
          // 展示状态
          <div className="relative">
            <div className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 line-clamp-2 pr-20">
              {systemPrompt}
            </div>
            <Button
              onClick={handleEditPrompt}
              size="sm"
              variant="outline"
              className="absolute right-2 top-2 gap-1"
            >
              <Edit2 className="h-3 w-3" />
              编辑
            </Button>
          </div>
        ) : (
          // 编辑状态
          <div className="space-y-2">
            <textarea
              id="system-prompt-input"
              value={tempSystemPrompt}
              onChange={(e) => setTempSystemPrompt(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  onClick={() => insertVariable("rawInput")}
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                >
                  插入 {"{{rawInput}}"}
                </Button>
                <Button
                  onClick={() => insertVariable("point")}
                  size="sm"
                  variant="outline"
                  className="gap-1 text-xs"
                >
                  插入 {"{{point}}"}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleCancelEditPrompt}
                  size="sm"
                  variant="outline"
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  取消
                </Button>
                <Button onClick={handleSavePrompt} size="sm" className="gap-1">
                  <Check className="h-3 w-3" />
                  确定
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              提示: 使用 {"{{rawInput}}"} 插入原始素材, {"{{point}}"}{" "}
              插入核心看点
            </p>
          </div>
        )}
      </div>

      {/* 生成按钮 */}
      <div className="flex gap-2">
        <Button
          onClick={handleGenerate}
          disabled={
            !hasRawInput || !selectedProvider || !selectedModel || isGenerating
          }
          className="gap-2 flex-1"
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "生成中..." : "生成目标"}
        </Button>
        {objective && (
          <Button
            onClick={() => setObjective("")}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            清空
          </Button>
        )}
      </div>

      {/* 生成状态提示 */}
      {isGenerating && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>已提交到 LLM，正在推理中，请稍候...</span>
          </div>
        </div>
      )}

      {/* 目标输出 */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          核心目标
          {objective && (
            <span className="ml-2 text-xs text-green-600">✓ 已生成</span>
          )}
        </label>

        {/* 如果有数据，尝试格式化展示 */}
        {objective && objective.trim().length > 0 ? (
          <div className="space-y-3">
            {/* 格式化展示区域 */}
            <div className="rounded-md border border-gray-200 bg-white">
              <ScriptDataViewer data={objective} />
            </div>

            {/* 编辑区域 - 小号显示 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                手动编辑
              </label>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500">
                可以手动编辑 AI 生成的内容
              </p>
            </div>
          </div>
        ) : (
          <textarea
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            rows={8}
            placeholder={`点击"生成目标"按钮,让AI分析原始输入...\n\n或者手动输入核心目标`}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        )}
      </div>

      {/* 成功提示 */}
      {showSuccessMessage && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          ✓ 生成成功！
        </div>
      )}

      {/* 错误提示 */}
      {generateMutation.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          生成失败: {generateMutation.error.message}
        </div>
      )}

      {updateMutation.error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          保存失败: {updateMutation.error.message}
        </div>
      )}

      {updateMutation.isSuccess && !isSaving && (
        <div className="rounded-md bg-green-50 border border-green-200 p-3 text-sm text-green-700">
          ✓ 保存成功
        </div>
      )}
    </div>
  );
}
