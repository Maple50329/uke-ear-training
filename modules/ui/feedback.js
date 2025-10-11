import { AppState } from '../core/state.js';
import { INTERVAL_INFO } from '../core/constants.js';
import { getNoteDegree, getStabilityClass, getSolfegeName } from '../utils/helpers.js';
import { updateUkulelePosition } from '../theory/ukulele.js';

// 导入工具箱
import AppGlobal from '../core/app.js';

// 显示答题结果反馈
function showAnswerFeedback(isCorrect) {
    if (!AppState.dom.ansArea) return;
    
    AppState.dom.ansArea.classList.add(isCorrect ? 'correct' : 'incorrect');
    
    // 1秒后移除反馈效果
    setTimeout(() => {
      AppState.dom.ansArea.classList.remove('correct', 'incorrect');
      updateAnswerAreaState(); // 恢复正常状态
    }, 500);
}

// 更新音程显示函数
function updateIntervalDisplay(baseNote, targetNote, intervalInfo) {
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
function updateIntervalDisplayInfo(baseNote, targetNote, intervalType) {
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

function updateCurrentPitchDisplay(noteName, frequency = null) {
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
function updateAnswerAreaState() {
    if (!AppState.dom.ansArea) return;
    
    AppState.dom.ansArea.classList.remove('disabled', 'enabled', 'playing', 'correct', 'incorrect');
    
    if (AppState.quiz.locked || AppState.quiz.answered) {
      AppState.dom.ansArea.classList.add('disabled');
    } else {
      AppState.dom.ansArea.classList.add('enabled');
    }
}

// 修改现有的禁用函数
function disableAnswerButtons() {
  if (!AppState.dom.ansArea) {
      console.warn('答题区未初始化，跳过禁用按钮');
      return;
  }
  
  const buttons = AppState.dom.ansArea.querySelectorAll('.key-btn');
  if (buttons.length === 0) {
      console.warn('未找到答题按钮，可能尚未渲染');
      return;
  }
  
  buttons.forEach(btn => {
      btn.disabled = true; 
  });
}
  
function enableAnswerButtons() {
  if (!AppState.dom.ansArea) return;
  
  AppState.dom.ansArea.querySelectorAll('.key-btn').forEach(btn => {
    btn.disabled = false;
  });
}

function syncButtonStates() {
  if (!AppState.dom.ansArea) return;
  
  const buttons = AppState.dom.ansArea.querySelectorAll('.key-btn');
  const shouldBeDisabled = AppState.quiz.locked || AppState.quiz.answered;
  
  buttons.forEach(btn => {
    if (shouldBeDisabled && !btn.disabled) {
      btn.disabled = true;
    } else if (!shouldBeDisabled && btn.disabled && !btn.classList.contains('hit')) {
      btn.disabled = false;
    }
  });
}

// 基准音按钮视觉状态更新
function updateModeButtonsVisualState() {
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

function initPitchVisualizer() {
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
function showUkulelePositions(noteName) {
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
function hideAllWelcomeOverlays() {
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
function showWelcomeOverlays() {
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
function updatePanelInfo(noteName, frequency, intervalName, semitones, ukuleleString, ukuleleFret) {
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

function updatePanelInfoFull(noteName, frequency, intervalName, semitones, ukuleleString, ukuleleFret) {
  updatePanelInfo(noteName, frequency, intervalName, semitones, ukuleleString, ukuleleFret);
}

// 更新面板信息
function updateSimplePanel(noteName, interval, position) {
  const pitchElement = document.getElementById('simplePitch');
  const intervalElement = document.getElementById('simpleInterval');
  const positionElement = document.getElementById('simplePosition');
  
  if (pitchElement) pitchElement.textContent = noteName || '--';
  if (intervalElement) intervalElement.textContent = interval || '--';
  if (positionElement) positionElement.textContent = position || '--';
}

function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      
      setTimeout(() => {
          toast.classList.remove('show');
      }, duration);
  }
}

export {
    showAnswerFeedback,
    updateIntervalDisplay,
    updateIntervalDisplayInfo,
    updateCurrentPitchDisplay,
    updateAnswerAreaState,
    disableAnswerButtons,
    enableAnswerButtons,
    syncButtonStates,
    updateModeButtonsVisualState,
    initPitchVisualizer,
    showUkulelePositions,
    hideAllWelcomeOverlays,
    showWelcomeOverlays,
    updatePanelInfo,
    updatePanelInfoFull,
    updateSimplePanel,
    showToast
};