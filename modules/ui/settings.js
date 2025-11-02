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
    
    if (!timeSlider || !timeDisplay) return;
    
    // 初始更新显示
    updateTimeDisplay(timeSlider.value);
    
    // 滑块事件
    timeSlider.addEventListener('input', function() {
      updateTimeDisplay(this.value);
    });
    
    // 复选框事件 - 控制滑块可用状态
    if (autoNextCheckbox) {
      autoNextCheckbox.addEventListener('change', function() {
        timeSlider.disabled = !this.checked;
        timeDisplay.style.opacity = this.checked ? '1' : '0.5';
      });
      
      // 初始状态
      timeSlider.disabled = !autoNextCheckbox.checked;
      timeDisplay.style.opacity = autoNextCheckbox.checked ? '1' : '0.5';
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

