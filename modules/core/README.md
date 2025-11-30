应用核心架构文件梳理：
1. app.js
功能：全局工具箱管理系统
管理所有工具函数（addTool/getTool），支持懒加载代理替换
自动挂载到 window 对象，确保兼容性
统计工具调用次数、错误追踪
单例模式：AppGlobal 是全局唯一工具注册中心
2. boot.js
功能：应用启动总 orchestrator
六步启动流程：工具箱初始化 → 音频系统 → 统计数据加载 → 开始屏幕 → 配置检查 → 显示界面
动态切换"开始屏幕"与"标准模式"
处理调性/难度选择器的预选模式（播放中更改下题生效）
监听用户首次交互，恢复音频上下文
3. config.js
功能：音符与指板映射配置
notes：定义 36 个音符（C3-B5，覆盖 3 个八度）
ranges：划分音域（low/mid，各 12 个音）
map：音符 → 尤克里里指板坐标（弦、品格）的映射表
核心数据：所有模块共享的绝对真理
4. constants.js
功能：静态常量库
SAMPLER_CONFIG：Tone.Sampler 的采样文件映射（c3.mp3 等）
INTERVAL_INFO：音程理论数据（半音数、稳定度、色彩描述）
UI_TEXT：按钮文案统一入口
NOTE_FREQUENCIES：音符频率对照表
KEY_SCALES：7 个调的基础/扩展音阶定义
5. state.js
功能：应用运行时状态总容器**（核心中的核心）**
audio：音频上下文、采样器、音量、播放状态
quiz：当前题目、答题状态、锁、调性、难度、连胜统计
stats：今日练习数据、历史记录、分类统计（音级/音域/调性）
dom：缓存主按钮、答题区等 DOM 元素引用
响应式：所有模块只读，通过工具函数修改
6. tool-registry.js
功能：工具箱懒加载注册中心**（动态模块加载器）**
LAZY_TOOLS：定义 40+ 工具函数的动态 import 路径
createLazyProxy：首次调用时才加载模块，解决循环依赖
checkToolbox/debugToolbox：运行时诊断工具缺失
设计目标：启动快、内存省、模块解耦
整体架构关系：
boot.js 启动 → tool-registry.js 注册所有懒加载工具 → AppGlobal 统一管理 → 各模块通过 getTool 获取函数 → 实际调用时才触发 import() → 操作 AppState 状态 → UI 响应更新