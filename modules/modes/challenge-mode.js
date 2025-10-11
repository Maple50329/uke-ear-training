import { AppState } from '../core/state.js';

export class ChallengeMode {
    constructor() {
        this.isInitialized = false;
    }

    init() {
        console.log('⚡ 初始化挑战模式');

        // 暂时先显示标准界面作为回退
        this.showStandardInterfaceAsFallback();
        
        // 显示挑战模式提示
        this.showChallengeNotification();
        
        // 确保音频状态正确重置
        AppState.audio.shouldStop = false;
        AppState.audio.isPlaying = false;
        AppState.quiz.locked = false;
    }

    showStandardInterfaceAsFallback() {
        // 暂时使用标准界面
        const startScreenManager = window.startScreenManager;
        if (startScreenManager && startScreenManager.showMainInterface) {
            startScreenManager.showMainInterface();
        }
    }

    showChallengeNotification() {
        if (window.showKeyChangeToast) {
            window.showKeyChangeToast('🎯 挑战模式即将推出！目前使用标准模式');
        }
    }

    cleanup() {
        console.log('🧹 清理挑战模式');
    }
}