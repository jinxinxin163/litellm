// Define the available test modes
export const TEST_MODES = [
  { value: "chat", label: "聊天 - /chat/completions" },
  { value: "completion", label: "补全 - /completions" },
  { value: "embedding", label: "Embedding - /embeddings" },
  { value: "audio_speech", label: "语音合成 - /audio/speech" },
  { value: "audio_transcription", label: "音频转写 - /audio/transcriptions" },
  { value: "image_generation", label: "图像生成 - /images/generations" },
  { value: "image_edit", label: "图像编辑 - /images/edits" },
  { value: "video_generation", label: "视频生成 - /videos" },
  { value: "rerank", label: "Rerank - /rerank" },
  { value: "realtime", label: "Realtime - /realtime" },
  { value: "batch", label: "Batch - /batch" },
  { value: "ocr", label: "OCR - /ocr" },
];

// Define the available auto router routing strategies
export const AUTO_ROUTER_MODES = [
  { value: "simple-shuffle", label: "Simple Shuffle - 从可用模型中随机选择" },
  { value: "least-busy", label: "Least Busy - 路由到当前负载最低的模型" },
  { value: "latency-based", label: "Latency Based - 路由到响应时间最佳的模型" },
  { value: "cost-based", label: "Cost Based - 路由到成本最优的模型" },
  { value: "usage-based", label: "Usage Based - 根据历史用量模式路由" },
  { value: "custom", label: "Custom - 使用 config 中定义的自定义路由逻辑" },
];
