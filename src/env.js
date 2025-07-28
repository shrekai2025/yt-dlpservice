import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    NODE_ENV: z.enum(["development", "test", "production"]),
    DATABASE_URL: z.string().min(1),
    
    // 通义听悟API配置
    TINGWU_ACCESS_KEY_ID: z.string().min(1).optional(),
    TINGWU_ACCESS_KEY_SECRET: z.string().min(1).optional(),
    TINGWU_REGION: z.string().min(1).default("cn-beijing"),
    
    // 应用配置
    MAX_CONCURRENT_TASKS: z.string().transform(val => parseInt(val)).pipe(z.number().positive()).default("10"),
    TEMP_DIR: z.string().min(1).default("/tmp/yt-dlpservice"),
    AUDIO_FORMAT: z.string().min(1).default("mp3"),
    AUDIO_BITRATE: z.string().min(1).default("128k"),
    
    // 文件清理配置
    MAX_FILE_AGE_HOURS: z.string().transform(val => parseInt(val)).pipe(z.number().positive()).default("1"),
    CLEANUP_INTERVAL_HOURS: z.string().transform(val => parseInt(val)).pipe(z.number().positive()).default("24"),
    
    // Puppeteer 配置
    PUPPETEER_HEADLESS: z.string().transform(val => val === "true").default("false"), // 生产环境设为 true
    PUPPETEER_ARGS: z.string().default("--no-sandbox --disable-setuid-sandbox"), // Ubuntu 服务器安全配置
    BROWSER_DATA_DIR: z.string().min(1).default("./data/browser_data"), // 浏览器数据目录
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    
    TINGWU_ACCESS_KEY_ID: process.env.TINGWU_ACCESS_KEY_ID,
    TINGWU_ACCESS_KEY_SECRET: process.env.TINGWU_ACCESS_KEY_SECRET,
    TINGWU_REGION: process.env.TINGWU_REGION,
    
    MAX_CONCURRENT_TASKS: process.env.MAX_CONCURRENT_TASKS,
    TEMP_DIR: process.env.TEMP_DIR,
    AUDIO_FORMAT: process.env.AUDIO_FORMAT,
    AUDIO_BITRATE: process.env.AUDIO_BITRATE,
    
    MAX_FILE_AGE_HOURS: process.env.MAX_FILE_AGE_HOURS,
    CLEANUP_INTERVAL_HOURS: process.env.CLEANUP_INTERVAL_HOURS,
    
    PUPPETEER_HEADLESS: process.env.PUPPETEER_HEADLESS,
    PUPPETEER_ARGS: process.env.PUPPETEER_ARGS,
    BROWSER_DATA_DIR: process.env.BROWSER_DATA_DIR,
    // NEXT_PUBLIC_CLIENTVAR: process.env.NEXT_PUBLIC_CLIENTVAR,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
