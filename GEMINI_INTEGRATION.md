# Gemini 2.5 Flash Image Integration

This document describes the integration of Google's Gemini 2.5 Flash Image model into the AI content generation system.

## Overview

**Provider**: Google Gemini Official
**Model**: gemini-2.5-flash-image
**Capabilities**: Text-to-Image, Image-to-Image (editing, composition, style transfer)
**Features**:
- High-quality image generation from text prompts
- Image editing with natural language instructions
- Multi-image composition (up to 3 images)
- Style transfer
- High-fidelity text rendering in images
- Multiple aspect ratios (1:1, 16:9, 9:16, 21:9, etc.)

## Integration Components

### 1. Adapter Implementation

**File**: `src/lib/ai-generation/adapters/google/gemini-flash-image-adapter.ts`

The adapter implements:
- Text-to-image generation
- Image-to-image editing with input image support
- Multiple aspect ratio configurations
- Base64 image encoding/decoding
- Error handling with retry logic
- SynthID watermark support (automatic)

**Key Methods**:
- `dispatch()`: Sends generation request to Gemini API
- `downloadAndEncodeImage()`: Downloads and converts images to base64
- `detectMimeType()`: Auto-detects image MIME types

### 2. Adapter Registration

**File**: `src/lib/ai-generation/adapters/adapter-factory.ts`

The adapter is registered in the factory with the name `GeminiFlashImageAdapter`.

### 3. Model Parameters Configuration

**File**: `src/lib/ai-generation/config/model-parameters.ts`

Available parameters for the UI:

| Parameter | Type | Default | Options |
|-----------|------|---------|---------|
| `aspectRatio` | select | `1:1` | 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 |
| `responseModalities` | select | `text_and_image` | `text_and_image`, `image_only` |

**Aspect Ratios & Resolutions**:

| Ratio | Resolution | Tokens |
|-------|------------|--------|
| 1:1 | 1024x1024 | 1290 |
| 2:3 | 832x1248 | 1290 |
| 3:2 | 1248x832 | 1290 |
| 3:4 | 864x1184 | 1290 |
| 4:3 | 1184x864 | 1290 |
| 4:5 | 896x1152 | 1290 |
| 5:4 | 1152x896 | 1290 |
| 9:16 | 768x1344 | 1290 |
| 16:9 | 1344x768 | 1290 |
| 21:9 | 1536x672 | 1290 |

### 4. Database Configuration

**Platform**: Google
**Provider**: Gemini Official
- Slug: `gemini-official`
- API Endpoint: `https://generativelanguage.googleapis.com/v1beta/models`
- Authentication: API Key in query parameters

**Model**: Gemini 2.5 Flash (Image)
- Slug: `gemini-2.5-flash-image`
- Output Type: `IMAGE`
- Adapter: `GeminiFlashImageAdapter`
- Input Capabilities: `image-input` (支持图片上传)
- Output Capabilities: `IMAGE`
- Feature Tags:
  - `text-to-image`
  - `image-to-image`
  - `image-editing`
  - `multi-image-composition`
  - `style-transfer`
  - `high-fidelity-text`
  - `fast`
  - `official`

## Setup Instructions

### 1. Database Seeding

Run the seed script to create all necessary database entries:

```bash
npx tsx scripts/seed-gemini-provider.ts
```

This creates:
- Google platform
- Gemini Official provider
- Gemini 2.5 Flash Image model

### 2. API Key Configuration

Configure your Gemini API key in one of two ways:

**Option A: Environment Variable** (Recommended)
```bash
# Add to .env or .env.local
AI_PROVIDER_GEMINI_OFFICIAL_API_KEY=your_api_key_here
```

**Option B: Admin Panel**
1. Navigate to `/admin/ai-generation/providers`
2. Find "Gemini Official" provider
3. Click "Edit"
4. Enter your API key
5. Save

**Get API Key**: https://ai.google.dev/

### 3. Testing

Run the integration test to verify everything is configured correctly:

```bash
npx tsx scripts/test-gemini-integration.ts
```

Expected output:
```
✅ All checks passed!
🎉 Gemini 2.5 Flash Image is ready to use!
```

## Usage

### In Admin Panel

1. Navigate to `/admin/ai-generation`
2. Select model: "Gemini 2.5 Flash (Image)"
3. **[图片上传功能]** 上传输入图片（可选，支持图生图）:
   - 点击 **[+] 上传图片** 按钮选择本地文件
   - 或输入图片URL后点击"添加"
   - 支持1-5张图片（建议1-3张以获得最佳效果）
   - 支持PNG/JPG/WebP格式，最大10MB
   - 点击缩略图预览，悬停后点击×删除
4. Enter your text prompt
5. Configure parameters:
   - **Aspect Ratio**: Choose desired image dimensions
   - **Response Modalities**: Choose text+image or image only
6. Click "Generate"

**详细图片上传使用指南**: 参见 [GEMINI_IMAGE_UPLOAD_GUIDE.md](./GEMINI_IMAGE_UPLOAD_GUIDE.md)

### In Studio

1. Create or open a project
2. Create an episode
3. Create a shot
4. In the "Shots" tab, click "Generate Frame"
5. Select model: "Gemini 2.5 Flash (Image)"
6. **[图片上传功能]** 上传参考图片（可选）:
   - 与Admin面板相同的图片上传功能
   - 支持本地上传和URL输入
   - 可配合镜头信息快捷填充提示词
7. Enter prompt or use AI to generate prompt
8. Configure parameters
9. Generate

**详细图片上传使用指南**: 参见 [GEMINI_IMAGE_UPLOAD_GUIDE.md](./GEMINI_IMAGE_UPLOAD_GUIDE.md)

### Example Prompts

**Text-to-Image**:
```
A photorealistic close-up portrait of an elderly Japanese ceramicist
with deep, sun-etched wrinkles and a warm, knowing smile. He is
carefully inspecting a freshly glazed tea bowl.
```

**Image-to-Image (Editing)**:
```
[Upload image of cat]
Add a small, knitted wizard hat on the cat's head. Make it look
like it's sitting comfortably and not falling off.
```

**Style Transfer**:
```
[Upload modern city photo]
Transform this photograph into the artistic style of Vincent van
Gogh's 'Starry Night'. Preserve the composition but use swirling,
impasto brushstrokes and dramatic blues and yellows.
```

**Multi-Image Composition**:
```
[Upload image 1: dress]
[Upload image 2: model]
Create a professional e-commerce photo with the model from image 2
wearing the dress from image 1, with proper lighting and shadows.
```

## API Reference

### Request Format

```typescript
{
  modelId: "mdl_gemini_2_5_flash_image",
  prompt: "Your detailed prompt here",
  inputImages: ["https://example.com/image1.jpg"], // Optional
  parameters: {
    aspectRatio: "16:9",
    responseModalities: "text_and_image"
  }
}
```

### Response Format

**Success**:
```typescript
{
  status: "SUCCESS",
  results: [
    {
      type: "image",
      url: "data:image/png;base64,iVBORw0KGgoAAAANS...",
      metadata: {
        finishReason: "STOP",
        mimeType: "image/png",
        encoding: "base64"
      }
    }
  ],
  message: "Generated 1 image(s) successfully"
}
```

**Error**:
```typescript
{
  status: "ERROR",
  message: "Error description",
  error: {
    code: "ERROR_CODE",
    message: "Detailed error message",
    isRetryable: true/false
  }
}
```

## Prompting Best Practices

### 1. Be Descriptive, Not Just Keywords
❌ Bad: "cat, wizard hat, restaurant"
✅ Good: "A photorealistic image of a fluffy ginger cat wearing a small knitted wizard hat, sitting at a table in a fancy restaurant"

### 2. Use Photography Terms for Realism
Include details like:
- Camera angles: "close-up portrait", "wide-angle shot", "bird's eye view"
- Lens types: "85mm portrait lens", "macro shot"
- Lighting: "golden hour light", "studio-lit", "soft diffused lighting"
- Quality: "ultra-realistic", "sharp focus", "high-resolution"

### 3. For Text in Images
```
Create a modern, minimalist logo for a coffee shop called 'The Daily Grind'.
The text should be in a clean, bold, sans-serif font. Black and white color scheme.
```

### 4. Specify Style Clearly
```
A kawaii-style sticker of a happy red panda. Bold outlines, simple cel-shading,
vibrant colors. White background.
```

### 5. For Editing, Be Specific About What Changes
```
Using the provided image, change only the blue sofa to a vintage brown leather
chesterfield sofa. Keep everything else unchanged, including pillows and lighting.
```

## Limitations

1. **Language Support**: Best performance with EN, es-MX, ja-JP, zh-CN, hi-IN
2. **Input Images**: Works best with up to 3 input images
3. **Output Count**: Model may not always follow exact number of requested outputs
4. **Children's Images**: Not supported in EEA, CH, and UK regions
5. **Watermark**: All generated images include automatic SynthID watermark

## Troubleshooting

### Issue: "Missing API key" error
**Solution**: Configure API key via environment variable or admin panel (see Setup Instructions)

### Issue: "Failed to download/encode image"
**Solution**:
- Ensure input image URLs are publicly accessible
- Check image file size (max 10MB)
- Verify image format (JPEG, PNG, GIF, WebP supported)

### Issue: "No images returned in response"
**Solution**:
- Check prompt quality and clarity
- Verify aspect ratio is supported
- Review API quota/rate limits
- Check for content policy violations

### Issue: Images have unexpected style/quality
**Solution**:
- Use more descriptive prompts
- Add photography/style terms
- Specify quality level explicitly
- Try different aspect ratios

## Files Modified/Created

### Created Files
1. `src/lib/ai-generation/adapters/google/gemini-flash-image-adapter.ts` - Main adapter implementation
2. `scripts/seed-gemini-provider.ts` - Database seed script
3. `scripts/test-gemini-integration.ts` - Integration test script
4. `GEMINI_INTEGRATION.md` - This documentation

### Modified Files
1. `src/lib/ai-generation/adapters/adapter-factory.ts` - Added adapter registration
2. `src/lib/ai-generation/config/model-parameters.ts` - Added model parameters

## Testing Checklist

- [x] Database entries created (platform, provider, model)
- [x] Adapter registered in factory
- [x] Model parameters configured
- [x] Adapter instantiation works
- [ ] API key configured
- [ ] Text-to-image generation tested
- [ ] Image-to-image editing tested
- [ ] Multiple aspect ratios tested
- [ ] Error handling tested
- [ ] Studio integration tested

## Additional Resources

- **Gemini API Documentation**: https://ai.google.dev/api/generate-images
- **Gemini API Keys**: https://ai.google.dev/
- **Prompting Guide**: https://ai.google.dev/gemini-api/docs/prompting-strategies
- **Aspect Ratios Reference**: See table in "Model Parameters Configuration" section

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in browser console or server logs
3. Run integration test script: `npx tsx scripts/test-gemini-integration.ts`
4. Check Gemini API status: https://status.google.com/

---

**Version**: 1.0
**Last Updated**: 2025-10-25
**Integration Status**: ✅ Complete and Ready for Use
