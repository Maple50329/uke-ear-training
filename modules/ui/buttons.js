import { AppState } from '../core/state.js';
import { UI_TEXT } from '../core/constants.js';
import AppGlobal from '../core/app.js';  // 添加这行导入

// 更新大按钮状态函数
function updateBigButtonState() {
    const bigPlayBtn = document.getElementById('big-play-btn');
    const bigPlayIcon = bigPlayBtn.querySelector('.big-play-icon');
    const statusTooltip = bigPlayBtn.querySelector('.play-status-tooltip');
    const startBtn = document.getElementById('startBtn');
    
    if (!bigPlayBtn || !startBtn) return;
    
    // 如果处于复位状态，强制显示初始状态
    if (AppState.quiz.fromReset) {
      bigPlayBtn.classList.remove('disabled');
      bigPlayIcon.className = 'big-play-icon icon-play';
      if (statusTooltip) statusTooltip.textContent = '播放题目';
      return;
  }

    // 同步禁用状态
    if (AppState.quiz.locked) {
      bigPlayBtn.classList.add('disabled');
    } else {
      bigPlayBtn.classList.remove('disabled');
    }
    
    // 根据主按钮文字更新图标
    const buttonText = startBtn.textContent;
    
    // 清除所有图标类
    bigPlayIcon.className = 'big-play-icon';
    
    // 设置图标和状态提示
    if (buttonText.includes('播放题目') || buttonText === UI_TEXT.INITIAL) {
      bigPlayIcon.classList.add('icon-play');
      if (statusTooltip) statusTooltip.textContent = '播放题目';
    } else if (buttonText.includes('再听一遍') || buttonText === UI_TEXT.REPLAY) {
      bigPlayIcon.classList.add('icon-replay');
      if (statusTooltip) statusTooltip.textContent = '再听一遍';
    } else if (buttonText.includes('下一题') || buttonText === UI_TEXT.NEXT) {
      bigPlayIcon.classList.add('icon-next');
      if (statusTooltip) statusTooltip.textContent = '下一题';
    } else if (buttonText.includes('音阶') || buttonText === UI_TEXT.PLAYING_SCALE) {
      bigPlayIcon.classList.add('icon-scale');
      if (statusTooltip) statusTooltip.textContent = UI_TEXT.PLAYING_SCALE;
    } else if (buttonText.includes('基准音') || buttonText === UI_TEXT.PLAYING_REFERENCE) {
      bigPlayIcon.classList.add('icon-reference');
      if (statusTooltip) statusTooltip.textContent = UI_TEXT.PLAYING_REFERENCE;
    } else if (buttonText.includes('目标音') || buttonText === UI_TEXT.PLAYING_TARGET || buttonText === UI_TEXT.REPLAYING_TARGET) {
      bigPlayIcon.classList.add('icon-target');
      if (statusTooltip) statusTooltip.textContent = buttonText;
    } else {
      // 默认状态
      bigPlayIcon.classList.add('icon-play');
      if (statusTooltip) statusTooltip.textContent = '播放题目';
    }
  }

// 更新复位按钮状态
function updateResetButtonState() {
  const resetBtn = document.getElementById('resetQuestionBtn');
  if (!resetBtn) return;
  
  // 复位状态下禁用复位按钮
  if (AppState.quiz.fromReset) {
      resetBtn.disabled = true;
      resetBtn.classList.add('disabled');
      return;
  }
  
  // 复位按钮启用条件：已经开始播放但尚未答题
  const shouldEnable = AppState.quiz.hasStarted && !AppState.quiz.answered;
  
  resetBtn.disabled = !shouldEnable;
  
  if (resetBtn.disabled) {
      resetBtn.classList.add('disabled');
  } else {
      resetBtn.classList.remove('disabled');
  }
}

// 初始化大播放按钮
function initBigPlayButton() {
  const bigPlayBtn = document.getElementById('big-play-btn');
  const startBtn = document.getElementById('startBtn');
  
  if (!bigPlayBtn || !startBtn) return;
  
  // 点击委托
  bigPlayBtn.addEventListener('click', function() {
    if (!AppState.quiz.locked) {
      startBtn.click(); // 触发原有按钮的点击
    }
  });
  
  // 初始状态同步
  updateBigButtonState();
}

// 初始化复位按钮
function initResetButton() {
  const resetBtn = document.getElementById('resetQuestionBtn');
  if (!resetBtn) {
    console.warn('复位按钮未找到');
    return;
  }
  
  // 确保初始状态正确
  updateResetButtonState();

  resetBtn.addEventListener('click', () => {
    // 使用工具箱获取复位处理函数
    const resetHandler = AppGlobal.getTool('handleResetQuestion');
    if (resetHandler) { 
      resetHandler(); 
    } else {
      console.error('复位处理函数未找到');
      // 备用方案：直接调用全局函数
      if (window.handleResetQuestion) {
        window.handleResetQuestion();
      }
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      if (!resetBtn.disabled) {
        const resetHandler = AppGlobal.getTool('handleResetQuestion');
        if (resetHandler) { 
          resetHandler();
        } else if (window.handleResetQuestion) {
          window.handleResetQuestion();
        }
      }
    }
  });
}

// 初始化键盘空格键控制
function initKeyboardControls() {
  document.addEventListener('keydown', (e) => {
      // 检查是否按下了空格键，且没有在输入框中
      if (e.code === 'Space' && 
          !e.ctrlKey && 
          !e.metaKey && 
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' && 
          !e.target.isContentEditable) {
          
          e.preventDefault(); // 防止页面滚动
          
          const startBtn = document.getElementById('startBtn');
          
          // 检查按钮是否可用
          if (startBtn && !AppState.quiz.locked) {
              console.log('空格键触发播放题目');
              startBtn.click();
          }
      }
  });
}

// 初始化所有按钮功能
function initAllButtons() {
  initBigPlayButton();
  initResetButton();
  initKeyboardControls();
  updateBigButtonState();
  updateResetButtonState();
}

export {
  updateBigButtonState,
  updateResetButtonState,
  initBigPlayButton,
  initResetButton,
  initKeyboardControls,
  initAllButtons
};