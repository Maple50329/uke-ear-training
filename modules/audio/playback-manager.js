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