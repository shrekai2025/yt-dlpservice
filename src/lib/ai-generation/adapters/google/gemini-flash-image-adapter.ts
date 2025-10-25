/**
 * GeminiFlashImageAdapter - Google Gemini 2.5 Flash Image Generation
 *
 * Supports:
 * - Text to Image (文生图)
 * - Image to Image (图生图/图像编辑)
 * - Multi-image composition
 *
 * API Reference: https://ai.google.dev/api/generate-images
 * Package: @google/genai
 */

import { BaseAdapter } from '../base-adapter';
import type {
  GenerationRequest,
  GenerationResult,
  AdapterResponse,
} from '../types';
import axios from 'axios';

interface GeminiPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 encoded
  };
  fileData?: {
    mimeType: string;
    fileUri: string; // URL to the image
  };
}

interface GeminiContent {
  parts: GeminiPart[];
}

interface GeminiGenerateRequest {
  model: string;
  contents: GeminiContent[];
  config?: {
    responseModalities?: string[];
    imageConfig?: {
      aspectRatio?: string;
    };
  };
}

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{
        text?: string;
        inlineData?: {
          mimeType: string;
          data: string; // base64 encoded image
        };
      }>;
    };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

interface GeminiErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
    details?: unknown;
  };
}

export class GeminiFlashImageAdapter extends BaseAdapter {
  protected getAuthHeaders(): Record<string, string> {
    // Gemini uses API key in query params, not headers
    return {
      'Content-Type': 'application/json',
    };
  }

  protected getApiEndpoint(): string {
    return (
      this.config.provider.apiEndpoint ||
      'https://generativelanguage.googleapis.com/v1beta/models'
    );
  }

  async dispatch(request: GenerationRequest): Promise<AdapterResponse> {
    try {
      const apiKey = this.getApiKey();
      if (!apiKey) {
        return {
          status: 'ERROR',
          message: 'Missing API key for Gemini',
          error: {
            code: 'MISSING_API_KEY',
            message: 'Gemini API key is required',
            isRetryable: false,
          },
        };
      }

      // Build prompt parts
      const parts: GeminiPart[] = [];

      // Add text prompt
      parts.push({ text: request.prompt });

      // Add input images for image-to-image editing if provided
      if (request.inputImages && request.inputImages.length > 0) {
        this.log(
          'info',
          `Processing ${request.inputImages.length} input image(s) for image-to-image generation`
        );

        // Gemini supports up to 3 images for best performance
        const imagesToProcess = request.inputImages.slice(0, 3);

        for (const imageUrl of imagesToProcess) {
          try {
            // Gemini API需要使用inlineData方式传递图片（不支持外部HTTP URL）
            this.log('info', `Downloading and encoding image: ${imageUrl.substring(0, 50)}...`);
            const imageData = await this.downloadAndEncodeImage(imageUrl);
            parts.push({
              inlineData: {
                mimeType: this.detectMimeType(imageUrl),
                data: imageData,
              },
            });
          } catch (err) {
            this.log('error', `Failed to process input image: ${imageUrl}`, err);
            return {
              status: 'ERROR',
              message: `Failed to download or encode input image: ${imageUrl}`,
              error: {
                code: 'IMAGE_PROCESSING_FAILED',
                message:
                  err instanceof Error ? err.message : 'Failed to process image',
                isRetryable: true,
              },
            };
          }
        }
      }

      // Extract aspect ratio from parameters
      const aspectRatio = (request.parameters?.aspectRatio as string) || '1:1';

      // Map responseModalities parameter from UI
      const responseModalitiesParam = request.parameters?.responseModalities as string;
      let responseModalities: string[] | undefined;
      if (responseModalitiesParam === 'image_only') {
        responseModalities = ['Image'];
      } else {
        // Default or 'text_and_image'
        responseModalities = undefined; // Let API use default (both text and image)
      }

      // Build request payload
      const payload: GeminiGenerateRequest = {
        model: 'gemini-2.5-flash-image',
        contents: [{ parts }], // Wrap parts in a content object
        config: {
          ...(responseModalities && { responseModalities }),
          imageConfig: {
            aspectRatio,
          },
        },
      };

      this.log('info', 'Dispatching Gemini 2.5 Flash image generation', {
        promptLength: request.prompt.length,
        inputImagesCount: request.inputImages?.length || 0,
        aspectRatio,
      });

      // Make API request with proxy support
      const endpoint = `${this.getApiEndpoint()}/gemini-2.5-flash-image:generateContent`;
      const url = `${endpoint}?key=${apiKey}`;

      const data = await this.post<GeminiResponse | GeminiErrorResponse>(
        url,
        payload,
        {
          headers: this.getAuthHeaders(),
          timeout: 120000, // 2 minutes timeout for image generation
        }
      );

      // Check for API errors
      if ('error' in data) {
        this.log('error', 'Gemini API returned error', data.error);
        return {
          status: 'ERROR',
          message: data.error.message,
          error: {
            code: `GEMINI_${data.error.code}`,
            message: data.error.message,
            isRetryable: data.error.code >= 500 || data.error.code === 429,
            details: data.error.details,
          },
        };
      }

      // Process successful response
      if (data.candidates && data.candidates.length > 0) {
        const results: GenerationResult[] = [];

        for (const candidate of data.candidates) {
          if (candidate.content?.parts) {
            for (const part of candidate.content.parts) {
              // Check for inline image data (base64)
              if (part.inlineData) {
                const base64Image = part.inlineData.data;
                const mimeType = part.inlineData.mimeType;

                // Convert base64 to data URL
                const dataUrl = `data:${mimeType};base64,${base64Image}`;

                results.push({
                  type: 'image',
                  url: dataUrl,
                  metadata: {
                    finishReason: candidate.finishReason,
                    mimeType: mimeType,
                    encoding: 'base64',
                  },
                });
              }
              // Check for text content (could be URL or description)
              else if (part.text) {
                this.log(
                  'info',
                  'Gemini returned text content',
                  part.text.substring(0, 100)
                );
              }
            }
          }
        }

        if (results.length > 0) {
          this.log(
            'info',
            `Gemini generation completed: ${results.length} image(s) generated`
          );
          return {
            status: 'SUCCESS',
            results,
            message: `Generated ${results.length} image(s) successfully`,
          };
        }

        // No images found in response
        return {
          status: 'ERROR',
          message: 'No images returned in response',
          error: {
            code: 'NO_IMAGES_GENERATED',
            message: 'Gemini API did not return any image data',
            isRetryable: false,
          },
        };
      }

      // No candidates in response
      return {
        status: 'ERROR',
        message: 'No generation candidates returned',
        error: {
          code: 'NO_CANDIDATES',
          message: 'API returned empty candidates array',
          isRetryable: false,
        },
      };
    } catch (error: unknown) {
      this.log('error', 'Gemini dispatch failed with exception', error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      const isAxiosError = axios.isAxiosError(error);

      // 输出详细的错误响应
      if (isAxiosError && error.response) {
        this.log('error', 'Gemini API error response', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
        });
      }

      return {
        status: 'ERROR',
        message: errorMessage,
        error: {
          code: isAxiosError
            ? `HTTP_${error.response?.status || 'UNKNOWN'}`
            : 'DISPATCH_FAILED',
          message: errorMessage,
          isRetryable: isAxiosError && (error.response?.status ?? 0) >= 500,
          details: isAxiosError ? error.response?.data : undefined,
        },
      };
    }
  }

  /**
   * Download image from URL and convert to base64
   */
  private async downloadAndEncodeImage(imageUrl: string): Promise<string> {
    try {
      // Handle data URLs (already base64 encoded)
      if (imageUrl.startsWith('data:')) {
        const base64Data = imageUrl.split(',')[1];
        if (!base64Data) {
          throw new Error('Invalid data URL format');
        }
        return base64Data;
      }

      // Download image from URL (with proxy support)
      const config = await this.applyProxyConfig({
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds timeout
        maxContentLength: 10 * 1024 * 1024, // 10MB max
      });

      const response = await axios.get(imageUrl, config);

      // Convert to base64
      const base64 = Buffer.from(response.data as ArrayBuffer).toString(
        'base64'
      );
      return base64;
    } catch (error) {
      this.log('error', `Failed to download/encode image: ${imageUrl}`, error);
      throw new Error(
        `Failed to process image from ${imageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Detect MIME type from URL or default to image/png
   */
  private detectMimeType(imageUrl: string): string {
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:([^;]+);/);
      return match?.[1] || 'image/png';
    }

    const extension = imageUrl.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
    };

    return mimeTypes[extension || ''] || 'image/png';
  }
}
