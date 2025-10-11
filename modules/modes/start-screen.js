// modules/modes/start-screen.js
import { AppState } from '../core/state.js';
import statsManager from '../quiz/stats-manager.js';
import { StandardMode } from './standard-mode.js';
import { ChallengeMode } from './challenge-mode.js';
import { FocusedTraining } from './focused-training.js';

export class StartScreenManager {
    constructor() {
        this.standardMode = new StandardMode();
        this.challengeMode = new ChallengeMode();
        this.focusedTraining = new FocusedTraining();
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadQuickStats();
        
        // 初始化模式状态
        AppState.mode = {
            current: 'start',
            previous: null,
            sessionStart: null
        };
    }

    bindEvents() {
        // 模式选择按钮事件
        document.querySelectorAll('.select-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modeCard = e.target.closest('.mode-card');
                const mode = modeCard.dataset.mode;
                this.enterMode(mode);
            });
        });

        // ESC键返回开始屏幕
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && AppState.mode.current !== 'start') {
                this.returnToStartScreen();
            }
        });

        // 返回按钮点击事件
        const returnBtn = document.getElementById('returnToStart');
        if (returnBtn) {
            returnBtn.addEventListener('click', () => {
                this.returnToStartScreen();
            });
        }

        // 点击标题返回开始屏幕
        const appTitle = document.querySelector('.app-title');
        if (appTitle) {
            appTitle.addEventListener('click', () => {
                if (AppState.mode.current !== 'start') {
                    this.returnToStartScreen();
                }
            });
        }
    }

    // 管理标题栏模式标识
    updateHeaderIndicator(mode) {     
        // 先清理所有可能的标识
        this.clearAllHeaderIndicators();
        
        // 根据模式添加新标识
        switch(mode) {
            case 'standard':
                this.addStandardIndicator();
                break;
            case 'challenge':
                this.addChallengeIndicator();
                break;
            case 'focused':
                this.addTrainingIndicator();
                break;
            case 'start':
                // 开始屏幕不需要标识
                this.clearAllHeaderIndicators();
                break;
        }
    }

    // 清理所有标题栏标识
    clearAllHeaderIndicators() {
        const indicators = [
            '.challenge-indicator',
            '.training-indicator', 
            '.standard-indicator'
        ];
        
        indicators.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.remove();
            }
        });
    }

    // 添加标准模式标识
    addStandardIndicator() {
        const header = document.querySelector('.daw-header');
        if (header && !document.querySelector('.standard-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'standard-indicator';
            indicator.innerHTML = '🎹 标准模式';
            indicator.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #667eea, #764ba2);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
            `;
            header.style.position = 'relative';
            header.appendChild(indicator);
        }
    }

    // 添加挑战模式标识
    addChallengeIndicator() {
        const header = document.querySelector('.daw-header');
        if (header && !document.querySelector('.challenge-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'challenge-indicator';
            indicator.innerHTML = '⚡ 挑战模式 - 开发中';
            indicator.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #FF6B6B, #FFA726);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
            `;
            header.style.position = 'relative';
            header.appendChild(indicator);
        }
    }

    // 添加专项训练标识
    addTrainingIndicator() {
        const header = document.querySelector('.daw-header');
        if (header && !document.querySelector('.training-indicator')) {
            const indicator = document.createElement('div');
            indicator.className = 'training-indicator';
            indicator.innerHTML = '🎯 专项训练 - 开发中';
            indicator.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: linear-gradient(135deg, #8B5CF6, #06B6D4);
                color: white;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: bold;
            `;
            header.style.position = 'relative';
            header.appendChild(indicator);
        }
    }

    // 显示/隐藏返回按钮
    toggleReturnButton(show) {
        const returnBtn = document.getElementById('returnToStart');
        if (returnBtn) {
            returnBtn.style.display = show ? 'flex' : 'none';
        }
    }

    enterMode(mode) {
        console.log(`🎮 进入模式: ${mode}`);
        
        // 更新状态
        AppState.mode.previous = AppState.mode.current;
        AppState.mode.current = mode;
        AppState.mode.sessionStart = new Date();

        // 更新标题栏标识
        this.updateHeaderIndicator(mode);

        // 隐藏开始屏幕
        this.hideStartScreen();
        
        // 显示返回按钮
        this.toggleReturnButton(mode !== 'start');

        // 初始化对应模式
        switch(mode) {
            case 'standard':
                this.standardMode.init();
                break;
            case 'challenge':
                this.challengeMode.init();
                break;
            case 'focused':
                this.focusedTraining.init();
                break;
            default:
                console.warn(`未知模式: ${mode}`);
                this.returnToStartScreen();
        }
    }

    hideStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.classList.remove('active');
            setTimeout(() => {
                startScreen.style.display = 'none';
            }, 300);
        }
    }

    showStartScreen() {
        const startScreen = document.getElementById('startScreen');
        if (startScreen) {
            startScreen.style.display = 'flex';
            setTimeout(() => {
                startScreen.classList.add('active');
            }, 10);
            this.loadQuickStats();
        }
    }

    returnToStartScreen() {
        
        // 添加确认对话框
        if (AppState.audio.isPlaying || (AppState.quiz.hasStarted && !AppState.quiz.answered)) {
            if (!confirm('确定要返回开始屏幕吗？当前题目播放将会中断。')) {
                return;
            }
        }
        
        // 停止当前模式
        this.stopCurrentMode();
        
        // 清理标题栏标识
        this.clearAllHeaderIndicators();
        
        // 隐藏主界面，显示开始屏幕
        this.hideMainInterface();
        this.showStartScreen();
        
        // 隐藏返回按钮
        this.toggleReturnButton(false);
        
        // 更新状态
        AppState.mode.previous = AppState.mode.current;
        AppState.mode.current = 'start';
        
        console.log('✅ 已返回开始屏幕');
    }

    stopCurrentMode() {
        
        // 停止音频播放
        this.forceStopAllAudio();
        
        // 清除定时器
        if (AppState.quiz.autoNextTimer) {
            clearTimeout(AppState.quiz.autoNextTimer);
            AppState.quiz.autoNextTimer = null;
        }
        
        // 重置状态
        AppState.quiz.locked = false;
        AppState.audio.isPlaying = false;
        AppState.audio.shouldStop = true;
        
        // 重置UI状态
        if (window.updateBigButtonState) {
            window.updateBigButtonState();
        }
        if (window.updateResetButtonState) {
            window.updateResetButtonState();
        }
    }

    forceStopAllAudio() {
        
        // 使用全局的停止函数
        if (window.stopPlayback && typeof window.stopPlayback === 'function') {
            window.stopPlayback();
        }
        
        // 直接停止 Tone.js
        if (window.Tone) {
            try {
                if (Tone.Transport) {
                    Tone.Transport.stop();
                    Tone.Transport.cancel();
                }
            } catch (e) {
                console.log('Tone.js 停止完成');
            }
        }
        
        // 停止采样器
        if (AppState.audio.sampler) {
            try {
                AppState.audio.sampler.releaseAll();
            } catch (e) {
                // 忽略错误
            }
        }
        
        // 强制重置状态
        AppState.audio.isPlaying = false;
        AppState.audio.shouldStop = true;
        AppState.quiz.locked = false;
    }

    hideMainInterface() {
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
    }

    showMainInterface() {
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
                element.style.display = '';
            }
        });
    }

    loadQuickStats() {
        try {
            if (statsManager && typeof statsManager.getQuickStats === 'function') {
                const stats = statsManager.getQuickStats();
                
                // 更新开始屏幕的统计显示
                if (document.getElementById('totalSessions')) {
                    document.getElementById('totalSessions').textContent = stats.totalSessions || '0';
                }
                if (document.getElementById('currentStreak-num')) {
                    document.getElementById('currentStreak-num').textContent = stats.currentStreak || '0';
                }
                if (document.getElementById('bestAccuracy')) {
                    document.getElementById('bestAccuracy').textContent = stats.bestAccuracy || '0%';
                }
            }
        } catch (error) {
            console.warn('快速统计加载失败');
            // 设置默认值
            document.getElementById('totalSessions').textContent = '0';
            document.getElementById('currentStreak-num').textContent = '0';
            document.getElementById('bestAccuracy').textContent = '0%';
        }
    }
}