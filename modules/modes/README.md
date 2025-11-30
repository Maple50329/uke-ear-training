模式管理系统核心逻辑梳理：
1. challenge-mode.js / focused-training.js
功能：未完成的模式占位符（镜像结构）
仅初始化空壳，实际功能回退到标准模式
显示"🎹 即将推出"提示
构造函数标记 isInitialized 状态
cleanup() 预留资源清理接口
2. standard-mode.js
功能：题目状态恢复与续答逻辑**（核心）**
智能检测：进入时检查是否有未完成题目
三态分支：
未完成 → 弹出确认框（继续/重开）
已完成 → 直接显示"下一题"按钮
无题目 → 完全重置到初始状态
安全调用：safeCallTool() 包装所有工具调用，防崩溃
状态锁：播放中锁定答题按钮，防止误触
3. start-screen.css
功能：开始屏幕的响应式视觉设计**（全平台适配）**
桌面端：三卡片横向排列，hover 上浮效果
移动端：重构为横向滑动卡片（scroll-snap 实现）
叙事设计：品牌区渐变背景 → 模式选择 → 底部统计
暗色主题：prefers-color-scheme 自动切换
动画：卡片依次上浮 0.6s 渐入
4. start-screen.js
功能：模式切换总控制器**（应用入口）**
三模式管理：StandardMode/ChallengeMode/FocusedTraining
移动端导航：动态绑定 prev/next 按钮，节流防重复
标题栏标识：动态添加 .challenge-indicator 等模式标签
ESC 返回：全局监听，带确认对话框防误触
音频清理：forceStopAllAudio() 强制停止 Tone.js Transport
统计加载：调用 statsManager.getQuickStats() 刷新开始屏幕数据
整体流程：
start-screen.js 监听模式选择 → 实例化对应模式类 → standard-mode.js 处理题目恢复逻辑 → 调用工具函数渲染 UI → 进入标准答题循环