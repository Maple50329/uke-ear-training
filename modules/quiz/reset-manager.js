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
  
  // 恢复UI显示实际状态
  const keySelect = document.getElementById('keySelect');
  if (keySelect) {
    keySelect.value = AppState.quiz.currentKey; // 显示实际调性而非预选
  }
  
  // 恢复UI显示实际难度
  const difficultySelect = document.getElementById('difficultySelect');
  if (difficultySelect) {
    difficultySelect.value = AppState.quiz.currentDifficulty; // 显示实际难度而非预选
  }

  const activeModeBtn = document.querySelector('.mode-btn.active');
  const actualBaseMode = AppState.quiz.questionBaseMode || 'c';
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === actualBaseMode);
  });
  
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
  
  // 确保基准音按钮可用
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

  // 重绘答题区并保持禁用状态
  const difficulty = document.getElementById('difficultySelect')?.value || 'basic';
  const key = document.getElementById('keySelect')?.value || 'C';
  const scale = difficulty === 'basic'
    ? KEY_SCALES[key]?.basic || KEY_SCALES.C.basic
    : KEY_SCALES[key]?.extended || KEY_SCALES.C.extended;

  renderFunc(scale, difficulty);
  disableButtons();

  // 确保答题区显示
  if (AppState.dom.ansArea) {
    AppState.dom.ansArea.style.display = 'grid';
    AppState.dom.ansArea.style.opacity = '1';
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
  }, 100);

  // 最后重置复位标志
  setTimeout(() => {
    AppState.quiz.fromReset = false;
  }, 100);

}

function resetCompleteExerciseState() {
    
    const hideCards = AppGlobal.getTool('hideInfoCards') || hideInfoCards;
    const resetInfo = AppGlobal.getTool('resetAnswerInfo') || resetAnswerInfo;
    const disableButtons = AppGlobal.getTool('disableAnswerButtons') || disableAnswerButtons;
    
    // 确保在完整重置中也清理预选状态
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
    AppState.quiz.questionBaseMode = 'c';
    AppState.quiz.hasAnsweredCurrent = false;
    AppState.quiz.attemptCount = 0;
    window.dispatchEvent(new CustomEvent('base-mode-changed', {
      detail: { mode: 'c' }
  }));
    
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
    
    // 触发状态栏更新
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