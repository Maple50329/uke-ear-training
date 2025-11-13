import { AppState } from '../core/state.js';
import { showKeyChangeToast } from '../utils/displayHelpers.js';
import { KEY_SCALES } from '../core/constants.js';
import { getANoteForKey, calculateIntervalType } from '../utils/helpers.js';
import { updateIntervalDisplayInfo } from './feedback.js';
import AppGlobal from '../core/app.js';
// 初始化信息显示时长滑动条（函数名称保持不变）
export function initInfoDisplaySlider() {
  const timeSlider = document.getElementById('infoDisplayTime');
  const timeDisplay = document.getElementById('timeDisplay');
  const autoNextCheckbox = document.getElementById('autoNextCheckbox');
  
  if (!timeSlider || !timeDisplay || !autoNextCheckbox) return;

  // --------------------------
  // 1. 初始化：从全局状态读取值
  // --------------------------
  const initDelay = AppState.audio?.autoNextDelay || 3; // 默认3秒
  timeSlider.value = initDelay;
  updateTimeDisplay(initDelay); // 初始化桌面显示
  timeSlider.disabled = !autoNextCheckbox.checked; // 初始禁用状态
  timeDisplay.style.opacity = autoNextCheckbox.checked ? '1' : '0.5';
  
  // --------------------------
  // 2. 滑块事件：同步值到全局+通知移动端
  // --------------------------
  timeSlider.addEventListener('input', function() {
    const newDelay = parseInt(this.value, 10);
    // 更新桌面显示
    updateTimeDisplay(newDelay);
    // 同步到全局状态（核心：移动端会从这里读取值）
    AppState.audio.autoNextDelay = newDelay;
    // 触发事件通知移动端更新UI
    window.dispatchEvent(new CustomEvent('autoNextDelayChanged', {
      detail: { delay: newDelay } // 传递最新值
    }));
    localStorage.setItem('autoNextDelay', newDelay); 
  });

  // --------------------------
  // 3. 复选框事件：控制滑块启用/禁用状态
  // --------------------------
  autoNextCheckbox.addEventListener('change', function() {
    const isEnabled = this.checked;
    // 更新滑块状态
    timeSlider.disabled = !isEnabled;
    timeDisplay.style.opacity = isEnabled ? '1' : '0.5';
    // 同步状态到全局（移动端复选框会读取此值）
    AppState.audio.autoNextEnabled = isEnabled;
    // 触发事件通知移动端更新按钮/滑块状态
    window.dispatchEvent(new CustomEvent('autoNextStateChanged', {
      detail: { enabled: isEnabled }
    }));
    localStorage.setItem('autoNextEnabled', isEnabled); 
  });

  // --------------------------
  // 4. 辅助函数：更新桌面秒数显示
  // --------------------------
  function updateTimeDisplay(seconds) {
    timeDisplay.textContent = `${seconds}秒`;
  }
}

  export function updateTimeDisplay(seconds) {
    const timeDisplay = document.getElementById('timeDisplay');
    if (timeDisplay) {
      timeDisplay.textContent = `${seconds}秒`;
    }
  }
  
  export function initMobileSidebar() {
    const toggleBtn = document.getElementById('mobileSidebarToggle');
    const leftPanel = document.querySelector('.left-panel');
    
    if (!toggleBtn || !leftPanel) return;
  
    function checkMobile() {
      return window.innerWidth <= 900;
    }
    
    // 切换侧边栏
    function toggleSidebar() {
      leftPanel.classList.toggle('mobile-visible');
    }
    
    // 初始状态
    if (checkMobile()) {
      toggleBtn.style.display = 'block';
    }
    
    // 点击事件
    toggleBtn.addEventListener('click', toggleSidebar);
    
    // 窗口大小变化
    window.addEventListener('resize', function() {
      if (checkMobile()) {
        toggleBtn.style.display = 'block';
      } else {
        toggleBtn.style.display = 'none';
        leftPanel.classList.remove('mobile-visible');
      }
    });
  }

  export function initBaseModeButtons() {
    const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState');
    const modeButtons = document.querySelectorAll('.mode-btn');
    
    modeButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        const selectedMode = this.dataset.mode;
        
        // 🔴 修改：播放中或已开始但未完成答题时，改为预选模式
        if (AppState.quiz.locked || (AppState.quiz.hasStarted && !AppState.quiz.answered)) {
          // 允许UI切换，但标记为预选
          modeButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          AppState.quiz.pendingBaseModeChange = selectedMode;
          showKeyChangeToast('基准音模式更改将在下一题生效');
          return;
        }
        
        // 🔴 修改：已答题完成时也改为预选模式
        if (AppState.quiz.answered) {
          modeButtons.forEach(b => b.classList.remove('active'));
          this.classList.add('active');
          AppState.quiz.pendingBaseModeChange = selectedMode;
          showKeyChangeToast('基准音模式更改将在下一题生效');
          return;
        }
        
        // 正常情况下的更改（未开始答题时）
        modeButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        // 如果已经答题完成，立即更新音程显示（使用新的基准音）
        if (AppState.quiz.answered && AppState.quiz.currentTargetNote) {
          const currentKey = AppState.quiz.currentKey || 'C';
          const baseNote = selectedMode === 'c' ? 
            KEY_SCALES[currentKey]?.basic[0] || 'C4' : 
            getANoteForKey(currentKey);
          
          const targetNote = AppState.quiz.currentTargetNote;
          const intervalType = calculateIntervalType(baseNote, targetNote);
          
          if (intervalType) {
            updateIntervalDisplayInfo(baseNote, targetNote, intervalType);
          }
        }
      });
    });
    updateModeVisuals();
}

