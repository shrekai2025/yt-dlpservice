/**
 * 测试 Google STT 区域和模型选择逻辑
 */

console.log('🧪 Google STT 区域选择逻辑测试\n')

// 模拟区域选择逻辑
function selectOptimalRegion(languageCode: string): {
  region: string,
  model: string,
  description: string
} {
  const REGION_LANGUAGE_MAP: any = {
    'asia-southeast1': {
      languages: ['cmn-Hans-CN', 'cmn-Hant-TW', 'yue-Hant-HK'],
      model: 'chirp_2',
      description: '中文专用区域'
    },
    'asia-northeast1': {
      languages: ['en-US', 'ja-JP'],
      model: 'chirp_2',
      description: '英日文专用区域'
    },
    'us-central1': {
      languages: ['en-US', 'es-ES', 'fr-FR', 'de-DE'],
      model: 'chirp_2',
      description: '多语言支持区域'
    }
  }

  let selectedRegion: string

  if (languageCode.startsWith('cmn-') || languageCode.startsWith('yue-')) {
    selectedRegion = 'asia-southeast1'
  } else if (languageCode === 'en-US' || languageCode === 'ja-JP') {
    selectedRegion = 'asia-northeast1'
  } else {
    selectedRegion = 'us-central1'
  }

  const config = REGION_LANGUAGE_MAP[selectedRegion]

  return {
    region: selectedRegion,
    model: config.model,
    description: config.description
  }
}

// 测试用例
const testCases = [
  { lang: 'en-US', expectedRegion: 'asia-northeast1', desc: '英语' },
  { lang: 'cmn-Hans-CN', expectedRegion: 'asia-southeast1', desc: '简体中文' },
  { lang: 'cmn-Hant-TW', expectedRegion: 'asia-southeast1', desc: '繁体中文' },
  { lang: 'ja-JP', expectedRegion: 'asia-northeast1', desc: '日语' },
  { lang: 'es-ES', expectedRegion: 'us-central1', desc: '西班牙语' },
]

console.log('测试结果:\n')
console.log('语言代码'.padEnd(20) + '期望区域'.padEnd(25) + '实际区域'.padEnd(25) + '模型'.padEnd(15) + '结果')
console.log('─'.repeat(100))

let passCount = 0
let failCount = 0

testCases.forEach(test => {
  const result = selectOptimalRegion(test.lang)
  const pass = result.region === test.expectedRegion

  if (pass) passCount++
  else failCount++

  console.log(
    `${test.desc} (${test.lang})`.padEnd(20) +
    test.expectedRegion.padEnd(25) +
    result.region.padEnd(25) +
    result.model.padEnd(15) +
    (pass ? '✅ PASS' : '❌ FAIL')
  )
})

console.log('─'.repeat(100))
console.log(`\n📊 总计: ${testCases.length} 个测试, ${passCount} 通过, ${failCount} 失败\n`)

if (failCount === 0) {
  console.log('✅ 所有测试通过！区域选择逻辑正常工作。')
} else {
  console.log('❌ 部分测试失败，请检查区域选择逻辑。')
  process.exit(1)
}
