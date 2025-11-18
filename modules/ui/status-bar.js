import { AppState } from '../core/state.js';
import AppGlobal from '../core/app.js';

const bar = document.createElement('div');
bar.id = 'desktopStatusBar';

/* ---------- 内部更新函数 ---------- */
const update = async () => {
  const { quiz, audio } = AppState;
  const baseMode = quiz.questionBaseMode || 'c';
  const base = baseMode === 'c' ? 'Do' : 'La';
  
  const key  = quiz.currentKey ?? 'C';
  const diff = quiz.currentDifficulty ?? 'basic';

  let currentRangeArray = [];
  try {
    const rangeTool = AppGlobal.getTool('getCurrentRange');
    if (rangeTool) {
      const rangeResult = rangeTool();
      // 检查是否是 Promise
      currentRangeArray = rangeResult && typeof rangeResult.then === 'function' 
        ? await rangeResult 
        : rangeResult || [];
    }
  } catch (error) {
    console.warn('状态栏: 获取音域数据失败', error);
    currentRangeArray = [];
  }
  
  const range = currentRangeArray.length > 0 && currentRangeArray[0]?.includes('3') 
    ? '小字组' 
    : '小字一组';
  
  const play = audio.isPlaying ? '🔊 播放中' : '🔇 已就绪';

  bar.innerHTML = `
    <span class="sb-item">基准音：${base}</span>
    <span class="sb-sep"></span>
    <span class="sb-item">调性：${key} 大调</span>
    <span class="sb-sep"></span>
    <span class="sb-item">难度：${diff === 'basic' ? '仅基本音级' : '含变化音级'}</span>
    <span class="sb-sep"></span>
    <span class="sb-item">音域：${range}</span>
    <span class="sb-sep"></span>
    <span class="sb-item">${play}</span>
  `;
};

/* ---------- 监听状态变化 ---------- */
const events = [
  'range-changed',
  'settings-updated',
  'base-mode-changed',
  'quiz-reset',
  'initial-state'
];
events.forEach(e => window.addEventListener(e, () => requestAnimationFrame(update)));

// 监听左侧面板设置变化
function setupPanelChangeListeners() {
  // 监听基准音按钮点击
  const modeButtons = document.querySelectorAll('.mode-btn');
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
      
      if (shouldSyncPanelChanges()) {
        // 立即更新基准音模式状态
        AppState.quiz.questionBaseMode = baseMode;
        requestAnimationFrame(update);
        
        // 触发基准音变化事件
        window.dispatchEvent(new CustomEvent('base-mode-changed', {
          detail: { mode: baseMode }
        }));
      } else {
        // 在播放状态或已答题状态，保存为预选设置
        AppState.quiz.pendingBaseModeChange = baseMode;
      }
    });
  });
  
  // 监听调性选择变化
  const keySelect = document.getElementById('keySelect');
  if (keySelect) {
    keySelect.addEventListener('change', () => {
      if (shouldSyncPanelChanges()) {
        AppState.quiz.currentKey = keySelect.value;
        requestAnimationFrame(update);
        
        // 触发设置更新事件
        window.dispatchEvent(new CustomEvent('settings-updated'));
      } else {
        // 在播放状态或已答题状态，保存为预选设置
        AppState.quiz.pendingKeyChange = keySelect.value;
      }
    });
  }
  
  // 监听难度选择变化
  const difficultySelect = document.getElementById('difficultySelect');
  if (difficultySelect) {
    difficultySelect.addEventListener('change', () => {
      if (shouldSyncPanelChanges()) {
        AppState.quiz.currentDifficulty = difficultySelect.value;
        requestAnimationFrame(update);
        
        // 触发设置更新事件
        window.dispatchEvent(new CustomEvent('settings-updated'));
      } else {
        // 在播放状态或已答题状态，保存为预选设置
        AppState.quiz.pendingDifficultyChange = difficultySelect.value;
      }
    });
  }
  
  // 监听音域按钮点击
  const rangeButtons = document.querySelectorAll('.range-btn');
  rangeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (shouldSyncPanelChanges()) {
        // 短暂延迟确保音域已更新
        setTimeout(() => {
          requestAnimationFrame(update);
          // 触发设置更新事件
          window.dispatchEvent(new CustomEvent('settings-updated'));
        }, 50);
      }
    });
  });
}

// 音频状态管理函数
function setupAudioStateManagement() {
  // 监听音频状态变化事件
  window.addEventListener('audio-state-changed', (event) => {
    AppState.audio.isPlaying = event.detail.isPlaying;
    console.log('🔊 音频状态变化:', AppState.audio.isPlaying ? '播放中' : '就绪', '原因:', event.detail.action);
    requestAnimationFrame(update);
  });
  
  // 监听播放/停止相关的其他事件，确保状态同步
  window.addEventListener('quiz-reset', () => {
    // 复位时确保音频状态为停止
    AppState.audio.isPlaying = false;
    setTimeout(() => requestAnimationFrame(update), 150);
  });
  
  window.addEventListener('answer-correct', () => {
    // 答对时确保音频状态为停止
    AppState.audio.isPlaying = false;
    // 这里不调用 update()，保持状态栏不变
  });
}

// 判断是否应该同步面板变化到状态栏
function shouldSyncPanelChanges() {
  const { quiz } = AppState;
  
  // 应该同步的情况：
  const shouldSync = (
    !quiz.hasStarted ||        // 初始状态（未开始）
    quiz.fromReset ||          // 复位后
    (!quiz.currentTargetNote && !quiz.answered) // 没有当前题目且未答题
  );
  
  // 不应该同步的情况：
  const shouldNotSync = (
    (quiz.hasStarted && quiz.currentTargetNote && !quiz.answered) || // 播放中但未答题
    quiz.answered                          // 已回答（包括答对后）
  );
  
  return shouldSync && !shouldNotSync;
}

// 专门监听基准音模式状态变化
let lastBaseMode = AppState.quiz.questionBaseMode || 'c';
const checkBaseModeChange = () => {
  const currentBaseMode = AppState.quiz.questionBaseMode || 'c';
  if (currentBaseMode !== lastBaseMode) {
    lastBaseMode = currentBaseMode;
    requestAnimationFrame(update);
  }
  requestAnimationFrame(checkBaseModeChange);
};

// 添加全局音域变化监听
function setupRangeChangeListener() {
  // 监听全局音域变化事件
  window.addEventListener('range-changed', (event) => {
      // 无论什么状态都更新状态栏显示
      requestAnimationFrame(update);
  });
}

/* ---------- 首次渲染 ---------- */
export function initStatusBar() {
  // 创建状态栏容器
  bar.style.cssText = `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 28px;
    background: var(--card);
    border-top: 1px solid var(--btn-sec);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 16px;
    font-size: 13px;
    color: var(--text);
    z-index: 999;
    backdrop-filter: blur(8px);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-weight: 500;
  `;
  
  // 添加状态栏样式 - 简化版本
  const style = document.createElement('style');
  style.textContent = `
    .sb-item {
      display: flex;
      align-items: center;
      padding: 0 10px;
      white-space: nowrap;
      transition: background 0.2s ease;
      border-radius: 4px;
      height: 20px;
    }
    
    .sb-item:hover {
      background: var(--btn-sec);
    }
    
    .sb-sep {
      width: 1px;
      height: 14px;
      background: var(--btn-sec-h);
      margin: 0 6px;
      opacity: 0.6;
    }
    
    #desktopStatusBar {
      user-select: none;
      -webkit-user-select: none;
    }
    
    /* 播放状态样式 */
    .sb-play-status {
      background: var(--accent-color);
      color: white !important;
      font-weight: 600;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 12px;
      margin-left: 4px;
    }
    
    .sb-play-status:hover {
      background: var(--accent-color-hover, var(--accent-color));
    }
    
    @media (max-width: 768px) {
      #desktopStatusBar {
        display: none;
      }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(bar);
  setupPanelChangeListeners();
  setupRangeChangeListener();
  checkBaseModeChange();
  setupStatusBarEventListeners();
  setupAudioStateManagement();
  update();
  
  // 设置初始状态
  AppState.quiz.hasStarted = false;
  AppState.quiz.answered = false;
  AppState.quiz.currentTargetNote = null;
}

// ========== 新增函数：设置状态栏事件监听器 ========== 
function setupStatusBarEventListeners() {
  // 新增的事件监听
  const newEvents = [
    'quiz-reset-complete',  // 复位完成
    'settings-applied',     // 设置已应用
    'pending-changes-applied' // 预选设置已应用
  ];
  
  newEvents.forEach(e => window.addEventListener(e, () => {
    console.log(`状态栏: 收到 ${e} 事件，更新显示`);
    requestAnimationFrame(update);
  }));
  
  // 现有的复位事件监听（增强）
  window.addEventListener('quiz-reset', () => {
    // 短暂延迟，确保复位完成后再更新
    setTimeout(() => requestAnimationFrame(update), 150);
  });
  
  // 设置更新事件监听
  window.addEventListener('settings-updated', () => {
    requestAnimationFrame(update);
  });
  
  // 基准音模式变化事件监听
  window.addEventListener('base-mode-changed', () => {
    requestAnimationFrame(update);
  });
  

}
