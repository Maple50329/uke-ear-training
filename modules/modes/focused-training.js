import { AppState } from '../core/state.js';

export class FocusedTraining {
    constructor() {
        this.isInitialized = false;
    }

    init() {
        console.log('🎯 初始化专项训练模式');
        
        // 暂时先显示标准界面
        this.showStandardInterfaceAsFallback();
        
        // 显示专项训练提示
        this.showTrainingNotification();

        // 确保音频状态正确重置
        AppState.audio.shouldStop = false;
        AppState.audio.isPlaying = false;
        AppState.quiz.locked = false;
    }

    showStandardInterfaceAsFallback() {
        const startScreenManager = window.startScreenManager;
        if (startScreenManager && startScreenManager.showMainInterface) {
            startScreenManager.showMainInterface();
        }
    }

    showTrainingNotification() {
        if (window.showKeyChangeToast) {
            window.showKeyChangeToast('🎯 专项训练模式即将推出！目前使用标准模式');
        }
    }

    cleanup() {
        console.log('🧹 清理专项训练模式');
    }
}