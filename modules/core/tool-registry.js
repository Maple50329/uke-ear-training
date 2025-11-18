import AppGlobal from './app.js';

// 懒加载工具映射表
const LAZY_TOOLS = {
  // ==================== UI 反馈组件 ====================
  'showWelcomeOverlays': () => import('../ui/feedback.js').then(m => m.showWelcomeOverlays),
  'hideAllWelcomeOverlays': () => import('../ui/feedback.js').then(m => m.hideAllWelcomeOverlays),
  'updateCurrentPitchDisplay': () => import('../ui/feedback.js').then(m => m.updateCurrentPitchDisplay),
  'updateAllMessageDisplays': () => import('../ui/feedback.js').then(m => m.updateAllMessageDisplays),
  'updateMobileDescription': () => import('../ui/feedback.js').then(m => m.updateMobileDescription),
  'showAnswerFeedback': () => import('../ui/feedback.js').then(m => m.showAnswerFeedback),
  'updateIntervalDisplayInfo': () => import('../ui/feedback.js').then(m => m.updateIntervalDisplayInfo),
  'showUkulelePositions': () => import('../ui/feedback.js').then(m => m.showUkulelePositions),
  'initPitchVisualizer': () => import('../ui/feedback.js').then(m => m.initPitchVisualizer),
  'enableAnswerButtons': () => import('../ui/feedback.js').then(m => m.enableAnswerButtons),
  'disableAnswerButtons': () => import('../ui/feedback.js').then(m => m.disableAnswerButtons),
  'updateAnswerAreaState': () => import('../ui/feedback.js').then(m => m.updateAnswerAreaState),
  'updateModeButtonsVisualState': () => import('../ui/feedback.js').then(m => m.updateModeButtonsVisualState),
  'syncButtonStates': () => import('../ui/feedback.js').then(m => m.syncButtonStates),

  // ==================== 答题区管理 ====================
  'renderAnswerButtons': () => import('../ui/answer-grid.js').then(m => m.renderAnswerButtons),
  'initAnswerArea': () => import('../ui/answer-grid.js').then(m => m.initAnswerArea),
  'initScalingSystem': () => import('../ui/answer-grid.js').then(m => m.initScalingSystem),
  'adjustAnswerAreaScale': () => import('../ui/answer-grid.js').then(m => m.adjustAnswerAreaScale),
  'refreshMinHeight': () => import('../ui/answer-grid.js').then(m => m.refreshMinHeight),
  'forceRefreshScale': () => import('../ui/answer-grid.js').then(m => m.forceRefreshScale),
  'addVisualFeedback': () => import('../ui/answer-grid.js').then(m => m.addVisualFeedback),
  'clearVisualFeedback': () => import('../ui/answer-grid.js').then(m => m.clearVisualFeedback),

  // ==================== 按钮状态管理 ====================
  'updateResetButtonState': () => import('../ui/buttons.js').then(m => m.updateResetButtonState),
  'updateBigButtonState': () => import('../ui/buttons.js').then(m => m.updateBigButtonState),
  'initBigPlayButton': () => import('../ui/buttons.js').then(m => m.initBigPlayButton),
  'initAllButtons': () => import('../ui/buttons.js').then(m => m.initAllButtons),

  // ==================== 面板管理 ====================
  'initRightPanel': () => import('../quiz/history.js').then(m => m.initRightPanel),
  'initAllPanelFeatures': () => import('../ui/panel-manager.js').then(m => m.initAllPanelFeatures),
  'showInfoCards': () => import('../ui/panel-manager.js').then(m => m.showInfoCards),
  'hideInfoCards': () => import('../ui/panel-manager.js').then(m => m.hideInfoCards),
  'resetAnswerInfo': () => import('../ui/panel-manager.js').then(m => m.resetAnswerInfo),
  'addToHistory': () => import('../quiz/history.js').then(m => m.addToHistory),
  'updateRightPanelStats': () => import('../quiz/history.js').then(m => m.updateRightPanelStats),
  'initHistorySystem': () => import('../quiz/history.js').then(m => m.initHistorySystem),
  'updateAllHistoryDisplays': () => import('../quiz/history.js').then(m => m.updateAllHistoryDisplays),

  // ==================== 状态栏和UI组件 ====================
  'initStatusBar': () => import('../ui/status-bar.js').then(m => m.initStatusBar),
  'initUkuleleKeySelector': () => import('../theory/ukulele.js').then(m => m.initUkuleleKeySelector),
  'initBaseModeButtons': () => import('../ui/settings.js').then(m => m.initBaseModeButtons),
  'initMobileSidebar': () => import('../ui/settings.js').then(m => m.initMobileSidebar),
  'initInfoDisplaySlider': () => import('../ui/settings.js').then(m => m.initInfoDisplaySlider),

  // ==================== 测验核心功能 ====================
  'playQuizSequence': () => import('../quiz/manager.js').then(m => m.playQuizSequence),
  'checkAnswer': () => import('../quiz/manager.js').then(m => m.checkAnswer),
  'handleResetQuestion': () => import('../quiz/reset-manager.js').then(m => m.handleResetQuestion),

  // ==================== 音域管理 ====================
  'getCurrentRange': () => import('../ui/range-manager.js').then(m => m.getCurrentRange),
  'applyPendingRangeChange': () => import('../ui/range-manager.js').then(m => m.applyPendingRangeChange),
  'updateRange': () => import('../ui/range-manager.js').then(m => m.updateRange),
  'getCurrentKey': () => import('../ui/range-manager.js').then(m => m.getCurrentKey),

  // ==================== 音频管理 ====================
  'stopPlayback': () => import('../audio/engine.js').then(m => m.stopPlayback),
  'playNoteSampler': () => import('../audio/engine.js').then(m => m.playNoteSampler),
  // ==================== 新增DOM访问工具 ====================
  'getAnswerTransformWrapper': () => Promise.resolve(() => document.getElementById('answerTransformWrapper')),
  'getAnsArea': () => Promise.resolve(() => document.getElementById('ans')),
  'getMsgDisplay': () => Promise.resolve(() => document.getElementById('msg')),
  'getBigPlayButton': () => Promise.resolve(() => document.getElementById('big-play-btn')),
  'getStartButton': () => Promise.resolve(() => document.getElementById('startBtn')),
  'getStatusBox': () => Promise.resolve(() => document.getElementById('statusBox')),
  
  // ==================== 新增UI状态工具 ====================
  'getAppState': () => Promise.resolve(() => window.AppState),
  'updateAppState': () => Promise.resolve((key, value) => {
    if (window.AppState) window.AppState[key] = value;
  }),
};

export function registerAllTools() {  
  // 只注册懒加载代理
  registerLazyProxies();
  return { successCount: Object.keys(LAZY_TOOLS).length, failedTools: [] };
}

// 注册懒加载代理
function registerLazyProxies() {
  Object.keys(LAZY_TOOLS).forEach(toolName => {
    // 创建懒加载代理
    const lazyProxy = createLazyProxy(toolName, LAZY_TOOLS[toolName]);
    AppGlobal.addTool(toolName, lazyProxy);
  });
}

// 创建懒加载代理函数
function createLazyProxy(toolName, loader) {
  let loadedTool = null;
  let loadingPromise = null;
  
  const proxyFunction = async function(...args) {
    if (loadedTool) return loadedTool(...args);
    if (loadingPromise) {
      const tool = await loadingPromise;
      return tool(...args);
    }
    
    loadingPromise = loader()
      .then(tool => {
        loadedTool = tool;
        AppGlobal.addTool(toolName, tool);
        return tool;
      })
      .catch(error => {
        console.error(`❌ 懒加载失败: ${toolName}`, error);
        loadingPromise = null;
        throw error;
      });
    
    return loadingPromise.then(tool => tool(...args));
  };
  
  proxyFunction._isLazyProxy = true;
  proxyFunction._toolName = toolName;
  
  return proxyFunction;
}

// 按功能分组（用于文档和调试）
export const TOOL_GROUPS = {
  UI_FEEDBACK: [
    'updateCurrentPitchDisplay',
    'updateAllMessageDisplays',
    'showAnswerFeedback',
    'disableAnswerButtons'
  ],
  ANSWER_SYSTEM: [
    'renderAnswerButtons',
    'initAnswerArea',
    'checkAnswer'
  ],
  QUIZ_CORE: [
    'playQuizSequence',
    'handleResetQuestion',
    'updateBigButtonState'
  ],
  PANEL_MANAGEMENT: [
    'initRightPanel',
    'initAllPanelFeatures',
    'updateRightPanelStats'
  ]
};

export function checkToolbox() {
  const criticalTools = [
    'renderAnswerButtons',
    'updateCurrentPitchDisplay',
    'playQuizSequence',
    'checkAnswer',
    'disableAnswerButtons'
  ];
  
  const missingTools = criticalTools.filter(tool => !AppGlobal.hasTool(tool));
  const allAvailable = missingTools.length === 0;
  
  if (!allAvailable) {
    console.group('🔧 工具箱检查');
    console.warn('缺失的关键工具:', missingTools);
    criticalTools.forEach(tool => {
      const toolFunc = AppGlobal.getTool(tool);
      const status = toolFunc ? (toolFunc._isLazyProxy ? '⏳' : '✅') : '❌';
      console.log(`${status} ${tool}`);
    });
    console.groupEnd();
  }
  
  return allAvailable;
}

export function debugToolbox() {
  const allTools = Object.keys(LAZY_TOOLS);
  const loaded = allTools.filter(tool => {
    const toolFunc = AppGlobal.getTool(tool);
    return toolFunc && !toolFunc._isLazyProxy;
  });
  const lazy = allTools.filter(tool => {
    const toolFunc = AppGlobal.getTool(tool);
    return toolFunc && toolFunc._isLazyProxy;
  });
  const missing = allTools.filter(tool => !AppGlobal.hasTool(tool));
  
  console.log(`📊 工具箱状态: ${loaded.length}已加载 ${lazy.length}懒加载 ${missing.length}缺失`);
  
  if (loaded.length > 0) {
    console.log('✅ 已加载:', loaded);
  }
  if (lazy.length > 0) {
    console.log('⏳ 懒加载:', lazy);
  }
  if (missing.length > 0) {
    console.warn('❌ 缺失:', missing);
  }
  
  return { loaded, lazy, missing };
}

// 获取工具加载状态
export function getToolStatus(toolName) {
  if (!LAZY_TOOLS[toolName]) return 'unknown';
  
  const toolFunc = AppGlobal.getTool(toolName);
  if (!toolFunc) return 'not_registered';
  if (toolFunc._isLazyProxy) return 'lazy_loaded';
  return 'fully_loaded';
}