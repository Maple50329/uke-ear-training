import { AppState } from '../core/state.js';
import { UI_TEXT, KEY_SCALES } from '../core/constants.js';
import { updateBigButtonState } from '../ui/buttons.js';
import { disableAnswerButtons,updateAllMessageDisplays ,showWelcomeOverlays } from '../ui/feedback.js';
import { resetAnswerInfo, hideInfoCards } from '../ui/panel-manager.js';
import { resetErrorCount } from '../quiz/error-limit-manager.js';
import statsManager from './stats-manager.js';
import AppGlobal from '../core/app.js';

function resetAnswerUI() {
  const ansArea = document.getElementById('ans');
  if (!ansArea) return;
  
  const buttons = ansArea.querySelectorAll('.key-btn');
  buttons.forEach(btn => {
      btn.classList.remove(
          'hit', 'miss', 
          'scale-playing', 'reference-playing', 'target-playing',
          'active', 'highlight', 'pulse', 'glow'
      );
      
      // 重置所有内联样式为空
      btn.style.backgroundColor = '';
      btn.style.borderColor = '';
      btn.style.boxShadow = '';
      btn.style.transform = '';
      btn.style.opacity = '';
      btn.style.filter = '';
      btn.style.pointerEvents = '';
      btn.style.cursor = '';
      btn.disabled = true;
  });
  
  // 重置答题区容器样式
  ansArea.style.opacity = '';
  ansArea.style.pointerEvents = '';
  ansArea.classList.add('disabled');
}
// 重置到欢迎界面状态
function resetToWelcomeScreen() {
  // 显示欢迎覆盖层
  showWelcomeOverlays();
  
  // 重置消息显示
  updateAllMessageDisplays('已复位，点击开始练习');
  
  // 彻底锁定答题区
  const ansArea = document.getElementById('ans');
  if (ansArea) {
    ansArea.classList.add('disabled');
    const buttons = ansArea.querySelectorAll('.key-btn');
    buttons.forEach(btn => {
      btn.classList.remove('hit', 'miss', 'scale-playing', 'reference-playing', 'target-playing');
      btn.disabled = true;
    });
  }
  
  // 重置主按钮
  if (AppState.dom.mainBtn) {
    AppState.dom.mainBtn.textContent = UI_TEXT.INITIAL;
  }
  
  // 🔴 修复：确保大播放按钮状态更新
  const updateBigButtonState = AppGlobal.getTool('updateBigButtonState');
  const updateResetButtonState = AppGlobal.getTool('updateResetButtonState');
  if (updateBigButtonState) updateBigButtonState();
  if (updateResetButtonState) updateResetButtonState();
  
  // 隐藏信息卡片
  const hideCards = AppGlobal.getTool('hideInfoCards');
  const resetInfo = AppGlobal.getTool('resetAnswerInfo');
  if (hideCards) hideCards();
  if (resetInfo) resetInfo();
  
  // 重置音高显示
  const updatePitch = AppGlobal.getTool('updateCurrentPitchDisplay');
  if (updatePitch) updatePitch('--', null);
  
  // 🔴 关键修复：重新初始化答题区
  setTimeout(() => {
    const initAnswerArea = AppGlobal.getTool('initAnswerArea');
    if (initAnswerArea) {
      console.log('🔄 复位后重新初始化答题区');
      initAnswerArea();
    } else {
      console.error('❌ initAnswerArea 工具未找到');
    }
  }, 100);
}

function handleResetQuestion() {
  console.log('🔄 执行彻底复位');
  
  // 1. 重置错误次数
  const resetErrorCount = AppGlobal.getTool('resetErrorCount');
    if (resetErrorCount) {
        resetErrorCount();
    }

  // 2. 设置复位标志
  AppState.quiz.fromReset = true;
  AppState.audio.shouldStop = true;
  
  // 3. 立即停止所有音频
  const stopPlayback = AppGlobal.getTool('stopPlayback');
  if (stopPlayback) stopPlayback();
  
  // 4. 清除自动下一题定时器
  if (AppState.quiz.autoNextTimer) {
    clearTimeout(AppState.quiz.autoNextTimer);
    AppState.quiz.autoNextTimer = null;
  }
  
  // 5. 取消统计记录
  if (typeof statsManager !== 'undefined' && statsManager && typeof statsManager.cancelCurrentQuestion === 'function') {
    statsManager.cancelCurrentQuestion();
  }
  
  // 6. 清理视觉反馈定时器
  if (window.visualFeedbackTimer) {
    clearTimeout(window.visualFeedbackTimer);
    window.visualFeedbackTimer = null;
  }
  
  // 7. 清理所有可能的延迟定时器
  const allTimers = [
    'scalePlayTimer', 'referencePlayTimer', 'targetPlayTimer',
    'scaleDelay', 'referenceDelay', 'targetDelay', 'noteIntervalDelay',
    'currentDelayTimer' // 来自 interruptibleDelay 的定时器
  ];
  allTimers.forEach(timer => {
    if (window[timer]) {
      clearTimeout(window[timer]);
      window[timer] = null;
    }
  });
  
  // 8. 彻底重置状态
  AppState.quiz.hasStarted = false;
  AppState.quiz.answered = false;
  AppState.quiz.hasAnsweredCurrent = false;
  AppState.quiz.attemptCount = 0;
  AppState.quiz.isReplayMode = false;
  AppState.quiz.currentTargetNote = null;
  AppState.quiz.currentNoteIdx = -1;
  AppState.quiz.locked = false;
  AppState.ui.firstPlay = true;
  AppState.audio.isPlaying = false;
  
  // 8. 清理预选状态
  AppState.quiz.pendingKeyChange = null;
  AppState.quiz.pendingBaseModeChange = null;
  AppState.quiz.pendingDifficultyChange = null;
  AppState.quiz.pendingRangeChange = null;
  
  // 10. 立即重置UI到初始状态
  resetToWelcomeScreen();
  syncStatusBarAfterReset();
  console.log('✅ 复位完成 - 回到初始状态');
  
  // 延迟清除复位标志
  setTimeout(() => {
    AppState.audio.shouldStop = false;
    AppState.quiz.fromReset = false;
    console.log('🔄 复位标志已清除，可以重新开始练习');
  }, 200);
}

// 复位后同步状态栏
function syncStatusBarAfterReset() {
  // 短暂延迟确保DOM已更新
  setTimeout(() => {
    // 从左侧面板读取当前设置
    const activeModeBtn = document.querySelector('.mode-btn.active');
    const baseMode = activeModeBtn ? activeModeBtn.dataset.mode : 'c';
    const keySelect = document.getElementById('keySelect');
    const currentKey = keySelect ? keySelect.value : 'C';
    const difficultySelect = document.getElementById('difficultySelect');
    const currentDifficulty = difficultySelect ? difficultySelect.value : 'basic';
    const activeRangeBtn = document.querySelector('.range-btn.active');
    const currentRange = activeRangeBtn ? activeRangeBtn.dataset.range : 'low';
    
    console.log('🔄 从面板读取的设置:', { 
      baseMode, currentKey, currentDifficulty, currentRange 
    });
    
    // 更新 AppState 中的设置状态
    AppState.quiz.questionBaseMode = baseMode;
    AppState.quiz.currentKey = currentKey;
    AppState.quiz.currentDifficulty = currentDifficulty;  // 确保难度被更新
    AppState.quiz.currentRange = currentRange;
    
    // 清除所有预选状态
    AppState.quiz.pendingKeyChange = null;
    AppState.quiz.pendingBaseModeChange = null;
    AppState.quiz.pendingDifficultyChange = null;
    AppState.quiz.pendingRangeChange = null;
    
    // 强制触发所有相关事件
    window.dispatchEvent(new CustomEvent('settings-updated'));
    window.dispatchEvent(new CustomEvent('base-mode-changed', {
      detail: { mode: baseMode }
    }));
    window.dispatchEvent(new CustomEvent('range-changed', {
      detail: { range: currentRange }
    }));
    
    // 专门触发难度变化事件
    window.dispatchEvent(new CustomEvent('difficulty-changed', {
      detail: { difficulty: currentDifficulty }
    }));
    
    window.dispatchEvent(new CustomEvent('quiz-reset-complete'));
    
    console.log('🔄 状态栏已同步:', { 
      baseMode, 
      currentKey, 
      currentDifficulty, 
      currentRange 
    });
  }, 100);
}

function resetCompleteExerciseState() {
  const hideCards = AppGlobal.getTool('hideInfoCards') || hideInfoCards;
  const resetInfo = AppGlobal.getTool('resetAnswerInfo') || resetAnswerInfo;
  const disableButtons = AppGlobal.getTool('disableAnswerButtons') || disableAnswerButtons;
  const updateRangeFunc = AppGlobal.getTool('updateRange'); 
  // 重置错误次数
  resetErrorCount();
  // ========== 统一处理所有待处理设置 ==========
  const pendingChanges = {};
  
  // 1. 基准音模式 - 按钮组
  if (AppState.quiz.pendingBaseModeChange) {
    AppState.quiz.questionBaseMode = AppState.quiz.pendingBaseModeChange;
    pendingChanges.baseMode = AppState.quiz.pendingBaseModeChange;
  } else {
    const activeModeBtn = document.querySelector('.mode-btn.active');
    AppState.quiz.questionBaseMode = activeModeBtn ? activeModeBtn.dataset.mode : 'c';
  }
  
  // 2. 调性 - 下拉选择
  if (AppState.quiz.pendingKeyChange) {
    AppState.quiz.currentKey = AppState.quiz.pendingKeyChange;
    pendingChanges.key = AppState.quiz.pendingKeyChange;
  } else {
    const keySelect = document.getElementById('keySelect');
    AppState.quiz.currentKey = keySelect ? keySelect.value : 'C';
  }
  
  // 3. 难度 - 下拉选择
  if (AppState.quiz.pendingDifficultyChange) {
    AppState.quiz.currentDifficulty = AppState.quiz.pendingDifficultyChange;
    pendingChanges.difficulty = AppState.quiz.pendingDifficultyChange;
  } else {
    const difficultySelect = document.getElementById('difficultySelect');
    AppState.quiz.currentDifficulty = difficultySelect ? difficultySelect.value : 'basic';
  }
  
// 4. 音域 - 关键修复：确保实际应用音域更改
let rangeToApply;
if (AppState.quiz.pendingRangeChange) {
    rangeToApply = AppState.quiz.pendingRangeChange;
    pendingChanges.range = rangeToApply;
    AppState.quiz.currentRange = rangeToApply;
} else {
    const activeRangeBtn = document.querySelector('.range-btn.active');
    rangeToApply = activeRangeBtn ? activeRangeBtn.dataset.range : 'low';
    AppState.quiz.currentRange = rangeToApply;
}

// 实际应用音域更改到UI
if (updateRangeFunc && rangeToApply) {
    updateRangeFunc(rangeToApply);
}

// 统一清除所有待处理状态（除了音域）
AppState.quiz.pendingKeyChange = null;
AppState.quiz.pendingBaseModeChange = null;
AppState.quiz.pendingDifficultyChange = null;
  
  // 清理自动下一题定时器
  if (AppState.quiz.autoNextTimer) {
    clearTimeout(AppState.quiz.autoNextTimer);
    AppState.quiz.autoNextTimer = null;
  }
  
  // 添加安全检查
  if (typeof statsManager !== 'undefined' && statsManager && typeof statsManager.cancelCurrentQuestion === 'function') {
    statsManager.cancelCurrentQuestion();
  } else {
    console.warn('⚠️ statsManager 不可用，跳过取消统计');
  }
  
  // 重置数据状态
  AppState.quiz.answered = false;
  AppState.quiz.hasStarted = false;
  AppState.quiz.isReplayMode = false;
  AppState.quiz.currentTargetNote = null;
  AppState.quiz.currentNoteIdx = -1;
  AppState.quiz.hasAnsweredCurrent = false;
  AppState.quiz.attemptCount = 0;
  
  // 更新复位按钮状态
  const updateResetButtonState = AppGlobal.getTool('updateResetButtonState');
  updateResetButtonState?.();
  
  // 隐藏信息卡片
  if (hideCards) {
    hideCards();
  }

  // 重置信息显示
  if (resetInfo) {
    resetInfo();
  }
  
  // 确保答题区保持显示状态
  if (AppState.dom.ansArea) {
    AppState.dom.ansArea.style.display = 'grid';
    disableButtons();
  }
  
  // ========== 统一触发设置更新事件 ==========
  // 触发通用设置更新事件
  window.dispatchEvent(new CustomEvent('settings-updated'));
  
  // 触发复位完成事件，包含所有应用的变化
  window.dispatchEvent(new CustomEvent('pending-changes-applied', {
    detail: {
      baseMode: AppState.quiz.questionBaseMode,
      key: AppState.quiz.currentKey,
      difficulty: AppState.quiz.currentDifficulty,
      range: AppState.quiz.currentRange
    }
  }));
  
  // 触发复位事件
  window.dispatchEvent(new CustomEvent('quiz-reset'));
}

// 检查是否开启自动播放
function shouldAutoPlayNext() {
  return document.getElementById('autoNextCheckbox')?.checked ?? false;
}

// 开始新题目
function startNewQuestionWithCurrentSettings() {
  // 短暂延迟以确保UI更新完成
  setTimeout(() => {
    if (AppState.dom.mainBtn && !AppState.quiz.locked) {
      AppState.dom.mainBtn.click(); // 触发播放新题目
    }
  }, 300);
}

function resetToInitialState() {
  // 非自动播放模式下的特定重置
  const message = '已重置，点击播放开始练习';
  updateAllMessageDisplays(message);
  
  // 确保大播放按钮状态正确
  const bigPlayBtn = document.getElementById('big-play-btn');
  if (bigPlayBtn) {
    bigPlayBtn.classList.remove('disabled', 'playing');
    const textEl = bigPlayBtn.querySelector('.big-play-text');
    if (textEl) textEl.textContent = UI_TEXT.INITIAL;
  }
  
  // 更新主按钮状态
  if (window.updateBigButtonState) {
    window.updateBigButtonState();
  }
}

function showResetFeedback() {
  const message = shouldAutoPlayNext() 
    ? '已重置，正在准备新题目...' 
    : '已重置，点击播放开始练习';
  
  // 显示提示信息
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
  }
}

export {
    resetAnswerUI,
    resetToWelcomeScreen,
    handleResetQuestion,
    resetCompleteExerciseState,
    syncStatusBarAfterReset
};