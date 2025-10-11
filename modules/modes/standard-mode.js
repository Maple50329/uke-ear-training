// modules/modes/standard-mode.js
import { AppState } from '../core/state.js';

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
        
        console.log('✅ 标准模式初始化完成');
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
        // 已完成的题目：直接进入下一题状态，不弹窗
        console.log('✅ 题目已完成，直接进入下一题状态');
        this.setToNextQuestionState();
    } else {
        // 没有题目，直接重置到初始状态
        this.resetToInitialState();
    }
}

setToNextQuestionState() {
    console.log('➡️ 设置到下一题状态');
    
    // 保持完成状态，但重置一些标志
    AppState.quiz.hasStarted = false; // 设置为未开始，这样点击"下一题"会开始新题目
    AppState.quiz.hasAnsweredCurrent = false;
    
    // 设置UI状态
    if (AppState.dom.mainBtn) {
        AppState.dom.mainBtn.textContent = '下一题';
        AppState.dom.mainBtn.disabled = false;
    }
    
    if (AppState.dom.msgDisplay) {
        AppState.dom.msgDisplay.textContent = '回答完成！点击"下一题"继续';
    }
    
    // 锁定答题按钮
    this.lockAnswerButtons();
    
    // 更新按钮状态
    if (window.updateBigButtonState) window.updateBigButtonState();
    if (window.updateResetButtonState) window.updateResetButtonState();
    
    // 显示提示信息
    this.showToast('已回到标准模式，可点击"下一题"继续练习', 'info');
}

showContinueDialog(questionState) {
    // 现在只有未完成的题目会调用这个方法
    const message = '检测到有未完成的题目，是否继续作答？\n\n选择"是"将重新播放题目\n选择"否"将开始新的练习';
    
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

showNativeContinueDialog(config) {
    setTimeout(() => {
        const userChoice = confirm(config.message);
        
        if (userChoice) {
            this.handleContinueChoice(config.questionState);
        } else {
            this.handleRestartChoice();
        }
    }, 300);
}

    useCustomDialog() {
        // 检查是否有自定义对话框组件
        return false; // 暂时使用原生 confirm
    }

handleContinueChoice(questionState) {
    console.log('✅ 用户选择继续');
    
    if (questionState === 'unfinished') {
        // 未完成的题目：重新播放
        this.replayCurrentQuestion();
        this.showToast('重新播放题目中...', 'success');
    }
    // 注意：已完成的题目不会进入这个分支，因为不会弹窗
}

handleRestartChoice() {
    console.log('🔄 用户选择重新开始');
    
    // 完全重置到初始状态
    this.resetToInitialState();
    
    // 显示重新开始提示
    this.showToast('已开始新的练习', 'info');
}
    // === 重置到初始状态 ===
    resetToInitialState() {
        
        // 1. 停止所有音频
        this.stopAllAudio();
        
        // 2. 重置所有状态
        this.resetAllStates();
        
        // 3. 重置UI到初始状态
        this.resetUIToInitial();
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
        
        // 重置音频状态
        AppState.audio.isPlaying = false;
        AppState.audio.shouldStop = false;
    }

resetUIToInitial() {
    
    // 重置主按钮
    if (AppState.dom.mainBtn) {
        AppState.dom.mainBtn.textContent = '开始训练';
        AppState.dom.mainBtn.disabled = false;
    }
    
    // 重置消息显示
    if (AppState.dom.msgDisplay) {
        AppState.dom.msgDisplay.textContent = '点击开始训练';
    }
    
    // 重置答题按钮 - 重要：要锁定！
    this.lockAnswerButtons();
    
    // 重置音高显示
    this.resetPitchDisplay();
    
    // 更新按钮状态
    if (window.updateBigButtonState) window.updateBigButtonState();
    if (window.updateResetButtonState) window.updateResetButtonState();
}

lockAnswerButtons() {
    if (AppState.dom.ansArea) {
        const buttons = AppState.dom.ansArea.querySelectorAll('.key-btn');
        buttons.forEach(btn => {
            btn.classList.remove('hit', 'miss');
            btn.classList.add('disabled');
            btn.disabled = true;
        });
        
        // 确保答题区有禁用样式
        AppState.dom.ansArea.classList.add('disabled');
    }
}
    // === 重新播放当前题目 ===
replayCurrentQuestion() {
    console.log('🔊 重新播放当前题目');
    
    // 确保状态正确
    AppState.quiz.answered = false;
    AppState.quiz.hasAnsweredCurrent = false;
    AppState.quiz.attemptCount = 0;
    
    // 重置答题按钮样式但保持锁定（等待播放）
    this.resetAnswerButtons();
    this.lockAnswerButtons(); // 播放前先锁定
    
    // 重新播放题目
    if (AppState.dom.mainBtn && window.playQuizSequence) {
        setTimeout(() => {
            window.playQuizSequence(true); // true 表示重新播放
        }, 500);
    }
}

    // === 开始下一题 ===
startNextQuestion() {
    console.log('➡️ 开始下一题');
    
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

    // === 辅助方法 ===
resetAnswerButtons() {
    if (AppState.dom.ansArea) {
        const buttons = AppState.dom.ansArea.querySelectorAll('.key-btn');
        buttons.forEach(btn => {
            btn.classList.remove('hit', 'miss');
            // 注意：这里不移除 disabled 状态，保持锁定
        });
    }
}

    resetPitchDisplay() {
        const currentPitch = document.getElementById('currentPitch');
        const currentFrequency = document.getElementById('currentFrequency');
        const currentDegree = document.getElementById('currentDegree');
        
        if (currentPitch) currentPitch.textContent = '';
        if (currentFrequency) currentFrequency.textContent = '';
        if (currentDegree) currentDegree.textContent = '';
        
        // 重置音程信息
        const intervalName = document.getElementById('intervalName');
        const intervalDetail = document.getElementById('intervalDetail');
        if (intervalName) intervalName.textContent = '--';
        if (intervalDetail) intervalDetail.textContent = '--';
    }

    stopAllAudio() {
        if (window.stopPlayback && typeof window.stopPlayback === 'function') {
            window.stopPlayback();
        }
        AppState.audio.isPlaying = false;
        AppState.audio.shouldStop = true;
    }

    showToast(message, type = 'info') {
        if (window.showKeyChangeToast) {
            window.showKeyChangeToast(message);
        } else {
            console.log(`📢 ${message}`);
        }
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
        if (window.initAllButtons) window.initAllButtons();
        if (window.initScalingSystem) window.initScalingSystem();
        if (window.updateBigButtonState) window.updateBigButtonState();
    }

    cleanup() {
        console.log('🧹 清理标准模式');
    }
}