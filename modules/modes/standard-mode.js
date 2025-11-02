import { AppState } from '../core/state.js';
import AppGlobal from '../core/app.js';

export class StandardMode {
    constructor() {
        this.isInitialized = false;
    }

    init() {
        // 确保音频状态正确重置
        AppState.audio.shouldStop = false;
        AppState.audio.isPlaying = false;
        AppState.quiz.locked = false;
        
        // 显示主界面
        this.showMainInterface();
        
        // 检查是否有未完成的题目，显示确认对话框
        this.checkAndShowContinueDialog();
        
        // 确保返回按钮显示
        if (window.startScreenManager && window.startScreenManager.toggleReturnButton) {
            window.startScreenManager.toggleReturnButton(true);
        }
        
        // 如果尚未初始化，运行现有启动逻辑
        if (!this.isInitialized) {
            this.initializeStandardFeatures();
            this.isInitialized = true;
        }
    }

    // === 核心：检查并显示继续对话框 ===
    checkAndShowContinueDialog() {
        // 检查是否有未完成的题目
        const hasUnfinishedQuestion = AppState.quiz.hasStarted && !AppState.quiz.answered;
        const hasCompletedQuestion = AppState.quiz.answered;
        
        // 在显示对话框前先锁定答题区（防止误操作）
        this.lockAnswerButtons();
        
        if (hasUnfinishedQuestion) {
            // 只有未完成的题目才显示确认对话框
            this.showContinueDialog('unfinished');
        } else if (hasCompletedQuestion) {
            // 直接进入下一题状态
            this.setToNextQuestionState();
        } else {
            // 没有题目，直接重置到初始状态
            this.resetToInitialState();
        }
    }

    setToNextQuestionState() {
        // 保持完成状态，但重置一些标志
        AppState.quiz.hasStarted = false; // 设置为未开始，这样点击"下一题"会开始新题目
        AppState.quiz.hasAnsweredCurrent = false;
        
        // 设置UI状态
        if (AppState.dom.mainBtn) {
            AppState.dom.mainBtn.textContent = '下一题';
            AppState.dom.mainBtn.disabled = false;
        }
        
        this.updateAllMessageDisplays('回答完成！点击"下一题"继续');
        
        // 锁定答题按钮
        this.lockAnswerButtons();
        
        // 更新按钮状态
        this.safeCallTool('updateBigButtonState');
        this.safeCallTool('updateResetButtonState');
        
        // 显示提示信息
        this.showToast('已回到标准模式，可点击"下一题"继续练习', 'info');
    }

    showContinueDialog(questionState) {
        // 现在只有未完成的题目会调用这个方法
        const message = '检测到有未完成的题目，是否继续作答？\n\n选择"确定"将重新播放当前题目\n选择"取消"将复位开始新的练习';
        
        setTimeout(() => {
            const userChoice = confirm(message);
            
            if (userChoice) {
                // 用户选择"是" - 重新播放未完成题目
                this.replayCurrentQuestion();
                this.showToast('重新播放题目中...', 'success');
            } else {
                // 用户选择"否" - 重新开始
                this.handleRestartChoice();
            }
        }, 300);
    }

    handleRestartChoice() {
        console.log('🔄 用户选择重新开始 - 执行完整复位');
        this.safeCallTool('handleResetQuestion');
    }

    // === 重置到初始状态 ===
    resetToInitialState() {
        // 1. 停止所有音频
        this.stopAllAudio();
        
        // 2. 重置所有状态
        this.resetAllStates();
        
        // 3. 重置UI显示
        this.resetAllDisplays();
    }

    resetAllStates() {
        // 重置答题状态
        AppState.quiz.hasStarted = false;
        AppState.quiz.answered = false;
        AppState.quiz.locked = false;
        AppState.quiz.canReset = false;
        AppState.quiz.hasAnsweredCurrent = false;
        AppState.quiz.attemptCount = 0;
        AppState.quiz.currentNoteIdx = -1;
        AppState.quiz.currentTargetNote = null;
        AppState.quiz.recentTargetNotes = [];
        AppState.audio.isPlaying = false;
        AppState.audio.shouldStop = false;
    }

    lockAnswerButtons() {
        // 只有在答题区已初始化且有按钮时才禁用
        if (AppState.dom.ansArea && AppState.dom.ansArea.querySelectorAll('.key-btn').length > 0) {
            this.safeCallTool('disableAnswerButtons');
        }
        // 否则静默跳过，等待按钮渲染
    }

    // === 重新播放当前题目 ===
    async replayCurrentQuestion() {
        console.log('🔊 重新播放当前题目');
        
        // 确保状态正确
        AppState.quiz.answered = false;
        AppState.quiz.hasAnsweredCurrent = false;
        AppState.quiz.attemptCount = 0;
        
        // 重置答题按钮样式但保持锁定（等待播放）
        this.resetAnswerButtons();
        this.lockAnswerButtons();
        
        // 重播前重置音高显示
        this.safeCallTool('updateCurrentPitchDisplay', '--', null);
        
        // 重新播放题目
        await this.safeCallTool('playQuizSequence', true);
    }

    // === 开始下一题 ===
    startNextQuestion() {
        // 重置当前题目状态，准备下一题
        AppState.quiz.hasStarted = false;
        AppState.quiz.answered = false;
        AppState.quiz.hasAnsweredCurrent = false;
        
        // 锁定答题按钮（等待新题目播放）
        this.lockAnswerButtons();
        
        // 点击下一题按钮
        if (AppState.dom.mainBtn && AppState.dom.mainBtn.textContent === '下一题') {
            setTimeout(() => {
                AppState.dom.mainBtn.click();
            }, 500);
        } else if (AppState.dom.mainBtn) {
            // 如果按钮不是"下一题"，手动触发新题目
            AppState.dom.mainBtn.textContent = '开始训练';
            this.lockAnswerButtons(); // 确保锁定
        }
    }

    // === 统一工具箱调用方法 ===
    safeCallTool(toolName, ...args) {
        try {
            const tool = AppGlobal.getTool(toolName);
            if (tool && typeof tool === 'function') {
                return tool(...args);
            } else {
                console.warn(`⚠️ 工具未找到或不可用: ${toolName}`);
                return null;
            }
        } catch (error) {
            console.error(`❌ 调用工具失败: ${toolName}`, error);
            return null;
        }
    }

    // === 简化的辅助方法 ===
    resetAnswerButtons() {
        // 只有在答题区已初始化且有按钮时才重置
        if (AppState.dom.ansArea) {
            const buttons = AppState.dom.ansArea.querySelectorAll('.key-btn');
            if (buttons.length > 0) {
                buttons.forEach(btn => {
                    btn.classList.remove('hit', 'miss');
                });
            }
        }
    }

    resetPitchDisplay() {
        this.safeCallTool('updateCurrentPitchDisplay', '--', null);
    }

    stopAllAudio() {
        this.safeCallTool('stopPlayback');
        AppState.audio.isPlaying = false;
        AppState.audio.shouldStop = true;
    }

    showToast(message, type = 'info') {
        // 如果有全局的toast工具，可以在这里调用
        console.log(`📢 ${message}`);
    }

    resetAllDisplays() {
        // 重置所有UI显示
        this.resetPitchDisplay();
        this.safeCallTool('resetAnswerInfo');
        this.updateAllMessageDisplays('点击开始练习');
        this.safeCallTool('hideInfoCards');
    }

    // === 原有的基础方法 ===
    showMainInterface() {
        const startScreenManager = window.startScreenManager;
        if (startScreenManager && startScreenManager.showMainInterface) {
            startScreenManager.showMainInterface();
        } else {
            document.querySelector('.layout-grid-container').style.display = 'grid';
            document.querySelector('.daw-header').style.display = 'flex';
            document.querySelector('.left-panel').style.display = 'block';
            document.querySelector('.main-content').style.display = 'block';
            document.querySelector('.right-panel').style.display = 'block';
        }
    }

    initializeStandardFeatures() {
        if (window.bootStandardMode && typeof window.bootStandardMode === 'function') {
            window.bootStandardMode();
        } else {
            this.initCriticalFeatures();
        }
    }

    initCriticalFeatures() {
        // 使用工具箱初始化关键功能
        this.safeCallTool('initAllButtons');
        this.safeCallTool('initScalingSystem');
        this.safeCallTool('updateBigButtonState');
        this.safeCallTool('initAllPanelFeatures');
    }

    cleanup() {
        console.log('🧹 清理标准模式');
    }

    // === 统一的消息显示方法 ===
    updateAllMessageDisplays(message) {
        this.safeCallTool('updateAllMessageDisplays', message);
    }

    // 重置浮动面板到欢迎页面
    resetFloatingPanel() {
        const simplePanel = document.getElementById('simplePanel');
        if (!simplePanel) return;
        
        try {
            // 重置到第一页（音高页面）
            const swipePages = simplePanel.querySelectorAll('.swipe-page');
            const pageIndicators = simplePanel.querySelectorAll('.indicator-dot');
            
            // 隐藏所有页面，显示第一页
            swipePages.forEach((page, index) => {
                page.classList.remove('active');
                if (index === 0) {
                    page.classList.add('active');
                }
                
                // 显示欢迎覆盖层
                const welcomeOverlay = page.querySelector('.welcome-overlay');
                if (welcomeOverlay) {
                    welcomeOverlay.classList.add('active');
                }
                
                // 隐藏内容区域
                const contentArea = page.querySelector('.pitch-content, .interval-content, .ukulele-content');
                if (contentArea) {
                    contentArea.style.display = 'none';
                }
            });
            
            // 更新页面指示器
            pageIndicators.forEach((dot, index) => {
                dot.classList.toggle('active', index === 0);
            });
            
            console.log('🔄 浮动面板已重置到欢迎页面');
        } catch (error) {
            console.error('复位浮动面板时出错:', error);
        }
    }
}