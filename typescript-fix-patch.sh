#!/bin/bash

echo "🔧 应用TypeScript类型错误修复..."

# 修复smart-ytdlp-updater.js中的类型错误
echo "修复 scripts/smart-ytdlp-updater.js..."

# 备份原文件
cp scripts/smart-ytdlp-updater.js scripts/smart-ytdlp-updater.js.backup

# 应用修复
sed -i 's/error\.message/error instanceof Error ? error.message : String(error)/g' scripts/smart-ytdlp-updater.js
sed -i 's/pm2Error\.message/pm2Error instanceof Error ? pm2Error.message : String(pm2Error)/g' scripts/smart-ytdlp-updater.js
sed -i 's/systemdError\.message/systemdError instanceof Error ? systemdError.message : String(systemdError)/g' scripts/smart-ytdlp-updater.js

# 修复具体的错误处理块
cat > /tmp/error_fix.patch << 'PATCH_EOF'
--- a/scripts/smart-ytdlp-updater.js
+++ b/scripts/smart-ytdlp-updater.js
@@ -114,8 +114,9 @@
       }
 
     } catch (error) {
-      await this.log('ERROR', `💥 更新流程异常: ${error.message}`, colors.red)
-      await this.updateStatus('error', `更新流程异常: ${error.message}`)
+      const errorMsg = error instanceof Error ? error.message : String(error)
+      await this.log('ERROR', `💥 更新流程异常: ${errorMsg}`, colors.red)
+      await this.updateStatus('error', `更新流程异常: ${errorMsg}`)
       throw error
     }
   }
@@ -206,15 +207,16 @@
       }
 
     } catch (error) {
-      await this.log('ERROR', `YT-DLP更新失败: ${error.message}`, colors.red)
+      const errorMsg = error instanceof Error ? error.message : String(error)
+      await this.log('ERROR', `YT-DLP更新失败: ${errorMsg}`, colors.red)
       
-      if (error.stdout) {
+      if (error && typeof error === 'object' && 'stdout' in error) {
         await this.log('DEBUG', `stdout: ${error.stdout}`, colors.blue)
       }
-      if (error.stderr) {
+      if (error && typeof error === 'object' && 'stderr' in error) {
         await this.log('DEBUG', `stderr: ${error.stderr}`, colors.red)
       }
 
       return {
         success: false,
-        error: error.message,
-        stdout: error.stdout || '',
-        stderr: error.stderr || ''
+        error: errorMsg,
+        stdout: (error && typeof error === 'object' && 'stdout' in error) ? error.stdout : '',
+        stderr: (error && typeof error === 'object' && 'stderr' in error) ? error.stderr : ''
       }
     }
   }
PATCH_EOF

echo "✅ TypeScript错误修复完成！"
echo "现在可以运行: npm run build"
