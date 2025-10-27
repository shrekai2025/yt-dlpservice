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

// System Prompt Templates for different episode types
const SYSTEM_PROMPT_TEMPLATES: Record<string, string> = {
  TYPE01: `你是一个尽职尽责的脚本写作助手,专门为英语实景对话学习短片系列撰写脚本。
任务是根据 POINT 中提到的预期视频看点,参考 RAWINPUT 中提供的相关内容,规划出本次AI短片的脚本。

***

## 说明:
1. 英语实景对话学习短片系列是为了让非英语母语者轻松学习地道英语而制作的系列,每集由2个角色演绎,通过简单情景对话演示某个地道英语表达的用法。
   例如:on the house是免单的意思;喉咙痛是have a sore throat 而不是 neck pain。
   短片很短,每一集通常不到一分钟。

2. 下面提供的 POINT 里通常包含了这一集视频的核心目标,例如学习哪个地道英语表达(英语学习要点,必须有),以及在影视演绎方面是否要求有特点,例如全部穿着动物装扮服装来演绎(可能有)等。

3. RAWINPUT 里面信息非常杂乱,你只需要参考跟核心目标有关的内容(对白、场景/背景设定、戏剧性的表演桥段),其余的抛弃。不要照搬对角色衣着,需要有变化。

***

## 输入内容:

**POINT:**
{{point}}

**RAWINPUT:**
{{rawInput}}

***

## 任务要求:

你必须严格按照以下JSON格式输出,不要添加任何其他文字、解释或markdown代码块标记。

### JSON结构要求:

1. **风格设定** (\`styleSettings\`): 描述整体视觉风格,不要出现具体场景描绘(可以写在现代与哥特风格相融合的面包店里,但不能写面包店柜台里)。例如"70年代宇宙科幻电影风格的飞船里"。需要站在AI视觉生成角度描绘,例如"这是电影镜头"、"警察执法记录仪效果"、"cosplay写真效果"、"非常随意的日常拍照记录,没有摆拍痕迹"等。
2. **全局角色设定** (\`characters\`): 角色数组,每个角色包含:
   - \`name\`: 角色名称(根据对话自定义名称,例如医生、患者)
   - \`appearance\`: 角色外观设定(服装+配饰+发型+身体朝向),例如"穿着70年代星舰船员的制服,短发,佩戴通讯耳机,身体和头部微微朝左"。禁止对角色面貌和头发颜色进行描写。可以写发型,不能写颜色。
   - \`environment\`: 角色所在场景位置,例如"站在飞船操控台前,背景是闪烁的仪表盘和星空视窗"
3. **镜头列表** (\`shots\`): 10-14个镜头的数组,每个镜头包含:
   - \`shotNumber\`: 镜头编号
   - \`character\`: 角色名称
   - \`action\`: 角色在此镜头的动作+面部朝向+表情/情绪,必须延续角色设定中的朝向,强调面部和眼神的朝向;强化 可爱、疑惑、拒绝等表演情绪,镜头没有情绪时多表达积极的情绪如很高兴很可爱(女角色);有台词时需要强调'说话'动作。例如"角色 面朝左前方,看着左前方说话。表情有些疑惑,但很可爱。双手在键盘上快速操作,表情专注","角色 面朝右前方,微笑着向客人打招呼。表情很高兴。",
   - \`dialogue\`: 台词内容

### 重要约束:
- 脚本台词总长度:12-16句话
- 镜头数量:10-14个
- 每个镜头出现1个演员
- 不同角色轮流对话
- 每个角色外观在所有镜头中必须保持一致(可以使用相同的外观描述)
- 必须添加对角色表情/情绪的描绘,无特殊要求时使用中性描写如"表情柔和"
- 角色可以根据镜头需要与场景交互
- 脚本中多个角色的appearance身体朝向不能一样,必须面对面

***

## 输出格式(严格遵循):

{
  "styleSettings": "风格设定描述",
  "learningPoint": "本集的英语学习要点",
  "characters": [
    {
      "name": "角色A",
      "appearance": "角色外观设定(服装+配饰)",
      "environment": "角色所在场景位置描述"
    },
    {
      "name": "角色B",
      "appearance": "角色外观设定(服装+配饰)",
      "environment": "角色所在场景位置描述"
    }
  ],
  "shots": [
    {
      "shotNumber": 1,
      "character": "角色A",
      "action": "角色在此镜头的动作+表情/情绪",
      "dialogue": "台词内容"
    }
  ]
}

**重要:你的回复必须是且仅是一个有效的JSON对象,不要包含任何其他内容。**`,

  TYPE02: '',

  TYPE03: `你是一个尽职尽责的脚本写作助手,专门为英语实景对话学习短片系列撰写脚本。
任务是根据 POINT 中提到的预期视频看点,参考 RAWINPUT 中提供的相关内容,规划出本次AI短片的脚本。

***

## 说明:
1. 英语实景对话学习短片系列是为了让非英语母语者轻松学习地道英语而制作的系列,每集由2个角色演绎,通过简单情景对话演示某个地道英语表达的用法。
   例如:on the house是免单的意思;喉咙痛是have a sore throat 而不是 neck pain。
   短片很短,每一集通常不到一分钟。

2. 下面提供的 POINT 里通常包含了这一集视频的核心目标,例如学习哪个地道英语表达(英语学习要点,必须有),以及在影视演绎方面是否要求有特点,例如全部穿着动物装扮服装来演绎(可能有)等。

3. RAWINPUT 里面信息非常杂乱,你只需要参考跟核心目标有关的内容(对白、场景/背景设定、戏剧性的表演桥段),其余的抛弃。不要照搬对角色衣着,需要有变化。

***

## 输入内容:

**POINT:**
{{point}}

**RAWINPUT:**
{{rawInput}}

***

## 任务要求:

你必须严格按照以下JSON格式输出,不要添加任何其他文字、解释或markdown代码块标记。

### JSON结构要求:

1. **风格设定** (\`styleSettings\`): 描述整体视觉风格,不要出现具体场景描绘(可以写在现代与哥特风格相融合的面包店里,但不能写面包店柜台里)。例如"70年代宇宙科幻电影风格的飞船里"。需要站在AI视觉生成角度描绘,例如"这是电影镜头"、"警察执法记录仪效果"、"cosplay写真效果"、"非常随意的日常拍照记录,没有摆拍痕迹"等。

2. **全局角色设定** (\`characters\`): 角色数组,每个角色包含:
   - \`name\`: 角色名称,根据对话自定义名称,例如医生、患者。
   - \`appearance\`: 角色外观设定（服装+配饰）。
   - \`environment\`: 角色所在场景位置描述,例如站在机舱过道。

3. **镜头列表** (\`shots\`): 9-11个镜头的数组,每个镜头包含:
   - \`shotNumber\`: 镜头编号
   - \`character\`: 角色名称(必须与characters中的name一致)
   - \`framing\`: 景别,如"特写"、"近景"、"中景"、"全景"
   - \`bodyOrientation\`: 身体朝向,必须明确,如"身体正对前方"、"身体稍朝右"、"身体侧向左"。**重要:多个角色的身体朝向必须相反,形成面对面对话的关系**
   - \`faceDirection\`: 面部和眼神朝向,必须强调,如"面朝左前方,眼睛看着左前方"、"面朝镜头,眼神直视前方"、"面朝右,眼睛始终看着右侧"
   - \`expression\`: 表情描述。**重要规则**:
     * 积极表情直接表达,为女性角色增加"可爱"、"优雅"等词汇,如"很高兴,显得很可爱"
     * 消极表情必须弱化,如"稍有些悲伤"、"稍有些恐惧但目光坚毅"
     * 无特殊要求时使用中性描写如"表情柔和"、"神情自然"
   - \`action\`: 角色动作描述。有台词时必须包含"说话"动作,如"边说话边键盘打字"、"一边说话一边用手势比划"
   - \`cameraMovement\`: 镜头运动与运镜指令,如"镜头静止"、"镜头缓慢推进"、"跟随移动"
   - \`dialogue\`: 台词内容(英文)


### 重要约束【铁律】:
- 脚本台词总长度:11-13句话
- 镜头数量:9-11个
- 每个镜头只出现1个演员
- 不同角色轮流出现和对话
- 每个角色外观/服装在所有镜头中必须保持完全一致,只需包含会出现在画面中的部分(如近景半身不描述裤子和鞋子)
- 每个角色的身体朝向在每个镜头中必须保持完全一致;多个角色的身体朝向不能相同,必须形成面对面交流的关系
- 每个镜头必须添加对角色表情/情绪的描绘
- **【核心原则】你在镜头中描绘的是这个镜头的第一帧画面,而不是镜头中发生的全部内容。将注意力集中在第一帧的静态表现,忽略之后会发生的所有动态内容**


***

## 输出格式(严格遵循):

{
  "styleSettings": "整体视觉风格和拍摄手法描述",
  "learningPoint": "本集的英语学习要点",
  "characters": [
    {
      "name": "角色A",
      "appearance": "角色外观设定（服装+配饰）",
      "environment": "角色所在场景位置描述"
    },
    {
      "name": "角色B",
      "appearance": "角色外观设定（服装+配饰）",
      "environment": "角色所在场景位置描述"
    }
  ],
  "shots": [
    {
     "shotNumber": 1,
      "character": "角色A",
      "framing": "景别",
      "bodyOrientation": "身体朝向",
      "faceDirection": "面部和眼神朝向",
      "expression": "表情描述",
      "action": "动作描述",
      "cameraMovement": "镜头运动",
      "dialogue": "台词内容"
    }
  ]
}

**重要:你的回复必须是且仅是一个有效的JSON对象,不要包含任何其他内容。**`
};

type Props = {
  episodeId: string;
  episodeType: string;
  initialObjective?: string | null;
  initialObjectiveLLM?: string | null;
  initialSystemPrompt?: string | null;
  rawInput?: string | null;
  corePoint?: string | null;
  initialShotCount?: string | null;
  initialDialogueCount?: string | null;
  initialCharacterCount?: string | null;
  onSave?: () => void;
};

export function ObjectiveTab({
  episodeId,
  episodeType,
  initialObjective,
  initialObjectiveLLM,
  initialSystemPrompt,
  rawInput,
  corePoint,
  initialShotCount,
  initialDialogueCount,
  initialCharacterCount,
  onSave,
}: Props) {
  const [objective, setObjective] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [shotCount, setShotCount] = useState("8-10");
  const [dialogueCount, setDialogueCount] = useState("10-12");
  const [characterCount, setCharacterCount] = useState("2");

  // UI 状态
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState(systemPrompt);
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [tempObjective, setTempObjective] = useState(objective);

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
        shotCount,
        dialogueCount,
        characterCount,
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
      setTempObjective(initialObjective);
    } else {
      setObjective("");
      setTempObjective("");
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

  useEffect(() => {
    if (initialShotCount) setShotCount(initialShotCount);
  }, [initialShotCount]);

  useEffect(() => {
    if (initialDialogueCount) setDialogueCount(initialDialogueCount);
  }, [initialDialogueCount]);

  useEffect(() => {
    if (initialCharacterCount) setCharacterCount(initialCharacterCount);
  }, [initialCharacterCount]);

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

    // 替换所有变量
    const finalPrompt = systemPrompt
      .replace(/\{\{rawInput\}\}/g, rawInput || "")
      .replace(/\{\{point\}\}/g, corePoint || "")
      .replace(/\{\{shotCount\}\}/g, shotCount)
      .replace(/\{\{dialogueCount\}\}/g, dialogueCount)
      .replace(/\{\{characterCount\}\}/g, characterCount);

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
      shotCount,
      dialogueCount,
      characterCount,
    });
  };

  const handleCancelEditPrompt = () => {
    setTempSystemPrompt(systemPrompt);
    setIsEditingPrompt(false);
  };

  const handleEditObjective = () => {
    setTempObjective(objective);
    setIsEditingObjective(true);
  };

  const handleSaveObjective = () => {
    setObjective(tempObjective);
    setIsEditingObjective(false);
  };

  const handleCancelEditObjective = () => {
    setTempObjective(objective);
    setIsEditingObjective(false);
  };

  const currentProvider = providers?.find(
    (p) => p.provider === selectedProvider,
  );
  const hasRawInput = rawInput && rawInput.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* LLM 配置和 System Prompt - 单行布局 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 左侧：LLM 配置 */}
        <div className="space-y-4">
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

        {/* 右侧：System Prompt */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">System Prompt</label>
          </div>

          {/* 单行展示 */}
          <div className="relative">
            <div className="rounded-md border border-gray-300 px-3 py-2 text-sm bg-gray-50 truncate pr-20">
              {systemPrompt || "未设置 System Prompt"}
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
        </div>
      </div>

      {/* 新增：脚本参数配置 */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">镜头数</label>
          <input
            type="text"
            value={shotCount}
            onChange={(e) => setShotCount(e.target.value)}
            placeholder="8-10"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">台词数</label>
          <input
            type="text"
            value={dialogueCount}
            onChange={(e) => setDialogueCount(e.target.value)}
            placeholder="10-12"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">演员数</label>
          <input
            type="text"
            value={characterCount}
            onChange={(e) => setCharacterCount(e.target.value)}
            placeholder="2"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* System Prompt 编辑模态框 */}
      {isEditingPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">编辑 System Prompt</h3>
            <div className="space-y-4">
              <textarea
                id="system-prompt-input"
                value={tempSystemPrompt}
                onChange={(e) => setTempSystemPrompt(e.target.value)}
                rows={16}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
              <div className="flex items-center justify-end">
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
            </div>
          </div>
        </div>
      )}

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
          剧本框架
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

            {/* 编辑区域 - 单行显示，点击编辑按钮弹出模态框 */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">
                手动编辑
              </label>
              <div className="relative">
                <div className="rounded-md border border-gray-300 px-3 py-2 text-xs font-mono bg-gray-50 truncate pr-20">
                  {objective.substring(0, 100)}...
                </div>
                <Button
                  onClick={handleEditObjective}
                  size="sm"
                  variant="outline"
                  className="absolute right-2 top-2 gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  编辑
                </Button>
              </div>
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

      {/* 剧本框架编辑模态框 */}
      {isEditingObjective && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">编辑剧本框架</h3>
            <div className="space-y-4">
              <textarea
                value={tempObjective}
                onChange={(e) => setTempObjective(e.target.value)}
                rows={16}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
              <div className="flex justify-end gap-2">
                <Button
                  onClick={handleCancelEditObjective}
                  size="sm"
                  variant="outline"
                  className="gap-1"
                >
                  <X className="h-3 w-3" />
                  取消
                </Button>
                <Button onClick={handleSaveObjective} size="sm" className="gap-1">
                  <Check className="h-3 w-3" />
                  确定
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                可以手动编辑 AI 生成的内容
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
