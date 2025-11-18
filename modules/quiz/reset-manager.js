import { AppState } from '../core/state.js';
import { UI_TEXT, KEY_SCALES } from '../core/constants.js';
import { updateBigButtonState } from '../ui/buttons.js';
import { disableAnswerButtons,updateAllMessageDisplays } from '../ui/feedback.js';
import { resetAnswerInfo, hideInfoCards } from '../ui/panel-manager.js';
import statsManager from './stats-manager.js';
// 导入工具箱
import AppGlobal from '../core/app.js';

function resetAnswerUI() {
  // 重置所有按键状态
  const keyButtons = document.querySelectorAll('.key-btn');
  keyButtons.forEach(btn => {
    btn.classList.remove('hit', 'miss');
    btn.disabled = false;
    btn.style.pointerEvents = 'auto';
    btn.style.opacity = '1';
  });
}

// 重置到欢迎界面状态
function resetToWelcomeScreen() {
  AppState.ui.firstPlay = true;
  
  // 重置当前题目的尝试状态
  AppState.quiz.hasAnsweredCurrent = false;
  AppState.quiz.attemptCount = 0;
  
  // 清理所有预选状态
  AppState.quiz.pendingKeyChange = null;
  AppState.quiz.pendingBaseModeChange = null;
  AppState.quiz.pendingDifficultyChange = null;
  
  // 使用工具箱显示欢迎界面
  const showWelcome = AppGlobal.getTool('showWelcomeOverlays');
  showWelcome();
  
  // 重置消息显示
  if (AppState.dom.msgDisplay) {
      updateAllMessageDisplays('点击开始练习');
      AppState.dom.msgDisplay.style.display = 'block';
  }
  
  if (window.updateBigButtonState) {
      window.updateBigButtonState();
    }
}

function handleResetQuestion() {
  if (AppState.quiz.locked) return;

  const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState');
  const updatePitch = AppGlobal.getTool('updateCurrentPitchDisplay');
  const renderFunc = AppGlobal.getTool('renderAnswerButtons');
  const disableButtons = AppGlobal.getTool('disableAnswerButtons');
  const resetInfo = AppGlobal.getTool('resetAnswerInfo');
  
  // 添加安全检查
  if (typeof statsManager !== 'undefined' && statsManager && typeof statsManager.cancelCurrentQuestion === 'function') {
    statsManager.cancelCurrentQuestion();
  }

  // 在复位开始时清理预选状态
  AppState.quiz.pendingKeyChange = null;
  AppState.quiz.pendingBaseModeChange = null;
  AppState.quiz.pendingDifficultyChange = null;
  
  // 欢迎界面重置
  resetToWelcomeScreen();
  updateModeVisuals();
  
  // 确保基准音按钮可用
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(btn => {
    btn.disabled = false;
  });

  // 立即重置主显示（先清掉旧内容）
  updatePitch(null, null);

  AppState.quiz.fromReset = true;
  if (AppState.dom.msgDisplay) {
    updateAllMessageDisplays('已重置练习状态');
    AppState.dom.msgDisplay.style.display = 'block';
  }

  // ===== 统一处理难度选择逻辑 =====
  // 1. 首先检查是否有待应用的预选难度（最高优先级）
  const pendingDifficulty = AppState.quiz.pendingDifficultyChange;

  // 2. 获取当前选择器的值（桌面端和移动端）
  const mobileSelect = document.getElementById('mobileDifficultySelect');
  const desktopSelect = document.getElementById('difficultySelect');

  // 3. 判断哪个选择器当前可见（移动端优先）
  const currentSelectValue = (mobileSelect && mobileSelect.offsetParent !== null) 
    ? mobileSelect.value 
    : (desktopSelect?.value || 'basic');

  // 4. 确定最终难度：预选值 > 当前选择器值 > 默认值
  const difficulty = pendingDifficulty || currentSelectValue;

  // 5. 同步更新AppState，确保状态一致
  AppState.quiz.currentDifficulty = difficulty;
  AppState.quiz.currentKey = document.getElementById('keySelect')?.value || 'C';

  // 6. 清除已应用的预选状态
  AppState.quiz.pendingDifficultyChange = null;
  AppState.quiz.pendingKeyChange = null;
  AppState.quiz.pendingBaseModeChange = null;
  // ===== 结束 =====

  // 计算正确的音阶
  const scale = difficulty === 'basic'
    ? KEY_SCALES[AppState.quiz.currentKey]?.basic || KEY_SCALES.C.basic
    : KEY_SCALES[AppState.quiz.currentKey]?.extended || KEY_SCALES.C.extended;

  // 强制清除并重新渲染答题区，确保清除旧内容
  if (AppState.dom.ansArea) {
    AppState.dom.ansArea.innerHTML = ''; // 清除现有按钮
    AppState.dom.ansArea.style.display = 'grid';
    AppState.dom.ansArea.style.opacity = '1';
  }

  // 渲染新按钮
  renderFunc(scale, difficulty);

  // 禁用按钮
  disableButtons();

  // 添加延迟检查和调整，确保渲染完全应用
  setTimeout(() => {
    // 调整答题区缩放
    const adjustScaleFunc = AppGlobal.getTool('adjustAnswerAreaScale');
    adjustScaleFunc?.();
    
    // 验证并记录（调试用，可移除）
    const actualButtons = AppState.dom.ansArea?.querySelectorAll('.key-btn');
    const expectedCount = difficulty === 'basic' ? 8 : 13;
    if (actualButtons && actualButtons.length !== expectedCount) {
      console.error(`❌ 答题区按钮数量错误：预期${expectedCount}个，实际${actualButtons.length}个`);
    }
  }, 100);

  // 取消自动播放的勾选
  const autoNextCheckbox = document.getElementById('autoNextCheckbox');
  if (autoNextCheckbox) {
    autoNextCheckbox.checked = false;
    
    // 同时禁用时间滑块
    const timeSlider = document.getElementById('infoDisplayTime');
    if (timeSlider) {
      timeSlider.disabled = true;
    }
    
    // 更新时间显示的不透明度
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
      timeDisplay.style.opacity = '0.5';
    }
  }

  // 重置主按钮状态
  if (AppState.dom.mainBtn) {
    AppState.dom.mainBtn.textContent = UI_TEXT.INITIAL;
    updateBigButtonState();
  }

  // 重置大播放按钮状态
  const bigPlayBtn = document.getElementById('big-play-btn');
  if (bigPlayBtn) {
    bigPlayBtn.classList.remove('disabled');
    const textEl = bigPlayBtn.querySelector('.big-play-text');
    if (textEl) textEl.textContent = UI_TEXT.INITIAL;
  }

  // 重置消息显示
  if (AppState.dom.msgDisplay) {
    updateAllMessageDisplays('点击开始练习');
    AppState.dom.msgDisplay.style.display = 'block';
  }

  // 重置完整状态
  resetCompleteExerciseState();

  // 根据自动播放设置决定下一步
  if (shouldAutoPlayNext()) {
    startNewQuestionWithCurrentSettings();
  } else {
    resetToInitialState();
  }

  // 显示提示
  showResetFeedback();

  setTimeout(() => {
    resetInfo();          // 重置悬浮面板内容
    updatePitch(null, null); // 再次确保主显示为等待状态
  }, 100);

  setTimeout(() => {
    window.dispatchEvent(new CustomEvent('quiz-reset'));
    // 🔴 修复：额外触发range-changed事件确保音域显示更新
    const getCurrentRangeKey = AppGlobal.getTool('getCurrentKey');
    if (getCurrentRangeKey) {
      window.dispatchEvent(new CustomEvent('range-changed', {
        detail: { range: getCurrentRangeKey() }
      }));
    }
  }, 150);

  // 最后重置复位标志
  setTimeout(() => {
    AppState.quiz.fromReset = false;
  }, 200);
}

function resetCompleteExerciseState() {
  const hideCards = AppGlobal.getTool('hideInfoCards') || hideInfoCards;
  const resetInfo = AppGlobal.getTool('resetAnswerInfo') || resetAnswerInfo;
  const disableButtons = AppGlobal.getTool('disableAnswerButtons') || disableAnswerButtons;

  // ========== 统一处理所有待处理设置 ==========
  const pendingChanges = {};
  
  // 1. 基准音模式 - 按钮组
  if (AppState.quiz.pendingBaseModeChange) {
    AppState.quiz.questionBaseMode = AppState.quiz.pendingBaseModeChange;
    pendingChanges.baseMode = AppState.quiz.pendingBaseModeChange;
  } else {
    // 没有预选时使用当前UI状态
    const activeModeBtn = document.querySelector('.mode-btn.active');
    AppState.quiz.questionBaseMode = activeModeBtn ? activeModeBtn.dataset.mode : 'c';
  }
  
  // 2. 调性 - 下拉选择
  if (AppState.quiz.pendingKeyChange) {
    AppState.quiz.currentKey = AppState.quiz.pendingKeyChange;
    pendingChanges.key = AppState.quiz.pendingKeyChange;
  } else {
    // 没有预选时使用当前UI状态
    const keySelect = document.getElementById('keySelect');
    AppState.quiz.currentKey = keySelect ? keySelect.value : 'C';
  }
  
  // 3. 难度 - 下拉选择
  if (AppState.quiz.pendingDifficultyChange) {
    AppState.quiz.currentDifficulty = AppState.quiz.pendingDifficultyChange;
    pendingChanges.difficulty = AppState.quiz.pendingDifficultyChange;
  } else {
    // 没有预选时使用当前UI状态
    const difficultySelect = document.getElementById('difficultySelect');
    AppState.quiz.currentDifficulty = difficultySelect ? difficultySelect.value : 'basic';
  }
  
// 4. 音域 - 按钮组（与基准音模式相同处理方式）
  if (AppState.quiz.pendingRangeChange) {
    AppState.quiz.currentRange = AppState.quiz.pendingRangeChange;
    pendingChanges.range = AppState.quiz.pendingRangeChange;
  } else {
    // 没有预选时使用当前UI状态
    const activeRangeBtn = document.querySelector('.range-btn.active');
    AppState.quiz.currentRange = activeRangeBtn ? activeRangeBtn.dataset.range : 'low';
  }

  // 统一清除所有待处理状态
  AppState.quiz.pendingKeyChange = null;
  AppState.quiz.pendingBaseModeChange = null;
  AppState.quiz.pendingDifficultyChange = null;
  AppState.quiz.pendingRangeChange = null;
  
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
  // 空函数，保持原有结构
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
    resetCompleteExerciseState
};