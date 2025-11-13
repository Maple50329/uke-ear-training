import { AppState } from './state.js';
import { notes, ranges } from './config.js';
import { UI_TEXT, KEY_SCALES } from './constants.js';
import statsManager from '../quiz/stats-manager.js';

// Audio 相关导入
import { initSampler, initAudioContextResume, stopPlayback } from '../audio/engine.js';
import { loadSFX, initSFXSampler } from '../audio/sfx.js';
import { SAMPLE } from '../audio/sampler-manager.js';

// UI 组件导入
import { initPitchVisualizer } from '../ui/feedback.js';

// 工具和其他功能导入
import { showKeyChangeToast } from '../utils/displayHelpers.js';
// 导入工具箱和注册器
import AppGlobal from './app.js';
import { registerAllTools, checkToolbox, debugToolbox, TOOL_GROUPS } from './tool-registry.js';

// 导入开始屏幕管理器
import { StartScreenManager } from '../modes/start-screen.js';

// 简化的工具管理器
const ToolManager = {
    /**
     * 初始化工具箱
     */
    initialize() {
      // 注册所有工具（纯懒加载方式）
      registerAllTools();
      
      const toolboxReady = checkToolbox();
      
      if (!toolboxReady) {
        console.warn('⚠️ 工具箱异常，启动详细调试...');
        debugToolbox();
      }
      
      return toolboxReady;
    }
  };

// 工具获取辅助函数
function getToolOrFallback(toolName, fallback) {
    const tool = AppGlobal.getTool(toolName);
    if (!tool && fallback) {
      console.warn(`⚠️ 工具 ${toolName} 未找到，使用备用方案`);
      return fallback;
    }
    return tool;
}

// 隐藏主界面的函数
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
window.playQuizSequence = async function(isReplay = false) {
    // 统一使用工具箱获取函数
    const updatePitchFunc = AppGlobal.getTool('updateCurrentPitchDisplay');
    const playQuizSequenceFunc = AppGlobal.getTool('playQuizSequence');
    
    if (!playQuizSequenceFunc) {
        console.error('playQuizSequence 工具未找到');
        return;
    }
    
    // 重置音高显示（如果函数存在）
    if (updatePitchFunc) {
        updatePitchFunc('--', null);
    }
    
    // 调用播放函数
    return playQuizSequenceFunc(isReplay);
};

// 监听调性选择变化
function initKeyChangeListener() {
    const keySelect = document.getElementById('keySelect');
    if (keySelect) {
      let previousKey = keySelect.value;
      
      keySelect.addEventListener('change', function() {
        const selectedKey = keySelect.value;
        
        // 播放中或已开始但未完成答题时，改为预选模式
        if (AppState.quiz.locked || (AppState.quiz.hasStarted && !AppState.quiz.answered)) {
          AppState.quiz.pendingKeyChange = selectedKey;
          showKeyChangeToast(`已选择${selectedKey}大调，将在下一题生效`);
          // 不恢复原值，让下拉框保持用户的选择
          return;
        }
        
        // 已答题完成时也改为预选模式
        if (AppState.quiz.answered) {
          AppState.quiz.pendingKeyChange = selectedKey;
          showKeyChangeToast(`已选择${selectedKey}大调，将在下一题生效`);
          return;
        }
        
        // 正常情况：未开始答题时立即应用
        previousKey = selectedKey;
        
        const mainBtn = document.getElementById('startBtn');
        if (mainBtn && mainBtn.textContent === UI_TEXT.NEXT) {
          showKeyChangeToast(`已选择${selectedKey}大调`);
        }
      });
    }
  }

// 监听难度选择变化
function initDifficultyChangeListener() {
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
      let previousDifficulty = difficultySelect.value;
      
      difficultySelect.addEventListener('change', function() {
        const selectedDifficulty = this.value;
        
        // 🔴 修改：播放中或已开始但未完成答题时，改为预选模式
        if (AppState.quiz.locked || (AppState.quiz.hasStarted && !AppState.quiz.answered)) {
          AppState.quiz.pendingDifficultyChange = selectedDifficulty;
          const difficultyText = selectedDifficulty === 'basic' ? '仅基本音级' : '含变化音级';
          showKeyChangeToast(`已选择${difficultyText}，将在下一题生效`);
          // 不恢复原值，让下拉框保持用户的选择
          return;
        }
        
        // 🔴 修改：已答题完成时也改为预选模式
        if (AppState.quiz.answered) {
          AppState.quiz.pendingDifficultyChange = selectedDifficulty;
          const difficultyText = selectedDifficulty === 'basic' ? '仅基本音级' : '含变化音级';
          showKeyChangeToast(`已选择${difficultyText}，将在下一题生效`);
          return;
        }
        
        // 正常情况：未开始答题时立即应用
        previousDifficulty = selectedDifficulty;
        
        const difficultyText = selectedDifficulty === 'basic' ? '仅基本音级' : '含变化音级';
        showKeyChangeToast(`已切换到${difficultyText}`);
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
    
    const showWelcomeOverlaysFunc = AppGlobal.getTool('showWelcomeOverlays');

    /* -------------- 基础初始化 -------------- */
    showWelcomeOverlaysFunc?.();
    AppState.quiz.hasStarted = false;
    AppState.quiz.answered = false;
    AppState.quiz.currentTargetNote = null;
    AppState.quiz.fromReset = false;
    AppState.quiz.hasAnsweredCurrent = false;
    
    function initCustomSampling() {
        const customBtn = document.getElementById('customBtn');
        const resetBtn = document.getElementById('resetBtn');
        const fileIn = document.getElementById('fileIn');
        
        if (!customBtn || !resetBtn || !fileIn) {
            console.warn('自定义采样元素未找到');
            return;
        }
        
        // 自定义采样按钮
        customBtn.addEventListener('click', () => {
            fileIn.click();
        });
        
        // 文件选择处理
        fileIn.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                await SAMPLE.load(e.target.files);
            }
        });
        
        // 重置按钮
        resetBtn.addEventListener('click', async () => {
            await SAMPLE.reset();
        });
        
        // 显示自定义采样区域
        const customSection = document.getElementById('customSamplingSection');
        if (customSection) {
            customSection.style.display = 'block';
        }
    }
    
    // 设置初始基准音模式
    const initialBaseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
    AppState.quiz.questionBaseMode = initialBaseMode;
    
    // 设置初始调性
    const initialKey = document.getElementById('keySelect')?.value || 'C';
    AppState.quiz.currentKey = initialKey;
    
    // 设置初始难度
    const initialDifficulty = document.getElementById('difficultySelect')?.value || 'basic';
    AppState.quiz.currentDifficulty = initialDifficulty;
    
    // 重置自动下一题设置
    AppState.quiz.autoNextTimer = null;
    const autoNextCheckbox = document.getElementById('autoNextCheckbox');
    if (autoNextCheckbox) autoNextCheckbox.checked = false;
    
    const updatePitchDisplayFunc = AppGlobal.getTool('updateCurrentPitchDisplay');
    updatePitchDisplayFunc?.();
    
    window.dispatchEvent(new CustomEvent('initial-state'));
    
    function reinitializeAnswerAreaForDifficulty() {        
        // 1. 重新初始化答题按钮
        const initAnswerAreaFunc = AppGlobal.getTool('initAnswerArea');
        initAnswerAreaFunc?.();
        
        // 2. 重新调整缩放
        setTimeout(() => {
            const adjustScaleFunc = AppGlobal.getTool('adjustAnswerAreaScale');
            adjustScaleFunc?.();
        }, 100);
    }

    // 然后在难度选择事件中使用：
    const difficultySelect = document.getElementById('difficultySelect');
    if (difficultySelect) {
        let previousDifficulty = difficultySelect.value;
        
        difficultySelect.addEventListener('change', function() {
            const selectedDifficulty = this.value;

            // 使用预选模式处理
        if (AppState.quiz.locked || (AppState.quiz.hasStarted && !AppState.quiz.answered)) {
            AppState.quiz.pendingDifficultyChange = selectedDifficulty;
            const difficultyText = selectedDifficulty === 'basic' ? '仅基本音级' : '含变化音级';
            showKeyChangeToast(`已选择${difficultyText}，将在下一题生效`);
            return;
        }
        
        // 已答题完成时也使用预选模式
        if (AppState.quiz.answered) {
            AppState.quiz.pendingDifficultyChange = selectedDifficulty;
            const difficultyText = selectedDifficulty === 'basic' ? '仅基本音级' : '含变化音级';
            showKeyChangeToast(`已选择${difficultyText}，将在下一题生效`);
            return;
        }
            
            previousDifficulty = selectedDifficulty;
            
            // 只有在未开始答题或已答题完成时，才立即切换答题区
            if (!AppState.quiz.hasStarted || AppState.quiz.answered) {
                reinitializeAnswerAreaForDifficulty();
                showKeyChangeToast(`已切换到${selectedDifficulty === 'basic' ? '仅基本音级' : '含变化音级'}`);
            }
        });
    }
    
    // 答题区初始化函数
    function initializeScalingAndAnswerArea() {
        // 1. 初始化答题区
        const initAnswerAreaFunc = AppGlobal.getTool('initAnswerArea');
        initAnswerAreaFunc?.();
        
        // 2. 初始化缩放系统
        const initScalingSystemFunc = AppGlobal.getTool('initScalingSystem');
        initScalingSystemFunc?.();
        
        // 3. 设置初始缩放
        setTimeout(() => {
            const adjustScaleFunc = AppGlobal.getTool('adjustAnswerAreaScale');
            adjustScaleFunc?.();
        }, 300);
    }
    
    // 等待DOM完全就绪后再初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                initializeScalingAndAnswerArea();
            }, 100);
        });
    } else {
        setTimeout(() => {
            initializeScalingAndAnswerArea();
        }, 100);
    }

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
    
    const updateAllMessageDisplaysFunc = AppGlobal.getTool('updateAllMessageDisplays');
    updateAllMessageDisplaysFunc?.('点击开始练习');
    
    if (AppState.dom.msgDisplay) {
        AppState.dom.msgDisplay.style.display = 'block';
    }
    
    updatePitchDisplayFunc?.(null, null);

    /* -------------- 主按钮点击事件 -------------- */
AppState.dom.mainBtn.onclick = async () => {
    if (AppState.quiz.locked) return;
    AppState.quiz.locked = true;
    
    // 统一使用工具箱
    const updateResetButtonStateFunc = AppGlobal.getTool('updateResetButtonState');
    const stopPlaybackFunc = AppGlobal.getTool('stopPlayback');
    const playQuizSequenceFunc = AppGlobal.getTool('playQuizSequence');
    const updateBigButtonStateFunc = AppGlobal.getTool('updateBigButtonState');
    
    if (!playQuizSequenceFunc) {
        console.error('必要的工具函数未找到');
        AppState.quiz.locked = false;
        return;
    }
    
    updateResetButtonStateFunc?.();
    stopPlaybackFunc?.();
    
    try {
        AppState.quiz.answered = false;
        AppState.audio.shouldStop = false;
        
        const mainBtn = AppGlobal.getTool('getStartButton')?.();
        const buttonText = mainBtn?.textContent || '';
        
        if (buttonText.includes('下一题') || buttonText === UI_TEXT.NEXT) {
            AppState.quiz.canReset = true;
            updateResetButtonStateFunc?.();
            
            // 新题目前重置音高显示
            const updatePitchFunc = AppGlobal.getTool('updateCurrentPitchDisplay');
            updatePitchFunc?.('--', null);
            
            await playQuizSequenceFunc(false);
        } else if ((buttonText.includes('再听一遍') || buttonText === UI_TEXT.REPLAY) && 
                   AppState.quiz.hasStarted) {
            // 重播前重置音高显示
            const updatePitchFunc = AppGlobal.getTool('updateCurrentPitchDisplay');
            updatePitchFunc?.('--', null);
            
            await playQuizSequenceFunc(true);
        } else {
            AppState.quiz.canReset = true;
            updateResetButtonStateFunc?.();
            
            // 首次播放前重置音高显示
            const updatePitchFunc = AppGlobal.getTool('updateCurrentPitchDisplay');
            updatePitchFunc?.('--', null);
            
            await playQuizSequenceFunc(false);
        }
    } catch (error) {
        console.error('播放失败:', error);
        AppState.quiz.locked = false;
        updateResetButtonStateFunc?.();
    } finally {
        AppState.quiz.locked = false;
        updateResetButtonStateFunc?.();
        updateBigButtonStateFunc?.();
    }
};

    /* =====  底部状态栏 + 智能缩放  ===== */
    // 1. 仅桌面端初始化状态栏
    if (window.innerWidth >= 769) {
        const initStatusBarFunc = AppGlobal.getTool('initStatusBar');
        initStatusBarFunc?.();
        
        const refreshMinHeightFunc = AppGlobal.getTool('refreshMinHeight');
        refreshMinHeightFunc?.();
        
        const adjustAnswerAreaScaleFunc = AppGlobal.getTool('adjustAnswerAreaScale');
        adjustAnswerAreaScaleFunc?.();
        
        // 2. 窗口变化时自动重新计算
        window.addEventListener('resize', () => {
            refreshMinHeightFunc?.();
            adjustAnswerAreaScaleFunc?.();
        });
    }

    /* -------------- 移动端面板初始化 -------------- */
    try {
        const { initMobilePanels } = await import('../ui/mobile-panels.js');
        initMobilePanels();
    } catch (error) {
        console.error('❌ 移动端面板初始化失败:', error);
    }
     
/* -------------- 右侧面板初始化 -------------- */
// 初始化右侧面板统计
const initRightPanelTool = AppGlobal.getTool('initRightPanel');
if (initRightPanelTool) {
    initRightPanelTool();
} else {
    console.warn('⚠️ 右侧面板初始化工具未找到');
}

// 确保音高可视化器已初始化
const initPitchVisualizerTool = AppGlobal.getTool('initPitchVisualizer');
if (initPitchVisualizerTool) {
    initPitchVisualizerTool();
}

// 如果是移动端，初始化移动端面板并同步数据
if (window.innerWidth <= 768) {
    try {
        const { initMobilePanels } = await import('../ui/mobile-panels.js');
        const mobilePanelManager = await initMobilePanels();
        
        // 延迟同步统计数据，确保 DOM 完全渲染
        setTimeout(() => {
            if (mobilePanelManager) {
                mobilePanelManager.copyDesktopStatsToMobile();
                console.log('✅ 移动端面板统计初始化完成');
            }
        }, 300);
    } catch (error) {
        console.error('❌ 移动端面板初始化失败:', error);
    }
}
    
    /* -------------- 其他 UI 初始化 -------------- */
    const initUkuleleKeySelectorFunc = AppGlobal.getTool('initUkuleleKeySelector');
    initUkuleleKeySelectorFunc?.();
    
    const initBaseModeButtonsFunc = AppGlobal.getTool('initBaseModeButtons');
    initBaseModeButtonsFunc?.();
    
    initKeyChangeListener();
    initDifficultyChangeListener();
    
    const initAllButtonsFunc = AppGlobal.getTool('initAllButtons');
    initAllButtonsFunc?.();
    
    const updateBigButtonStateFunc = AppGlobal.getTool('updateBigButtonState');
    updateBigButtonStateFunc?.();
    
    const initMobileSidebarFunc = AppGlobal.getTool('initMobileSidebar');
    initMobileSidebarFunc?.();
    
    const initAllPanelFeaturesFunc = AppGlobal.getTool('initAllPanelFeatures');
    initAllPanelFeaturesFunc?.();
    
    const initInfoDisplaySliderFunc = AppGlobal.getTool('initInfoDisplaySlider');
    initInfoDisplaySliderFunc?.();
    
    initCustomSampling();
    
    /* -------------- 历史记录系统初始化 -------------- */

const initHistorySystemTool = AppGlobal.getTool('initHistorySystem');
if (initHistorySystemTool) {
    initHistorySystemTool();
    
    // 初始同步一次显示
    setTimeout(() => {
        const updateAllHistoryDisplays = AppGlobal.getTool('updateAllHistoryDisplays');
        updateAllHistoryDisplays?.();
    }, 500);
} else {
    console.warn('⚠️ 历史记录系统工具未找到');
}

    console.log('✅ 标准模式初始化完成');
}

// 确保全局可访问
window.bootStandardMode = bootStandardMode;

// 主启动函数
export async function boot() {
    console.log('🎵 应用启动中...');
    
    // 第一步：初始化工具箱（懒加载方式）
    const toolboxReady = await ToolManager.initialize();
    if (!toolboxReady) {
        console.warn('⚠️ 工具箱初始化有问题，但继续启动流程...');
    }

    // 第二步：初始化音频系统
    console.log('🔊 初始化音频系统...');
    initAudioContextResume();
    initSampler();
    initSFXSampler();
    console.log('✅ 音频系统初始化完成');

    // 第三步：加载统计数据
    if (statsManager && typeof statsManager.loadStats === 'function') {
        statsManager.loadStats();
    }

    // 第四步：初始化开始屏幕管理器
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

    // 第五步：检查核心配置
    if (!notes || !ranges || !KEY_SCALES) {
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