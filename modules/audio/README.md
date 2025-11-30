音频模块逻辑梳理，按功能分类整理：
1. custom-sampler.js
功能：独立音符采样管理
管理单个音符的加载、播放与清理（基于 Tone.js Player）
用 Map 缓存加载好的音频实例，避免重复加载
支持批量加载和自动释放资源
单例模式，全局唯一实例 customSampler
2. playback-manager.js
功能：统一播放调度器
核心职责：在自定义采样和默认 Tone.Sampler 间智能切换
优先使用自定义采样 → 失败则回退到 Tone.js 默认采样
提供 playNote 统一接口，隐藏底层实现细节
管理采样重新加载和模式切换
3. engine.js
功能：音频引擎核心与浏览器兼容处理
初始化 Tone.Sampler 和音频上下文
关键：处理浏览器自动播放限制（用户交互后恢复 AudioContext）
管理音频节点连接（Sampler → masterVolume → 输出）
提供播放/停止控制、stopAllAudio 等全局方法
4. sampler-manager.js
功能：采样文件与 UI 状态管理
处理用户上传的采样文件（Blob URL）
维护 24 个音符的加载状态（2个八度）
实时渲染加载进度到页面（彩色格子显示）
提供 reset() 一键恢复默认钢琴采样
5. sfx.js
功能：独立音效系统
仅管理对错音效（correct.mp3 / error.mp3）
使用 Tone.Sampler 加载，连接主音量
与音乐采样完全隔离，避免相互干扰
6. volume.js
功能：主音量控制
创建 Tone.Volume 作为主音量总线
处理静音逻辑（保存上次音量值）
更新 UI 显示（百分比、图标切换）
影响范围：控制所有 Tone.js 音频，不影响原生 HTML5 Audio
整体架构关系：
playbackManager 是统一入口 → 决策用 customSampler 还是 Tone.Sampler → 最终都经过 masterVolume → 输出到扬声器