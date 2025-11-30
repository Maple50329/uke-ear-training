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
      this.renderLeftPanel();
      this.bindDelegatedEvents();
      this.syncInitialState();
      this.initMobileAutoNextStepper();
      this.initMobileErrorLimitStepper();
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

      <!-- 其他选项 -->
      <div class="mobile-settings-group">
        <div class="mobile-settings-title">其他选项</div>

        <!-- 自动下一音 -->
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

        <!-- 先播放音阶 -->
        <div class="mobile-settings-option">
          <label class="checkbox-label">
            <input type="checkbox" id="mobileScalePlaybackCheckbox" checked>
            <span class="checkbox-text">先播放音阶</span>
          </label>
        </div>

        <!-- === 可错误次数设置 === -->
        <div class="mobile-settings-option">
          <div class="checkbox-with-buttons">
            <label class="checkbox-label">
              <input type="checkbox" id="mobileErrorLimitCheckbox">
              <span class="checkbox-text">可错误次数</span>
            </label>
            <div class="time-controls">
              <button class="error-btn minus" type="button" disabled>-</button>
              <span class="error-value" id="mobileErrorLimitValue">1次</span>
              <button class="error-btn plus" type="button" disabled>+</button>
            </div>
          </div>
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

      // 音域切换
      if (t.classList.contains('mobile-range-btn')) {
        e.stopPropagation();
        this.activateBtn(t, '[data-role="range-group"] .mobile-range-btn');
        updateRange(t.dataset.range);
        document.querySelector(`.range-btn[data-range="${t.dataset.range}"]`)?.click();
      }

      // 基准音切换
      else if (t.classList.contains('mobile-mode-btn')) {
        e.stopPropagation();
        this.activateBtn(t, '[data-role="mode-group"] .mobile-mode-btn');
        document.querySelector(`.mode-btn[data-mode="${t.dataset.mode}"]`)?.click();
      }
    });

    /* -------- 下拉框同步 -------- */
    left.addEventListener('change', e => {
      if (e.target.id === 'mobileKeySelect') {
        document.getElementById('keySelect').value = e.target.value;
        document.getElementById('keySelect').dispatchEvent(new Event('change'));
      } 
      else if (e.target.id === 'mobileDifficultySelect') {
        document.getElementById('difficultySelect').value = e.target.value;
        document.getElementById('difficultySelect').dispatchEvent(new Event('change'));

        if (!AppState.quiz.locked && !AppState.quiz.hasStarted) {
          setTimeout(() => {
            const renderFunc = AppGlobal.getTool('renderAnswerButtons');
            const initAreaFunc = AppGlobal.getTool('initAnswerArea');
            if (renderFunc && initAreaFunc) initAreaFunc();
          }, 50);
        }
      }
    });

    /* -------- 复选框同步（含错误次数） -------- */
    left.addEventListener('change', e => {
      const idMap = {
        mobileAutoNextCheckbox: 'autoNextCheckbox',
        mobileScalePlaybackCheckbox: 'enableScalePlayback',
        mobileErrorLimitCheckbox: 'enableErrorLimit'
      };
      const desktopId = idMap[e.target.id];

      if (desktopId) {
        const desktopEl = document.getElementById(desktopId);
        if (desktopEl) {
          desktopEl.checked = e.target.checked;
          desktopEl.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 同步步进按钮状态
        if (e.target.id === 'mobileErrorLimitCheckbox') {
          this.updateErrorLimitButtonsState();
        }
      }
    });
  }

  /*********************** 同步桌面端初始化状态 ***********************/
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
    document.getElementById('mobileKeySelect').value =
      document.getElementById('keySelect').value;

    document.getElementById('mobileDifficultySelect').value =
      document.getElementById('difficultySelect').value;

    // 自动下一音
    document.getElementById('mobileAutoNextCheckbox').checked =
      document.getElementById('autoNextCheckbox')?.checked ?? false;

    document.getElementById('mobileScalePlaybackCheckbox').checked =
      document.getElementById('enableScalePlayback')?.checked ?? true;

    // 自动下一音步进值
    const desktopSlider = document.getElementById('infoDisplayTime');
    const timeValue = document.getElementById('mobileAutoNextTimeValue');
    if (desktopSlider && timeValue) {
      const delay = parseInt(desktopSlider.value) || 3;
      timeValue.textContent = `${delay}秒`;
      AppState.audio.autoNextDelay = delay;
    }

    // === 同步错误次数 ===
    const desktopErrCheck = document.getElementById('enableErrorLimit');
    const mobileErrCheck = document.getElementById('mobileErrorLimitCheckbox');
    const desktopErrSlider = document.getElementById('errorLimitSlider');

    if (desktopErrCheck && mobileErrCheck) {
      mobileErrCheck.checked = desktopErrCheck.checked;
    }

    const errValue = document.getElementById('mobileErrorLimitValue');
    if (desktopErrSlider && errValue) {
      const v = parseInt(desktopErrSlider.value) || 1;
      errValue.textContent = `${v}次`;
    }

    this.updateErrorLimitButtonsState();
  }

  /*********************** 工具方法 ***********************/
  static activateBtn(target, selector) {
    target.closest('.mobile-settings-section').querySelectorAll(selector)
      .forEach(b => {
        b.style.background = 'var(--btn-sec)';
        b.style.color = 'var(--text)';
      });

    target.style.background = 'var(--accent-color)';
    target.style.color = 'white';
  }

  /*********************** 数字滚动动画（核心） ***********************/
  // ★ 新增动画：数字切换时滚动
  static animateValue(el, newText) {
    if (!el) return;

    // 设置滚动目标
    el.setAttribute("data-next", newText);
    el.classList.add("animate");

    setTimeout(() => {
      el.textContent = newText;
      el.classList.remove("animate");
      el.removeAttribute("data-next");
    }, 280); // 动画时间要与 CSS 匹配
  }

/*********************** 自动下一音步进器 ***********************/
static initMobileAutoNextStepper() {
  const mobileCheckbox = document.getElementById('mobileAutoNextCheckbox');
  const minus = document.querySelector('#mobileLeftPanel .time-btn.minus');
  const plus  = document.querySelector('#mobileLeftPanel .time-btn.plus');
  const timeValue = document.getElementById('mobileAutoNextTimeValue');
  const desktopSlider = document.getElementById('infoDisplayTime');

  if (!mobileCheckbox || !minus || !plus || !timeValue) return;

  // ⭐ 新增：根据勾选状态启用 / 禁用按钮
  const updateButtonsState = () => {
    const enabled = mobileCheckbox.checked;

    minus.disabled = !enabled;
    plus.disabled  = !enabled;

    // 如果你想有一点视觉反馈（可选）
    minus.style.opacity = enabled ? 1 : 0.4;
    plus.style.opacity  = enabled ? 1 : 0.4;
  };

  // 先根据当前状态初始化一次
  updateButtonsState();

  const step = (delta) => {
    if (!desktopSlider) return;

    let v = parseInt(desktopSlider.value);
    let nv = Math.max(1, Math.min(5, v + delta));
    if (nv === v) return;

    desktopSlider.value = nv;
    desktopSlider.dispatchEvent(new Event('input', { bubbles: true }));
    desktopSlider.dispatchEvent(new Event('change', { bubbles: true }));

    this.animateValue(timeValue, `${nv}秒`);
  };

  // 只有在勾选时才允许改变值
  minus.onclick = () => mobileCheckbox.checked && step(-1);
  plus.onclick  = () => mobileCheckbox.checked && step(+1);

  // ⭐ 新增：勾选框变化时，实时启用/禁用按钮
  mobileCheckbox.addEventListener('change', updateButtonsState);

  // 桌面滑块拖动时，同步移动端显示
  if (desktopSlider) {
    desktopSlider.addEventListener('input', () => {
      this.animateValue(timeValue, `${desktopSlider.value}秒`);
    });
  }
}


  /*********************** 错误次数步进器 ***********************/
  static initMobileErrorLimitStepper() {
  const checkbox = document.getElementById('mobileErrorLimitCheckbox');
  const minus = document.querySelector('#mobileLeftPanel .error-btn.minus');
  const plus  = document.querySelector('#mobileLeftPanel .error-btn.plus');
  const val   = document.getElementById('mobileErrorLimitValue');
  const sld   = document.getElementById('errorLimitSlider');

  if (!checkbox || !minus || !plus || !val || !sld) return;

  const step = (delta) => {
    let v = parseInt(sld.value);
    let nv = Math.max(0, Math.min(3, v + delta));
    if (nv === v) return;

    sld.value = nv;
    sld.dispatchEvent(new Event('input', { bubbles: true }));
    sld.dispatchEvent(new Event('change', { bubbles: true }));

    AppState.quiz.allowedErrorCount = nv;

    this.animateValue(val, `${nv}次`);
    this.updateErrorLimitButtonsState();
  };

  minus.onclick = () => checkbox.checked && step(-1);
  plus.onclick  = () => checkbox.checked && step(+1);

  // ⭐ 新增：桌面滑块变化时，反向刷新移动端显示
  const syncFromSlider = () => {
    const v = parseInt(sld.value) || 0;
    this.animateValue(val, `${v}次`);
    this.updateErrorLimitButtonsState();
  };

  // 绑定一次监听
  sld.addEventListener('input', syncFromSlider);
  sld.addEventListener('change', syncFromSlider);

  // 进入面板时先同步一次
  syncFromSlider();
}

  /*********************** 更新错误次数按钮状态 ***********************/
  static updateErrorLimitButtonsState() {
    const checkbox = document.getElementById('mobileErrorLimitCheckbox');
    const minus = document.querySelector('#mobileLeftPanel .error-btn.minus');
    const plus  = document.querySelector('#mobileLeftPanel .error-btn.plus');
    const sld   = document.getElementById('errorLimitSlider');

    if (!checkbox || !minus || !plus || !sld) return;

    const v = parseInt(sld.value);
    const en = checkbox.checked;

    minus.disabled = !en || v <= 0;
    plus.disabled  = !en || v >= 3;

    minus.style.opacity = minus.disabled ? 0.4 : 1;
    plus.style.opacity  = plus.disabled ? 0.4 : 1;
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



  /*********************** 遮罩关闭处理（防误触） ***********************/
  static initOverlayCloseHandler() {
    this.overlayEl = document.getElementById('mobilePanelOverlay');
    this.ansAreaEl = document.getElementById('ans');
    if (!this.overlayEl) return;

    let touch = false;

    this.overlayEl.addEventListener('touchstart',e=>{
      touch = true;
      e.preventDefault();
    },{passive:false});

    this.overlayEl.addEventListener('click',()=>{
      if (touch) { touch=false; return; }
      this.closeLeftPanelWithDelay();
    });
  }

  static closeLeftPanelWithDelay() {
    this.ansAreaEl?.classList.add('answer-area-blocked');
    setTimeout(()=>{
      this.leftPanelEl?.classList.remove('active');
      this.overlayEl?.classList.remove('active');
      document.body.style.overflow='';
      setTimeout(()=>this.ansAreaEl?.classList.remove('answer-area-blocked'),0);
    },150);
  }

  /*********************** 右侧面板统计 ***********************/
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