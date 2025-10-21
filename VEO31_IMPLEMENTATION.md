# Veo 3.1 & Veo 3.1 Extend Implementation Summary

## Overview
Successfully integrated Google Veo 3.1 video generation and extension models through Kie.ai API.

## ⚠️ Pricing Update (2025-10-21)

The pricing has been corrected to match the official Kie.ai documentation:

### Veo 3.1 Main Model
- **Quality (16:9 or 9:16)**: 250 Credits ≈ $1.25
- **Fast (16:9 or 9:16)**: 60 Credits ≈ $0.30
- **Get 1080P video**: +5 Credits ≈ $0.025 (one-time, 16:9 only)

### Veo 3.1 Extend
- **Extension**: 60 Credits ≈ $0.30 per extension

## Implementation Details

### 1. Adapter Implementation
**File**: [src/lib/ai-generation/adapters/kie/kie-veo3-1-adapter.ts](src/lib/ai-generation/adapters/kie/kie-veo3-1-adapter.ts)

- Created `KieVeo31Adapter` class extending `BaseAdapter`
- Implements video generation via Kie.ai API endpoints:
  - `POST /api/v1/veo/generate` - Create generation task
  - `GET /api/v1/veo/record-info` - Check task status
- Supports multiple generation modes:
  - `TEXT_2_VIDEO` - Text to video generation
  - `FIRST_AND_LAST_FRAMES_2_VIDEO` - Generate video from first/last frames (1-2 images)
  - `REFERENCE_2_VIDEO` - Reference-based generation (1-3 images, only for veo3_fast + 16:9)

### 2. Adapter Registration
**File**: [src/lib/ai-generation/adapters/adapter-factory.ts](src/lib/ai-generation/adapters/adapter-factory.ts:20)

- Imported `KieVeo31Adapter`
- Registered in `ADAPTER_REGISTRY` for model slug `kie-veo3-1`

### 3. Model Parameters Configuration
**File**: [src/lib/ai-generation/config/model-parameters.ts](src/lib/ai-generation/config/model-parameters.ts:712-775)

Added UI parameter fields for `kie-veo3-1`:
- `image_url` - Input image URL (optional, supports 1-2 images)
- `aspectRatio` - Video aspect ratio (16:9, 9:16, Auto)
- `generationType` - Generation mode selection
- `seeds` - Random seed (10000-99999)
- `enableTranslation` - Auto-translate prompts to English
- `watermark` - Watermark text (optional)
- `callBackUrl` - Webhook callback URL (optional)

### 4. Pricing Configuration
**Files**:
- Main: [src/lib/ai-generation/config/pricing-info.ts](src/lib/ai-generation/config/pricing-info.ts:152-178)
- Extend: [src/lib/ai-generation/config/pricing-info.ts](src/lib/ai-generation/config/pricing-info.ts:180)

**Veo 3.1 Main Model Pricing** (Credits @ $0.005 per credit):
- **Quality (veo3)**: 250 Credits ≈ $1.25 (both 16:9 and 9:16)
- **Fast (veo3_fast)**: 60 Credits ≈ $0.30 (both 16:9 and 9:16)
- **1080P Upgrade**: +5 Credits ≈ $0.025 (16:9 only, one-time per video)

**Veo 3.1 Extend Pricing**:
- **Extension**: 60 Credits ≈ $0.30 per extension

### 5. Database Model Entry
**File**: [prisma/seed-ai-generation.ts](prisma/seed-ai-generation.ts:576-595)

Created model entry with:
- **Name**: Veo 3.1
- **Slug**: `kie-veo3-1`
- **Provider**: Kie.ai
- **Output Type**: VIDEO
- **Adapter**: KieVeo31Adapter
- **Input Capabilities**: text-input, image-input
- **Feature Tags**: latest, 1080p, translation, multi-mode
- **Function Tags**: text-to-video, image-to-video, first-last-frame, reference
- **Sort Order**: 14 (after Veo 3 Fast)

## API Documentation Reference

### Generate Veo 3.1 Video
**Endpoint**: `POST https://api.kie.ai/api/v1/veo/generate`

**Request Parameters**:
```typescript
{
  prompt: string              // Required: Video description
  imageUrls?: string[]        // Optional: 1-2 images for image-to-video
  model: 'veo3' | 'veo3_fast' // Model type
  generationType?: string     // TEXT_2_VIDEO | FIRST_AND_LAST_FRAMES_2_VIDEO | REFERENCE_2_VIDEO
  aspectRatio?: string        // '16:9' | '9:16' | 'Auto'
  seeds?: number              // 10000-99999
  enableTranslation?: boolean // Default: true
  watermark?: string          // Optional watermark text
  callBackUrl?: string        // Webhook URL
}
```

**Response**:
```typescript
{
  code: 200,
  msg: "success",
  data: {
    taskId: string  // Use for status polling
  }
}
```

### Get Video Status
**Endpoint**: `GET https://api.kie.ai/api/v1/veo/record-info?taskId={taskId}`

**Response**:
```typescript
{
  code: 200,
  data: {
    successFlag: 0 | 1 | 2 | 3  // 0: Generating, 1: Success, 2/3: Failed
    response: {
      resultUrls: string[]      // Generated video URLs
      resolution: string
    }
  }
}
```

## Key Features

1. **Multi-Mode Generation**:
   - Text-to-video
   - Image-to-video (1-2 images)
   - Reference-based generation (1-3 images, specific constraints)

2. **Quality Options**:
   - 720P and 1080P (1080P only for 16:9)
   - Auto translation for better results

3. **Flexible Inputs**:
   - Support for multiple aspect ratios
   - Watermark customization
   - Reproducible results via seeds

## Database Seed

Run the following command to add the model to your database:

```bash
npx tsx prisma/seed-ai-generation.ts
```

## Testing

To test the implementation:

1. Start the development server
2. Navigate to AI Generation page
3. Select "Veo 3.1" model
4. Configure parameters and generate video
5. Monitor task status in task history

## Implementation Summary

### Veo 3.1 Main Model (`kie-veo3-1`)
✅ Created adapter: [KieVeo31Adapter](src/lib/ai-generation/adapters/kie/kie-veo3-1-adapter.ts)
✅ Registered in factory
✅ Added UI parameters with model selection (Quality/Fast)
✅ Configured dynamic pricing based on model selection
✅ Database entry with corrected pricing
✅ Supports: text-to-video, image-to-video, first-last-frame, reference modes

### Veo 3.1 Extend Model (`kie-veo3-1-extend`)
✅ Created adapter: [KieVeo31ExtendAdapter](src/lib/ai-generation/adapters/kie/kie-veo3-1-extend-adapter.ts)
✅ Registered in factory
✅ Added UI parameters with parentTaskId input
✅ Fixed pricing: 60 Credits ($0.30)
✅ Database entry added
✅ Requires original video taskId to extend

## Notes

- **REFERENCE_2_VIDEO mode** only supports `veo3_fast` model with 16:9 aspect ratio
- **Quality vs Fast**: Quality uses `model=veo3` (250 credits), Fast uses `model=veo3_fast` (60 credits)
- **1080P**: Requires 16:9 aspect ratio and costs +5 Credits (one-time per video)
- **Extend**: Cannot extend videos that have been upgraded to 1080P
- **Translation**: Enabled by default for non-English prompts
- **Default model**: Set to `veo3_fast` for better value
