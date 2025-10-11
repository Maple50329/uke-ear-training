// modules/core/boot.js
import { AppState } from './state.js';
import { notes, ranges } from './config.js';
import { UI_TEXT, KEY_SCALES } from './constants.js';
import statsManager from '../quiz/stats-manager.js';

// Audio 相关导入
import { SAMPLE } from '../audio/sampler-manager.js';
import { initSampler, initAudioContextResume, stopPlayback } from '../audio/engine.js';
import { loadSFX, initSFXSampler } from '../audio/sfx.js';

// UI 组件导入
import { updateBigButtonState, updateResetButtonState, initBigPlayButton, initAllButtons } from '../ui/buttons.js';
import { initInfoDisplaySlider, initMobileSidebar, initBaseModeButtons } from '../ui/settings.js';
import { 
  updateCurrentPitchDisplay, 
  disableAnswerButtons, 
  showWelcomeOverlays, 
  updateSimplePanel, 
  initPitchVisualizer 
} from '../ui/feedback.js';
import { renderAnswerButtons, initScalingSystem, forceRefreshScale  } from '../ui/answer-grid.js';
import { initAllPanelFeatures, resetAnswerInfo, showInfoCards, hideInfoCards } from '../ui/panel-manager.js';

// Quiz 功能导入
import { playQuizSequence } from '../quiz/manager.js';
import { addToHistory, updateRightPanelStats } from '../quiz/history.js'; 

// 工具和其他功能导入
import { initUkuleleKeySelector } from '../theory/ukulele.js';
import { showKeyChangeToast } from '../utils/displayHelpers.js';

// 导入工具箱和注册器
import AppGlobal from './app.js';
import { registerAllTools, checkToolbox, debugToolbox } from './tool-registry.js';

// 新增：导入开始屏幕管理器
import { StartScreenManager } from '../modes/start-screen.js';

// 简化的工具管理器
const ToolManager = {
  /**
   * 初始化工具箱
   */
  initialize() {
    registerAllTools();
    const toolboxReady = checkToolbox();
    
    if (!toolboxReady) {
      console.warn('⚠️ 工具箱异常，启动详细调试...');
      debugToolbox();
    }
    
    return toolboxReady;
  }
};

// 新增：隐藏主界面的函数
function hideMainInterfaceForStartScreen() {
    
    // 隐藏主界面元素
    const mainElements = [
        '.layout-grid-container',
        '.daw-header',
        '.left-panel',
        '.main-content', 
        '.right-panel'
    ];
    
    mainElements.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = 'none';
        }
    });
    
    // 确保开始屏幕显示
    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.style.display = 'flex';
        // 添加一个小延迟确保样式应用
        setTimeout(() => {
            startScreen.classList.add('active');
        }, 50);
    }
}

// 在AppState中添加统计信息
if (!AppState.stats) {
    AppState.stats = {
        totalPlays: 0,
        correctAnswers: 0,
        accuracyRate: 0
    };
}

// 更新当前音高显示
const originalPlayQuizSequence = window.playQuizSequence || playQuizSequence;
window.playQuizSequence = async function(isReplay = false) {
    // 在播放前更新当前音高显示
    if (!isReplay && AppState.quiz.currentTargetNote) {
        const updatePitch = AppGlobal.getTool('updateCurrentPitchDisplay');
        if (updatePitch) {
            updatePitch(AppState.quiz.currentTargetNote);
        } else {
            updateCurrentPitchDisplay(AppState.quiz.currentTargetNote);
        }
    }
    
    return originalPlayQuizSequence(isReplay);
};

// 初始化右侧面板
const originalBoot = window.boot;
window.boot = async function() {
    if (originalBoot) {
      await originalBoot();
    }
    const initRightPanelTool = AppGlobal.getTool('initRightPanel');
    if (initRightPanelTool)
      initRightPanelTool();

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPitchVisualizer);
    } else {
      setTimeout(initPitchVisualizer, 100);
    }
    console.log('✅ 启动脚本完成');
  };

// 答题区初始化函数
function initAnswerArea() {
  let renderFunction = AppGlobal.getTool('renderAnswerButtons');
  let disableFunction = AppGlobal.getTool('disableAnswerButtons');
  
  if (!renderFunction || !disableFunction) {
    console.warn('⚠️ 关键工具未找到，使用备用方案');
    renderFunction = renderFunction || renderAnswerButtons;
    disableFunction = disableFunction || disableAnswerButtons;
  }
  
  if (!AppState.dom.ansArea) {
      console.warn('答题区元素未找到，延迟初始化');
      setTimeout(initAnswerArea, 100);
      return;
  }
  
  if (!KEY_SCALES || Object.keys(KEY_SCALES).length === 0) {
      console.warn('音阶数据未加载，延迟初始化');
      setTimeout(initAnswerArea, 100);
      return;
  }
  
  const difficulty = document.getElementById('difficultySelect')?.value || 'basic';
  const key = document.getElementById('keySelect')?.value || 'C';
  
  let scale;
  if (difficulty === 'basic') {
      scale = KEY_SCALES[key]?.basic || KEY_SCALES.C.basic;
  } else {
      scale = KEY_SCALES[key]?.extended || KEY_SCALES.C.extended;
  }
  
  if (!scale || scale.length === 0) {
      console.error('无法获取音阶数据，使用默认C大调');
      scale = KEY_SCALES.C.basic;
  }
  
  try {
      renderFunction(scale, difficulty);
      disableFunction();
      setTimeout(() => {
        forceRefreshScale();
      }, 200);
      AppState.dom.ansArea.style.display = 'grid';
      AppState.dom.ansArea.style.opacity = '1';
  } catch (error) {
      console.error('答题区初始化失败:', error);
  }
}

// 监听调性选择变化
function initKeyChangeListener() {
  const keySelect = document.getElementById('keySelect');
  if (keySelect) {
    let previousKey = keySelect.value;
    
    keySelect.addEventListener('change', function() {
      const selectedKey = keySelect.value;
      
      if (AppState.quiz.locked) {
        keySelect.value = previousKey;
        showKeyChangeToast('请等待当前题目播放完成');
        return;
      }
      
      if (AppState.quiz.hasStarted && !AppState.quiz.answered) {
        keySelect.value = previousKey;
        showKeyChangeToast('请先完成答题或复位后更改调性');
        return;
      }
      
      previousKey = selectedKey;
      
      const mainBtn = document.getElementById('startBtn');
      if (mainBtn && mainBtn.textContent === UI_TEXT.NEXT) {
        showKeyChangeToast(`已选择${selectedKey}大调，将在下一题生效`);
      }
    });
  }
}

// 标准模式启动函数
export async function bootStandardMode() {

    /* -------------- 界面显隐 -------------- */
    document.querySelector('.layout-grid-container').style.display = 'grid';
    document.querySelector('.daw-header').style.display = 'flex';
    document.querySelector('.left-panel').style.display = 'block';
    document.querySelector('.main-content').style.display = 'block';
    document.querySelector('.right-panel').style.display = 'block';

    const startScreen = document.getElementById('startScreen');
    if (startScreen) {
        startScreen.style.display = 'none';
        startScreen.classList.remove('active');
    }

    /* -------------- 基础初始化 -------------- */
    showWelcomeOverlays();
    AppState.quiz.hasStarted = false;
    AppState.quiz.answered = false;

    const updatePitchDisplayFunc =
        AppGlobal.getTool('updateCurrentPitchDisplay') || updateCurrentPitchDisplay;
    updatePitchDisplayFunc();

    initScalingSystem();
    setTimeout(() => initAnswerArea(), 100);

    AppState.quiz.autoNextTimer = null;
    const autoNextCheckbox = document.getElementById('autoNextCheckbox');
    if (autoNextCheckbox) autoNextCheckbox.checked = false;

    /* -------------- 主按钮 -------------- */
    const oldStartBtn = document.getElementById('startBtn');
    AppState.dom.mainBtn = document.createElement('button');
    AppState.dom.mainBtn.id = 'startBtn';
    AppState.dom.mainBtn.className = 'btn-primary';
    AppState.dom.mainBtn.textContent = UI_TEXT.INITIAL;
    AppState.dom.mainBtn.style.display = 'none';
    if (oldStartBtn) oldStartBtn.replaceWith(AppState.dom.mainBtn);

    /* -------------- 答题区 & 消息 -------------- */
    AppState.dom.ansArea = document.getElementById('ans');
    AppState.dom.msgDisplay = document.getElementById('msg');
    if (AppState.dom.ansArea) AppState.dom.ansArea.classList.add('ans-area', 'disabled');

    AppState.quiz.shouldUpdateDegree = true;
    if (AppState.dom.msgDisplay) {
        AppState.dom.msgDisplay.textContent = '点击开始训练';
        AppState.dom.msgDisplay.style.display = 'block';
    }
    updatePitchDisplayFunc(null, null);

    /* -------------- 主按钮点击事件 -------------- */
    AppState.dom.mainBtn.onclick = async () => {
        if (AppState.quiz.locked) return;
        AppState.quiz.locked = true;
        updateResetButtonState();
        stopPlayback();
        try {
            AppState.quiz.answered = false;
            AppState.audio.shouldStop = false;
            if (AppState.dom.mainBtn.textContent === UI_TEXT.NEXT) {
                AppState.quiz.canReset = true;
                updateResetButtonState();
                await playQuizSequence(false);
            } else if (
                AppState.dom.mainBtn.textContent === UI_TEXT.REPLAY &&
                AppState.quiz.hasStarted
            ) {
                await playQuizSequence(true);
            } else {
                AppState.quiz.canReset = true;
                updateResetButtonState();
                await playQuizSequence(false);
            }
        } catch (error) {
            console.error('播放失败:', error);
            AppState.quiz.locked = false;
            updateResetButtonState();
        } finally {
            AppState.quiz.locked = false;
            updateResetButtonState();
            updateBigButtonState();
        }
    };

    /* -------------- 其他 UI 初始化 -------------- */
    initUkuleleKeySelector();
    initBaseModeButtons();
    initKeyChangeListener();
    initAllButtons();
    updateBigButtonState();
    initMobileSidebar();
    initAllPanelFeatures();
    initInfoDisplaySlider();

    // 右侧面板统计初始化（强制日志 + 补注册兜底）
    // 如果工具箱没注册，立即补注册
    if (!AppGlobal.hasTool('initRightPanel')) {
        console.warn('⚠️ 工具箱缺失 initRightPanel，立即补注册');
        const { initRightPanel } = await import('../quiz/history.js');
        AppGlobal.register('initRightPanel', initRightPanel);
    }

    const initRightPanelTool = AppGlobal.getTool('initRightPanel');

    await initRightPanelTool();
}

// 确保全局可访问
window.bootStandardMode = bootStandardMode;

// 主启动函数
export async function boot() {
    console.log('🎵 应用启动中...');
    
    // 第一步：加载统计数据
    if (statsManager && typeof statsManager.loadStats === 'function') {
        statsManager.loadStats();
    }

    // 第二步：初始化工具箱
    const toolboxReady = ToolManager.initialize();
    if (!toolboxReady) {
        console.warn('⚠️ 工具箱初始化有问题，但继续启动流程...');
    }

    // 第三步：初始化开始屏幕管理器
    try {
        const startScreenManager = new StartScreenManager();
        window.startScreenManager = startScreenManager;
        console.log('✅ 开始屏幕管理器初始化完成');
    } catch (error) {
        console.error('❌ 开始屏幕管理器初始化失败:', error);
        // 降级：直接进入标准模式
        console.log('🔄 降级到标准模式...');
        await bootStandardMode();
        return;
    }

    // 第四步：初始化音频系统（基础功能）
    initAudioContextResume();
    initSampler();
    initSFXSampler();
    
    try {
        await loadSFX();
        console.log('✅ 音频系统初始化完成');
    } catch (e) {
        console.error('❌ 音效加载失败:', e);
    }

    // 第五步：检查核心配置
    if (!notes || !ranges || !SAMPLE || !KEY_SCALES) {
        console.warn('核心配置未加载完成，延迟启动...');
        setTimeout(boot, 50);
        return;
    }

    // 第六步：隐藏主界面，显示开始屏幕
    hideMainInterfaceForStartScreen();
    
    console.log('🎉 应用启动完成，等待用户选择模式...');
    
    // 确保启动函数可用
    window.boot = boot;
}
// 启动应用
boot();