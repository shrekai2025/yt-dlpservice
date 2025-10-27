/**
 * Episode Cost Detail Dialog
 * 集成本明细弹窗
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { api } from "~/components/providers/trpc-provider";
import { Loader2 } from "lucide-react";

interface EpisodeCostDetailDialogProps {
  episodeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EpisodeCostDetailDialog({
  episodeId,
  open,
  onOpenChange,
}: EpisodeCostDetailDialogProps) {
  const { data, isLoading } = api.studio.getEpisodeCostDetail.useQuery(
    { episodeId },
    {
      enabled: open,
    }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>成本明细</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* 成本汇总 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-blue-600 mb-1">图像生成</div>
                <div className="text-2xl font-bold text-blue-700">
                  ${data?.summary.imageCost.toFixed(2)}
                </div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-purple-600 mb-1">视频生成</div>
                <div className="text-2xl font-bold text-purple-700">
                  ${data?.summary.videoCost.toFixed(2)}
                </div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-sm text-orange-600 mb-1">音频生成</div>
                <div className="text-2xl font-bold text-orange-700">
                  ${data?.summary.audioCost.toFixed(2)}
                </div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-green-600 mb-1">数字人合成</div>
                <div className="text-2xl font-bold text-green-700">
                  ${data?.summary.digitalHumanCost.toFixed(2)}
                </div>
              </div>
            </div>

            {/* 总成本 */}
            <div className="bg-gray-100 rounded-lg p-4 flex items-center justify-between">
              <span className="text-lg font-semibold">总成本</span>
              <span className="text-3xl font-bold text-gray-900">
                ${data?.summary.totalCost.toFixed(2)}
              </span>
            </div>

            {/* 成本明细列表 */}
            <div>
              <h3 className="font-semibold text-lg mb-4">成本明细</h3>
              <div className="space-y-2">
                {data?.details.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">暂无成本记录</div>
                ) : (
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">时间</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">类型</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">供应商</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">模型</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">任务ID</th>
                          <th className="px-4 py-2 text-right font-medium text-gray-600">成本</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data?.details.map((detail: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-gray-600">
                              {new Date(detail.createdAt).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                detail.type === 'IMAGE'
                                  ? 'bg-blue-100 text-blue-700'
                                  : detail.type === 'VIDEO'
                                  ? 'bg-purple-100 text-purple-700'
                                  : detail.type === 'AUDIO'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {detail.type === 'IMAGE'
                                  ? '图像'
                                  : detail.type === 'VIDEO'
                                  ? '视频'
                                  : detail.type === 'AUDIO'
                                  ? '音频'
                                  : '数字人'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-gray-600">{detail.provider}</td>
                            <td className="px-4 py-2 text-gray-600 max-w-[200px] truncate" title={detail.model}>
                              {detail.model}
                            </td>
                            <td className="px-4 py-2 text-gray-400 font-mono text-xs">
                              {detail.taskId.slice(0, 8)}...
                            </td>
                            <td className="px-4 py-2 text-right font-semibold text-gray-900">
                              ${detail.cost.toFixed(4)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
