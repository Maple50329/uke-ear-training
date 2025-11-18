import { updateRange } from './range-manager.js';
import { AppState } from '../core/state.js';
import AppGlobal from '../core/app.js';

/**
 * 性能与体验优化记录
 * 1. 所有按钮事件统一使用事件委托 → 只做一次绑定，后续不再重复 addEventListener
 * 2. 打开面板时仅第一次渲染 / 初始化；再次打开仅做显示（标志位控制）
 * 3. 遮罩关闭时阻止 touch 穿透：preventDefault + 延迟关闭 + 临时禁用答题区点击
 * 4. DOM 引用全部缓存，避免重复 querySelector
 */
export class MobileContentLoader {
  /*********************** 缓存区 ***********************/
  static leftPanelEl      = null;   // #mobileLeftPanel
  static overlayEl        = null;   // #mobilePanelOverlay
  static ansAreaEl        = null;   // #ans（答题区）
  static isLeftInited     = false;  // 左侧面板是否已初始化
  static isRightInited    = false;  // 右侧面板是否已初始化（预留）

  /*********************** 对外接口 ***********************/
  static loadLeftPanelContent() {
    if (!this.isLeftInited) {
      this.renderLeftPanel();          // 首次：渲染 DOM
      this.bindDelegatedEvents();      // 首次：事件委托
      this.syncInitialState();         // 首次：同步桌面端状态
      this.initMobileAutoNextStepper();// 首次：步进器
      this.isLeftInited = true;
    }
  }

  /*********************** 首次渲染 ***********************/
  static renderLeftPanel() {
    const cnt = document.querySelector('#mobileLeftPanel .panel-content');
    if (!cnt) return;
    cnt.innerHTML = `
      <div class="mobile-settings-section">
        <!-- 音域 -->
        <div class="mobile-settings-group">
          <div class="mobile-settings-title">音域设置</div>
          <div class="mobile-range-buttons" data-role="range-group">
            <button class="mobile-range-btn active" data-range="low">小字组</button>
            <button class="mobile-range-btn" data-range="mid">小字一组</button>
          </div>
        </div>

        <!-- 基准音 -->
        <div class="mobile-settings-group">
          <div class="mobile-settings-title">基准音设置</div>
          <div class="mobile-mode-buttons" data-role="mode-group">
            <button class="mobile-mode-btn active" data-mode="c">Do</button>
            <button class="mobile-mode-btn" data-mode="a">La</button>
          </div>
        </div>

        <!-- 调性 -->
        <div class="mobile-settings-group">
          <div class="mobile-settings-title">调性选择</div>
          <select id="mobileKeySelect">
            <option value="C">C大调</option><option value="D">D大调</option>
            <option value="E">E大调</option><option value="F">F大调</option>
            <option value="G">G大调</option><option value="A">A大调</option>
            <option value="B">B大调</option>
          </select>
        </div>

        <!-- 难度 -->
        <div class="mobile-settings-group">
          <div class="mobile-settings-title">难度选择</div>
          <select id="mobileDifficultySelect">
            <option value="basic">仅基本音级</option>
            <option value="extended">含变化音级</option>
          </select>
        </div>

        <!-- 其他 -->
        <div class="mobile-settings-group">
          <div class="mobile-settings-title">其他选项</div>
          <div class="mobile-settings-option">
            <div class="checkbox-with-buttons">
              <label class="checkbox-label">
                <input type="checkbox" id="mobileAutoNextCheckbox">
                <span class="checkbox-text">自动下一音</span>
              </label>
              <div class="time-controls">
                <button class="time-btn minus" type="button" disabled>-</button>
                <span class="time-value" id="mobileAutoNextTimeValue">3秒</span>
                <button class="time-btn plus" type="button" disabled>+</button>
              </div>
            </div>
          </div>
          <div class="mobile-settings-option">
            <label class="checkbox-label">
              <input type="checkbox" id="mobileScalePlaybackCheckbox" checked>
              <span class="checkbox-text">先播放音阶</span>
            </label>
          </div>
        </div>
      </div>`;
  }

  /*********************** 事件委托（仅执行一次） ***********************/
  static bindDelegatedEvents() {
    const left = document.getElementById('mobileLeftPanel');
    if (!left) return;

    /* -------- 按钮类 -------- */
    left.addEventListener('click', e => {
      const t = e.target;
      // 音域
      if (t.classList.contains('mobile-range-btn')) {
        e.stopPropagation();
        this.activateBtn(t, '[data-role="range-group"] .mobile-range-btn');
        updateRange(t.dataset.range);
        document.querySelector(`.range-btn[data-range="${t.dataset.range}"]`)?.click();
      }
      // 基准音
      else if (t.classList.contains('mobile-mode-btn')) {
        e.stopPropagation();
        this.activateBtn(t, '[data-role="mode-group"] .mobile-mode-btn');
        document.querySelector(`.mode-btn[data-mode="${t.dataset.mode}"]`)?.click();
      }
    });

    /* -------- select 同步 -------- */
    left.addEventListener('change', e => {
      if (e.target.id === 'mobileKeySelect') {
        document.getElementById('keySelect').value = e.target.value;
        document.getElementById('keySelect').dispatchEvent(new Event('change'));
      } else if (e.target.id === 'mobileDifficultySelect') {
        document.getElementById('difficultySelect').value = e.target.value;
        document.getElementById('difficultySelect').dispatchEvent(new Event('change'));
        
        // 如果当前未在播放中，立即重新渲染答题区（确保重置后切换难度生效）
        if (!AppState.quiz.locked && !AppState.quiz.hasStarted) {
          setTimeout(() => {
            const renderFunc = AppGlobal.getTool('renderAnswerButtons');
            const initAreaFunc = AppGlobal.getTool('initAnswerArea');
            if (renderFunc && initAreaFunc) {
              initAreaFunc(); // 重新初始化答题区
            }
          }, 50);
        }
      }
    });

    /* -------- 复选框双向同步 -------- */
    left.addEventListener('change', e => {
      const idMap = {
        mobileAutoNextCheckbox: 'autoNextCheckbox',
        mobileScalePlaybackCheckbox: 'enableScalePlayback'
      };
      const desktopId = idMap[e.target.id];
      if (desktopId) {
        const desktopEl = document.getElementById(desktopId);
        if (desktopEl) desktopEl.checked = e.target.checked;
      }
    });
  }

  /*********************** 初始化状态同步 ***********************/
  static syncInitialState() {
    // 音域
    const dRange = document.querySelector('.range-btn.active')?.dataset.range;
    if (dRange) {
      const mb = document.querySelector(`.mobile-range-btn[data-range="${dRange}"]`);
      if (mb) this.activateBtn(mb, '[data-role="range-group"] .mobile-range-btn');
    }
    // 基准音
    const dMode = document.querySelector('.mode-btn.active')?.dataset.mode;
    if (dMode) {
      const mb = document.querySelector(`.mobile-mode-btn[data-mode="${dMode}"]`);
      if (mb) this.activateBtn(mb, '[data-role="mode-group"] .mobile-mode-btn');
    }
    // 下拉框
    document.getElementById('mobileKeySelect').value = document.getElementById('keySelect').value;
    document.getElementById('mobileDifficultySelect').value = document.getElementById('difficultySelect').value;
    // 复选框
    document.getElementById('mobileAutoNextCheckbox').checked = document.getElementById('autoNextCheckbox')?.checked ?? false;
    document.getElementById('mobileScalePlaybackCheckbox').checked = document.getElementById('enableScalePlayback')?.checked ?? true;
    // 步进器初始同步
  const desktopSlider = document.getElementById('infoDisplayTime');
  const timeValue = document.getElementById('mobileAutoNextTimeValue');
  if (desktopSlider && timeValue) {
    const delay = parseInt(desktopSlider.value) || 3;
    timeValue.textContent = `${delay}秒`;
    AppState.audio.autoNextDelay = delay;
  }
  }

  /*********************** 工具方法 ***********************/
  static activateBtn(target, selector) {
    target.closest('.mobile-settings-section').querySelectorAll(selector).forEach(b => {
      b.style.background = 'var(--btn-sec)';
      b.style.color = 'var(--text)';
    });
    target.style.background = 'var(--accent-color)';
    target.style.color = 'white';
  }

static handleTimeStepper(btn) {
  const minus = btn.classList.contains('minus');
  const plus = btn.classList.contains('plus');
  if (!minus && !plus) return;
  
  // 从桌面端滑块获取当前值，确保数据源一致
  const desktopSlider = document.getElementById('infoDisplayTime');
  let currentValue = 3; // 默认值
  
  if (desktopSlider && desktopSlider.value) {
    currentValue = parseInt(desktopSlider.value);
  } else {
    // 如果没有滑块，从 AppState 获取
    currentValue = parseInt(AppState.audio.autoNextDelay) || 3;
  }
  
  let newValue = currentValue;
  
  // 单步增减，确保在 1-5 范围内
  if (minus && currentValue > 1) {
    newValue = currentValue - 1;
  } else if (plus && currentValue < 5) {
    newValue = currentValue + 1;
  } else {
    return; // 没有变化
  }
  
  // 更新桌面端滑块（这是主要的数据源）
  if (desktopSlider) {
    desktopSlider.value = newValue;
    desktopSlider.dispatchEvent(new Event('input', { bubbles: true }));
    desktopSlider.dispatchEvent(new Event('change', { bubbles: true }));
  }
  
  // 同步更新 AppState
  AppState.audio.autoNextDelay = newValue;
  
  // 更新移动端显示
  document.getElementById('mobileAutoNextTimeValue').textContent = `${newValue}秒`;
}

  /*********************** 步进器初始化（只一次） ***********************/
static initMobileAutoNextStepper() {
  
  const mobileCheckbox = document.getElementById('mobileAutoNextCheckbox');
  const stepDown = document.querySelector('#mobileLeftPanel .time-btn.minus');
  const stepUp = document.querySelector('#mobileLeftPanel .time-btn.plus');
  const timeValue = document.getElementById('mobileAutoNextTimeValue');
  
  if (!mobileCheckbox || !stepDown || !stepUp || !timeValue) {
    console.warn('⚠️ 移动端步进器元素未找到');
    return;
  }

  // 克隆替换按钮，移除所有可能的事件监听器
  const newStepDown = stepDown.cloneNode(true);
  const newStepUp = stepUp.cloneNode(true);
  stepDown.parentNode.replaceChild(newStepDown, stepDown);
  stepUp.parentNode.replaceChild(newStepUp, stepUp);

  // 重新获取元素引用
  const freshStepDown = document.querySelector('#mobileLeftPanel .time-btn.minus');
  const freshStepUp = document.querySelector('#mobileLeftPanel .time-btn.plus');

  // 添加节流控制
  let isProcessing = false;

  /* ---------- 更新显示函数 ---------- */
  const updateDisplay = () => {
    // 从桌面端滑块获取当前值
    const desktopSlider = document.getElementById('infoDisplayTime');
    let delay = 3;
    
    if (desktopSlider && desktopSlider.value) {
      delay = parseInt(desktopSlider.value);
    } else {
      delay = parseInt(AppState.audio.autoNextDelay) || 3;
    }
    
    // 确保在有效范围内
    delay = Math.max(1, Math.min(5, delay));
    
    // 更新显示
    timeValue.textContent = `${delay}秒`;
    
    // 关键修复：根据复选框状态和边界值来禁用按钮
    const isAutoNextEnabled = mobileCheckbox.checked;
    freshStepDown.disabled = !isAutoNextEnabled || delay <= 1;
    freshStepUp.disabled = !isAutoNextEnabled || delay >= 5;
    
    // 更新按钮样式以反映禁用状态
    if (!isAutoNextEnabled) {
      freshStepDown.style.opacity = '0.5';
      freshStepDown.style.cursor = 'not-allowed';
      freshStepUp.style.opacity = '0.5';
      freshStepUp.style.cursor = 'not-allowed';
    } else {
      freshStepDown.style.opacity = delay <= 1 ? '0.5' : '1';
      freshStepDown.style.cursor = delay <= 1 ? 'not-allowed' : 'pointer';
      freshStepUp.style.opacity = delay >= 5 ? '0.5' : '1';
      freshStepUp.style.cursor = delay >= 5 ? 'not-allowed' : 'pointer';
    }
    
    // 更新复选框状态
    const desktopCheckbox = document.getElementById('autoNextCheckbox');
    if (desktopCheckbox) {
      mobileCheckbox.checked = desktopCheckbox.checked;
    }
    
    // 同步到 AppState
    AppState.audio.autoNextDelay = delay;
    AppState.audio.autoNextEnabled = isAutoNextEnabled;
  };

  /* ---------- 为步进按钮绑定一次性事件（带节流） ---------- */
  const handleStepClick = (isPlus) => (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    
    // 节流控制：如果正在处理，直接返回
    if (isProcessing) {
      return;
    }
    
    // 检查自动下一音是否启用
    if (!mobileCheckbox.checked) {
      return;
    }
    
    isProcessing = true;
    
    // 直接处理步进逻辑，不调用 handleTimeStepper
    const desktopSlider = document.getElementById('infoDisplayTime');
    let currentValue = 3;
    
    if (desktopSlider && desktopSlider.value) {
      currentValue = parseInt(desktopSlider.value);
    }
    
    let newValue = currentValue;
    
    if (isPlus && currentValue < 5) {
      newValue = currentValue + 1;
    } else if (!isPlus && currentValue > 1) {
      newValue = currentValue - 1;
    } else {
      isProcessing = false;
      return; // 没有变化
    }
    
    // 更新桌面端滑块
    if (desktopSlider) {
      desktopSlider.value = newValue;
      desktopSlider.dispatchEvent(new Event('input', { bubbles: true }));
      desktopSlider.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    // 更新状态和显示
    AppState.audio.autoNextDelay = newValue;
    timeValue.textContent = `${newValue}秒`;
    
    // 立即更新按钮状态
    updateDisplay();
    
    // 100ms后解除节流，允许下一次点击
    setTimeout(() => {
      isProcessing = false;
    }, 100);
  };

  freshStepDown.addEventListener('click', handleStepClick(false));
  freshStepUp.addEventListener('click', handleStepClick(true));

  /* ---------- 复选框事件 ---------- */
  mobileCheckbox.addEventListener('change', (e) => {
    e.stopPropagation();
    
    const isChecked = mobileCheckbox.checked;
    
    // 更新桌面端复选框
    const desktopCheckbox = document.getElementById('autoNextCheckbox');
    if (desktopCheckbox) {
      desktopCheckbox.checked = isChecked;
      desktopCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
    
    AppState.audio.autoNextEnabled = isChecked;
    
    // 关键：立即更新步进按钮状态
    updateDisplay();
  });

  /* ---------- 监听桌面端变化 ---------- */
  // 监听滑块变化
  const desktopSlider = document.getElementById('infoDisplayTime');
  if (desktopSlider) {
    desktopSlider.addEventListener('input', updateDisplay);
    desktopSlider.addEventListener('change', updateDisplay);
  }

  // 监听复选框变化
  const desktopCheckbox = document.getElementById('autoNextCheckbox');
  if (desktopCheckbox) {
    desktopCheckbox.addEventListener('change', (e) => {
      mobileCheckbox.checked = desktopCheckbox.checked;
      AppState.audio.autoNextEnabled = desktopCheckbox.checked;
      updateDisplay();
    });
  }

  // 初始显示
  setTimeout(() => {
    updateDisplay();
  }, 100);
}

  /*********************** 遮罩关闭处理（防误触） ***********************/
  static initOverlayCloseHandler() {
    this.overlayEl = document.getElementById('mobilePanelOverlay');
    this.ansAreaEl = document.getElementById('ans');
    if (!this.overlayEl) return;

    let touched = false;

    this.overlayEl.addEventListener('touchstart', e => {
      touched = true;
      e.preventDefault(); // 阻止穿透
    }, { passive: false });

    this.overlayEl.addEventListener('click', () => {
      if (touched) { touched = false; return; } // touchend 已处理
      this.closeLeftPanelWithDelay();
    });
  }

  static closeLeftPanelWithDelay() {
    // 1. 临时禁用答题区点击
    this.ansAreaEl?.classList.add('answer-area-blocked');
    // 2. 延迟关闭面板，让 touch 事件先结束
    setTimeout(() => {
      this.leftPanelEl?.classList.remove('active');
      this.overlayEl?.classList.remove('active');
      document.body.style.overflow = '';
      // 3. 恢复答题区点击
      setTimeout(() => this.ansAreaEl?.classList.remove('answer-area-blocked'), 0);
    }, 150);
  }

  /*********************** 右侧面板统计刷新（保持原接口） ***********************/
  static updateRightPanelStats(stats) {
    if (!stats) return;
    const map = {
      mobileTotalPlays: `${stats.completed || 0}题`,
      mobileCorrectCount: `${stats.mastered || 0}题`,
      mobileAccuracyRate: `${stats.masteryRate || 0}%`,
      mobileCurrentStreak: `${stats.currentStreak || 0}连胜`,
      mobileMaxStreak: `${stats.maxStreak || 0}连胜`
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });
  }
}

/*********************** 自动初始化遮罩关闭逻辑 ***********************/
document.addEventListener('DOMContentLoaded', () => {
  MobileContentLoader.initOverlayCloseHandler();
});