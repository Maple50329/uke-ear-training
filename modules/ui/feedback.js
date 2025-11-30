import { AppState } from '../core/state.js';
import { INTERVAL_INFO } from '../core/constants.js';
import { getNoteDegree, getStabilityClass, getSolfegeName } from '../utils/helpers.js';
import { updateUkulelePosition } from '../theory/ukulele.js';

// 显示答题结果反馈
export function showAnswerFeedback(isCorrect) {
    if (!AppState.dom.ansArea) return;
    
    AppState.dom.ansArea.classList.add(isCorrect ? 'correct' : 'incorrect');
    
    // 1秒后移除反馈效果
    setTimeout(() => {
      AppState.dom.ansArea.classList.remove('correct', 'incorrect');
      updateAnswerAreaState(); // 恢复正常状态
    }, 500);
}

// 更新音程显示函数
export function updateIntervalDisplay(baseNote, targetNote, intervalInfo) {
    const intervalNameEl = document.getElementById('intervalName');
    const intervalDetailEl = document.getElementById('intervalDetail');
    const stabilityEl = document.getElementById('intervalStability');
    const tendencyEl = document.getElementById('intervalTendency');
    const natureEl = document.getElementById('intervalNature');
    const colorEl = document.getElementById('intervalColor');
    
    if (intervalNameEl) intervalNameEl.textContent = intervalInfo.name;
    if (intervalDetailEl) intervalDetailEl.textContent = `${baseNote} → ${targetNote} (${intervalInfo.semitones}个半音)`;
    if (stabilityEl) {
      stabilityEl.textContent = intervalInfo.stability;
      stabilityEl.className = `property-value stability-${getStabilityClass(intervalInfo.stability)}`;
    }
    if (tendencyEl) tendencyEl.textContent = intervalInfo.tendency;
    if (natureEl) natureEl.textContent = intervalInfo.nature;
    if (colorEl) colorEl.textContent = intervalInfo.color;
}

// 音程显示功能（增强版，带日志和错误处理）
export function updateIntervalDisplayInfo(baseNote, targetNote, intervalType) {
    const intervalInfo = INTERVAL_INFO[intervalType];
    if (intervalInfo) {
      updateIntervalDisplay(baseNote, targetNote, intervalInfo);
    } else {
      console.error('未找到音程信息:', intervalType);
      // 显示默认信息或错误提示
      updateIntervalDisplay(baseNote, targetNote, {
        name: '未知音程',
        semitones: '--',
        stability: '--',
        tendency: '--',
        nature: '--',
        color: '--'
      });
    }
}

export function updateCurrentPitchDisplay(noteName, frequency = null) {
    if (typeof noteName === 'undefined') {
      noteName = null;
    }
    
    const pitchElement = document.getElementById('currentPitch');
    const frequencyElement = document.getElementById('currentFrequency');
    const degreeElement = document.getElementById('currentDegree');
    
    if (!pitchElement || !frequencyElement || !degreeElement) {
      console.warn('Pitch display elements not found');
      return;
    }
    
    if (noteName === '--') {
      pitchElement.innerHTML = '--';
      frequencyElement.textContent = '-- Hz';
      degreeElement.textContent = `${AppState.quiz.currentKey}大调：第 -- 级`;
      degreeElement.classList.remove('waiting');
      return;
    }
    
    if (noteName) {
      const key = AppState.quiz.currentKey || 'C';
      const degree = getNoteDegree(noteName, key);
      const solfegeName = getSolfegeName(degree);
      
      // 处理音名显示：去掉八度数字，变化音调整顺序
      let displayPitchName = noteName.replace(/\d/g, ''); // 去掉所有数字
      
      // 如果是变化音，调整顺序：C#4 -> #C
      if (displayPitchName.includes('#') || displayPitchName.includes('b')) {
        const accidental = displayPitchName.charAt(1); // 获取升降号
        const noteLetter = displayPitchName.charAt(0); // 获取音符字母
        displayPitchName = accidental + noteLetter; // 重新组合为 #C 格式
      }
      
      // 一行显示，用竖线分隔
      pitchElement.innerHTML = `
        <span class="solfege-name">${solfegeName}</span>
        <span class="separator">|</span>
        <span class="pitch-name">${displayPitchName}</span>
      `;
      
      frequencyElement.textContent = frequency ? `${frequency} Hz` : '-- Hz';
      degreeElement.textContent = `${AppState.quiz.currentKey}大调：第 ${degree} 级`;
      degreeElement.classList.remove('waiting');
    }
}

// 更新答题区视觉状态
export function updateAnswerAreaState() {
    if (!AppState.dom.ansArea) return;
    
    AppState.dom.ansArea.classList.remove('disabled', 'enabled', 'playing', 'correct', 'incorrect');
    
    if (AppState.quiz.locked || AppState.quiz.answered) {
      AppState.dom.ansArea.classList.add('disabled');
    } else {
      AppState.dom.ansArea.classList.add('enabled');
    }
}

// 修改现有的禁用函数
export function disableAnswerButtons() {
  if (!AppState.dom.ansArea) {
      return;
  }
  
  const buttons = AppState.dom.ansArea.querySelectorAll('.key-btn');
  if (buttons.length === 0) {
      return;
  }
  
  buttons.forEach(btn => {
      btn.disabled = true; // 只设置属性
      btn.classList.add('disabled'); // 只设置类
  });
  
  // 添加答题区禁用样式
  AppState.dom.ansArea.classList.add('disabled');
}
  
export function enableAnswerButtons() {
  if (!AppState.dom.ansArea) {
      // 静默返回
      return;
  }
  
  const buttons = AppState.dom.ansArea.querySelectorAll('.key-btn');
  if (buttons.length === 0) {
      // 静默返回
      return;
  }
  
  buttons.forEach(btn => {
      // 只设置属性和类，不设置内联样式
      btn.disabled = false;
      btn.classList.remove('disabled');
      
      // 清除所有可能的内联样式，让CSS完全控制
      btn.style.opacity = '';
      btn.style.filter = '';
      btn.style.pointerEvents = '';
      btn.style.cursor = '';
      btn.style.transform = '';
  });
  
  // 移除答题区禁用样式
  AppState.dom.ansArea.classList.remove('disabled');
  
  // 清除答题区的内联样式
  AppState.dom.ansArea.style.opacity = '';
  AppState.dom.ansArea.style.pointerEvents = '';
}

export function syncButtonStates() {
  if (!AppState.dom.ansArea) {
      return;
  }
  
  const buttons = AppState.dom.ansArea.querySelectorAll('.key-btn');
  if (buttons.length === 0) {
      return;
  }
  
  const shouldBeDisabled = AppState.quiz.locked || AppState.quiz.answered;
  
  buttons.forEach(btn => {
      if (shouldBeDisabled) {
          btn.disabled = true;
          btn.classList.add('disabled');
      } else {
          btn.disabled = false;
          btn.classList.remove('disabled');
      }
  });
  
  // 同步答题区样式
  if (shouldBeDisabled) {
      AppState.dom.ansArea.classList.add('disabled');
  } else {
      AppState.dom.ansArea.classList.remove('disabled');
  }
}

// 基准音按钮视觉状态更新
export function updateModeButtonsVisualState() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(btn => {
      // 先移除所有状态类
      btn.classList.remove('disabled-state', 'playing-state');
      
      // 根据不同状态添加相应的类
      if (AppState.quiz.locked) {
        btn.classList.add('playing-state'); // 播放中状态
      } else if (AppState.quiz.hasStarted && !AppState.quiz.answered) {
        btn.classList.add('disabled-state'); // 已开始但未答题状态
      }
      // 其他情况（未开始或已回答）保持正常状态
    });
}

export function initPitchVisualizer() {
    const pitchPage = document.getElementById('pitch-page');
    if (pitchPage && pitchPage.querySelector('.card-content') && !pitchPage.querySelector('.pitch-visual')) {
        const visualHtml = `
            <div class="pitch-visual">
                <div class="pitch-visual-bar"></div>
                <div class="pitch-visual-dot"></div>
            </div>
        `;
        pitchPage.querySelector('.card-content').insertAdjacentHTML('afterbegin', visualHtml);
    }
}

// 在答题正确时调用显示尤克里里指位
export function showUkulelePositions(noteName) {
    const baseNoteName = noteName.replace(/\d/g, ''); // 移除八度信息
    updateUkulelePosition(baseNoteName);
    
    // 确保调性选项卡可见且可用
    const tabButtons = document.querySelectorAll('.uke-tab-btn');
    tabButtons.forEach(btn => {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    });
}

// 欢迎界面控制函数
// 隐藏欢迎界面
export function hideAllWelcomeOverlays() {
    const overlays = document.querySelectorAll('.welcome-overlay');
    overlays.forEach(overlay => {
        overlay.classList.remove('active');
    });
    
    // 显示原有的内容
    const contents = document.querySelectorAll('.interval-content, .ukulele-content, .pitch-content');
    contents.forEach(content => {
        if (content) content.style.display = 'flex';
    });
}
  
// 显示欢迎界面
export function showWelcomeOverlays() {
    const overlays = document.querySelectorAll('.welcome-overlay');
    overlays.forEach(overlay => {
        overlay.classList.add('active');
    });
    
    // 隐藏原有的内容
    const contents = document.querySelectorAll('.interval-content, .ukulele-content, .pitch-content');
    contents.forEach(content => {
        if (content) content.style.display = 'none';
    });
}

// 更新面板信息
export function updatePanelInfo(noteName, frequency, intervalName, semitones, ukuleleString, ukuleleFret) {
  // 更新音高信息
  const pitchEl = document.getElementById('simplePitch');
  const frequencyEl = document.getElementById('simpleFrequency');
  if (pitchEl) pitchEl.textContent = noteName || '--';
  if (frequencyEl) frequencyEl.textContent = frequency ? `${frequency} Hz` : '-- Hz';
  
  // 更新音程信息
  const intervalNameEl = document.getElementById('intervalName');
  const intervalSemitonesEl = document.getElementById('intervalSemitones');
  if (intervalNameEl) intervalNameEl.textContent = intervalName || '--';
  if (intervalSemitonesEl) intervalSemitonesEl.textContent = semitones ? `${semitones}个半音` : '--';
  
  // 更新尤克里里信息
  const ukuleleStringEl = document.getElementById('ukuleleString');
  const ukuleleFretEl = document.getElementById('ukuleleFret');
  if (ukuleleStringEl) ukuleleStringEl.textContent = ukuleleString || '--';
  if (ukuleleFretEl) ukuleleFretEl.textContent = ukuleleFret ? `第${ukuleleFret}品` : '--';
}

export function updatePanelInfoFull(noteName, frequency, intervalName, semitones, ukuleleString, ukuleleFret) {
  updatePanelInfo(noteName, frequency, intervalName, semitones, ukuleleString, ukuleleFret);
}

// 更新面板信息
export function updateSimplePanel(noteName, interval, position) {
  const pitchElement = document.getElementById('simplePitch');
  const intervalElement = document.getElementById('simpleInterval');
  const positionElement = document.getElementById('simplePosition');
  
  if (pitchElement) pitchElement.textContent = noteName || '--';
  if (intervalElement) intervalElement.textContent = interval || '--';
  if (positionElement) positionElement.textContent = position || '--';
}

export function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      
      setTimeout(() => {
          toast.classList.remove('show');
      }, duration);
  }
}

export function updateAllMessageDisplays(message) {
  // 更新所有消息显示的函数
  const msgDisplay = document.getElementById('msg');
  const mobileDescText = document.getElementById('mobileDescText');
  
  if (msgDisplay) msgDisplay.textContent = message;
  if (mobileDescText) mobileDescText.textContent = message;
  console.log('消息更新:', message);
}

export function updateMobileDescription(text) {
  requestAnimationFrame(() => {
    const mobileDescText = document.getElementById('mobileDescText');
    if (mobileDescText) {
      mobileDescText.textContent = text;
    }
  });
}