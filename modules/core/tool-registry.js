// modules/core/tool-registry.js
import AppGlobal from './app.js';
import * as Feedback from '../ui/feedback.js';
import * as AnswerGrid from '../ui/answer-grid.js';
import * as PanelManager from '../ui/panel-manager.js';
import * as QuizManager from '../quiz/manager.js';
import * as History from '../quiz/history.js';
import * as ResetManager from '../quiz/reset-manager.js';
import * as RangeManager from '../ui/range-manager.js';
import { initRightPanel } from '../quiz/history.js';

const CORE_TOOLS = {
  'hideAllWelcomeOverlays': Feedback.hideAllWelcomeOverlays,
  'updateModeButtonsVisualState': Feedback.updateModeButtonsVisualState,
  'updateAnswerAreaState': Feedback.updateAnswerAreaState,
  'enableAnswerButtons': Feedback.enableAnswerButtons,
  'syncButtonStates': Feedback.syncButtonStates,
  'updateIntervalDisplayInfo': Feedback.updateIntervalDisplayInfo,
  'showUkulelePositions': Feedback.showUkulelePositions,
  'showAnswerFeedback': Feedback.showAnswerFeedback,
  'updateCurrentPitchDisplay': Feedback.updateCurrentPitchDisplay,
  'disableAnswerButtons': Feedback.disableAnswerButtons,
  'showWelcomeOverlays': Feedback.showWelcomeOverlays,
  'renderAnswerButtons': AnswerGrid.renderAnswerButtons,
  'showInfoCards': PanelManager.showInfoCards,
  'hideInfoCards': PanelManager.hideInfoCards,
  'resetAnswerInfo': PanelManager.resetAnswerInfo,
  'playQuizSequence': QuizManager.playQuizSequence,
  'checkAnswer': QuizManager.checkAnswer,
  'handleResetQuestion': ResetManager.handleResetQuestion,
  'initRightPanel': History.initRightPanel,
  'updateRightPanelStats': History.updateRightPanelStats,
  'addToHistory': History.addToHistory,
  'getCurrentRange': RangeManager.getCurrentRange,
  'applyPendingRangeChange': RangeManager.applyPendingRangeChange,
  'updateRange': RangeManager.updateRange
};

export function registerAllTools() {
  let successCount = 0;
  const failedTools = [];
  
  Object.entries(CORE_TOOLS).forEach(([name, toolFunction]) => {
    if (toolFunction && typeof toolFunction === 'function') {
      AppGlobal.addTool(name, toolFunction);
      successCount++;
    } else {
      failedTools.push(name);
    }
  });
  
  // 只保留必要的错误提示
  if (failedTools.length > 0) {
    console.warn(`🛠️ 工具注册: ${successCount}成功 ${failedTools.length}失败`);
  }
  
  return { successCount, failedTools };
  AppGlobal.register('initRightPanel', initRightPanel);
}

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
      console.log(`${AppGlobal.hasTool(tool) ? '✅' : '❌'} ${tool}`);
    });
    console.groupEnd();
  }
  
  return allAvailable;
}

export function debugToolbox() {
  const allTools = Object.keys(CORE_TOOLS);
  const registered = allTools.filter(tool => AppGlobal.hasTool(tool));
  const missing = allTools.filter(tool => !AppGlobal.hasTool(tool));
  
  console.log(`📊 工具箱: ${registered.length}/${allTools.length} 个工具`);
  
  if (missing.length > 0) {
    console.warn('缺失工具:', missing);
  }
  
  return { registered, missing };
}