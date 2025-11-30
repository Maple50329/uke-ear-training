// modules/ui/settings.js
import { AppState } from '../core/state.js';
import { showKeyChangeToast } from '../utils/displayHelpers.js';
import { KEY_SCALES } from '../core/constants.js';
import { getANoteForKey, calculateIntervalType } from '../utils/helpers.js';
import { updateIntervalDisplayInfo } from './feedback.js';
import AppGlobal from '../core/app.js';

// -------------------------
// ① 信息显示时间滑块
// -------------------------
export function initInfoDisplaySlider() {
  const timeSlider = document.getElementById('infoDisplayTime');
  const timeDisplay = document.getElementById('timeDisplay');
  const autoNextCheckbox = document.getElementById('autoNextCheckbox');

  if (!timeSlider || !timeDisplay || !autoNextCheckbox) return;

  const initDelay = AppState.audio?.autoNextDelay || 3;
  timeSlider.value = initDelay;
  updateTimeDisplay(initDelay);

  timeSlider.disabled = !autoNextCheckbox.checked;
  timeDisplay.style.opacity = autoNextCheckbox.checked ? '1' : '0.5';

  // 滑块变化
  timeSlider.addEventListener('input', function () {
    const newDelay = parseInt(this.value, 10);
    updateTimeDisplay(newDelay);
    AppState.audio.autoNextDelay = newDelay;
    localStorage.setItem('autoNextDelay', newDelay);
  });

  // 复选框变化
  autoNextCheckbox.addEventListener('change', function () {
    const isEnabled = this.checked;
    AppState.audio.autoNextEnabled = isEnabled;

    timeSlider.disabled = !isEnabled;
    timeDisplay.style.opacity = isEnabled ? '1' : '0.5';

    localStorage.setItem('autoNextEnabled', isEnabled);
  });
}

export function updateTimeDisplay(seconds) {
  const display = document.getElementById('timeDisplay');
  if (display) display.textContent = `${seconds}秒`;
}

// -------------------------
// ② 移动端侧边栏（保持原有逻辑）
// -------------------------
export function initMobileSidebar() {
  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const leftPanel = document.querySelector('.left-panel');

  if (!toggleBtn || !leftPanel) return;

  function checkMobile() {
    return window.innerWidth <= 900;
  }

  function toggleSidebar() {
    leftPanel.classList.toggle('mobile-visible');
  }

  if (checkMobile()) toggleBtn.style.display = 'block';

  toggleBtn.addEventListener('click', toggleSidebar);

  window.addEventListener('resize', function () {
    if (checkMobile()) {
      toggleBtn.style.display = 'block';
    } else {
      toggleBtn.style.display = 'none';
      leftPanel.classList.remove('mobile-visible');
    }
  });
}

// -------------------------
// ③ 基准音按钮（保持原有逻辑）
// -------------------------
export function initBaseModeButtons() {
  const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState');
  const modeButtons = document.querySelectorAll('.mode-btn');

  modeButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const selectedMode = this.dataset.mode;

      // 若正在答题 → 进入预选模式
      if (AppState.quiz.locked || (AppState.quiz.hasStarted && !AppState.quiz.answered)) {
        modeButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        AppState.quiz.pendingBaseModeChange = selectedMode;
        showKeyChangeToast('基准音模式将在下一题生效');
        return;
      }

      // 正常切换
      modeButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  });

  updateModeVisuals();
}

// -------------------------
// ④ 全部设置初始化（已移除错误次数系统）
// -------------------------
export function initAllSettings() {
  initInfoDisplaySlider();
  initBaseModeButtons();

  console.log('✅ 设置系统初始化完成（错误次数系统已改为独立模块）');
}

// 兼容旧接口
export function initAllPanelFeatures() {
  initInfoDisplaySlider();
  initMobileSidebar();
}
