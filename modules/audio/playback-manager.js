import { AppState } from '../core/state.js';
import { customSampler } from './custom-sampler.js';
import { updateMasterVolume } from './volume.js';

export class PlaybackManager {
    constructor() {
        this.useCustomSampler = false;
        this.initialized = false;
    }

    /**
     * 初始化播放管理器
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // 初始化自定义采样系统
            await customSampler.init();
            
            this.initialized = true;
            console.log('✅ 播放管理器初始化完成');
        } catch (error) {
            console.error('❌ 播放管理器初始化失败:', error);
        }
    }

    /**
     * 设置是否使用自定义采样
     */
    setUseCustomSampler(useCustom) {
        this.useCustomSampler = useCustom && customSampler.getLoadedCount() > 0;
    }

    /**
     * 统一播放接口
     */
    async playNote(noteName, duration = 1.5) {
        if (!noteName) {
            console.warn('⚠️ 音符名称为空');
            return;
        }

        // 确保初始化
        if (!this.initialized) {
            await this.init();
        }

        // 更新主音量
        updateMasterVolume();

        // 优先尝试自定义采样
        if (this.useCustomSampler && customSampler.hasNote(noteName)) {
            const success = await customSampler.play(noteName, duration);
            if (success) {
                return;
            }
        }

        // 回退到 Tone.js Sampler
        await this.playWithToneSampler(noteName, duration);
    }

    /**
     * 使用 Tone.js Sampler 播放
     */
    async playWithToneSampler(noteName, duration) {
        if (!AppState.audio.samplerReady || !AppState.audio.sampler) {
            console.warn('⚠️ Tone.js Sampler 未就绪');
            return;
        }

        return new Promise((resolve) => {
            try {
                AppState.audio.sampler.triggerAttackRelease(noteName, duration);
                setTimeout(resolve, duration * 1000);
            } catch (error) {
                console.error('❌ Tone.js Sampler 播放失败:', error);
                resolve();
            }
        });
    }

    /**
     * 停止所有播放
     */
    stopAll() {
        customSampler.stopAll();
        
        if (AppState.audio.sampler) {
            AppState.audio.sampler.releaseAll();
        }
    }

    /**
     * 重新加载自定义采样
     */
    async reloadCustomSamples(noteUrlMap) {
        // 先清理旧的
        customSampler.dispose();
        
        // 加载新的
        const results = await customSampler.loadMultipleNotes(noteUrlMap);
        this.setUseCustomSampler(true);
        
        console.log(`🔄 自定义采样重新加载完成: ${customSampler.getLoadedCount()} 个采样`);
        return results;
    }

    /**
     * 获取播放模式信息
     */
    getPlaybackInfo() {
        return {
            useCustomSampler: this.useCustomSampler,
            customSamplesLoaded: customSampler.getLoadedCount(),
            customSamples: customSampler.getLoadedNotes(),
            toneSamplerReady: AppState.audio.samplerReady
        };
    }
}

// 创建单例实例
export const playbackManager = new PlaybackManager();

// ========== 独立函数 ==========

/**
 * 独立的支持中断的音符播放函数
 */
export async function playNoteSampler(noteName, duration = 1.0) {
    return playPureAudio(noteName, duration);
}

/**
 * 纯粹的音频播放函数 - 不检查任何业务状态
 * 用于历史记录、初始播放等不需要中断控制的场景
 */
export async function playPureAudio(noteName, duration = 1.0) {
    console.log('🔊 纯粹音频播放:', noteName, '持续时间:', duration);
    
    return new Promise((resolve) => {
        // 使用播放管理器的 playNote 方法
        playbackManager.playNote(noteName, duration).then(() => {
            console.log('✅ 纯粹音频播放完成:', noteName);
            resolve();
        }).catch(error => {
            console.error('❌ 纯粹音频播放错误:', error);
            resolve();
        });
    });
}

/**
 * 题目播放函数 - 包含业务逻辑检查
 * 用于题目播放流程，可以被复位操作中断
 */
 export async function playQuizAudio(noteName, duration = 1.0) {
    // 🔴 增强检查：在音频播放前和播放过程中都检查
    if (AppState.quiz.fromReset || AppState.audio.shouldStop) {
        console.log('❌ 复位状态中，跳过音频播放:', noteName);
        return Promise.resolve();
    }
    
    return new Promise((resolve) => {
        // 创建播放标识用于中断检查
        let playbackCompleted = false;
        
        // 定期检查中断
        const interruptCheck = setInterval(() => {
            if ((AppState.quiz.fromReset || AppState.audio.shouldStop) && !playbackCompleted) {
                console.log('❌ 音频播放过程中检测到复位，立即停止');
                clearInterval(interruptCheck);
                playbackManager.stopAll(); // 强制停止当前播放
                resolve();
            }
        }, 50); // 每50ms检查一次
        
        // 使用播放管理器的 playNote 方法
        playbackManager.playNote(noteName, duration).then(() => {
            playbackCompleted = true;
            clearInterval(interruptCheck);
            
            if (!AppState.quiz.fromReset && !AppState.audio.shouldStop) {
            }
            resolve();
        }).catch(error => {
            playbackCompleted = true;
            clearInterval(interruptCheck);
            console.error('❌ 题目音频播放错误:', error);
            resolve();
        });
        
        // 安全超时
        setTimeout(() => {
            if (!playbackCompleted) {
                playbackCompleted = true;
                clearInterval(interruptCheck);
                console.log('⏰ 音频播放超时:', noteName);
                resolve();
            }
        }, duration * 1000 + 2000);
    });
}

/**
 * 独立停止所有播放函数
 */
export function stopAllPlayback() {
    console.log('🛑 强制停止所有音频播放');
    
    // 设置停止标志
    AppState.audio.shouldStop = true;
    AppState.audio.isPlaying = false;
    
    // 调用播放管理器的停止方法
    playbackManager.stopAll();
    
    // 停止 Tone.js 传输
    if (window.Tone) {
        try {
            Tone.Transport.stop();
            Tone.Transport.cancel();
        } catch (e) {
            console.log('停止 Transport 失败:', e.message);
        }
    }
    
    console.log('✅ 所有音频播放已停止');
}