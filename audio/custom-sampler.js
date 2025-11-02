// modules/audio/custom-sampler.js
import { AppState } from '../core/state.js';
import { notes } from '../core/config.js';

export class CustomSampler {
    constructor() {
        this.players = new Map(); // 存储所有 Player 实例
        this.loadingPromises = new Map(); // 存储加载中的 Promise
        this.isInitialized = false;
    }

    /**
     * 初始化自定义采样系统
     */
    async init() {
        if (this.isInitialized) {
            return true;
        }
        
        try {
            // 等待 Tone.js 上下文就绪
            if (window.Tone && Tone.context.state !== 'running') {
                await Tone.context.resume();
            }
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('❌ 自定义采样系统初始化失败:', error);
            return false;
        }
    }

    /**
     * 加载单个音符的自定义采样
     */
    async loadNote(noteName, audioUrl) {
        if (!this.isInitialized) {
            await this.init();
        }

        // 如果已经在加载中，返回现有的 Promise
        if (this.loadingPromises.has(noteName)) {
            return this.loadingPromises.get(noteName);
        }

        const loadPromise = new Promise(async (resolve, reject) => {
            try {
                console.log(`📥 开始加载自定义采样: ${noteName}`, audioUrl);
                
                // 创建 Player 实例
                const player = new Tone.Player({
                    url: audioUrl,
                    onload: () => {
                        console.log(`✅ 自定义采样加载成功: ${noteName}`);
                        
                        // 连接到主音量控制
                        if (AppState.audio.masterVolume) {
                            player.connect(AppState.audio.masterVolume);
                        } else {
                            player.toDestination();
                        }
                        
                        // 存储 Player 实例
                        this.players.set(noteName, player);
                        this.loadingPromises.delete(noteName);
                        resolve(player);
                    },
                    onerror: (error) => {
                        console.error(`❌ 自定义采样加载失败: ${noteName}`, error);
                        this.loadingPromises.delete(noteName);
                        reject(new Error(`加载 ${noteName} 失败: ${error}`));
                    }
                });

            } catch (error) {
                console.error(`❌ 创建 Player 失败: ${noteName}`, error);
                this.loadingPromises.delete(noteName);
                reject(error);
            }
        });

        this.loadingPromises.set(noteName, loadPromise);
        return loadPromise;
    }

    /**
     * 批量加载多个自定义采样
     */
    async loadMultipleNotes(noteUrlMap) {
        const results = [];
        
        for (const [noteName, audioUrl] of Object.entries(noteUrlMap)) {
            if (audioUrl) {
                try {
                    const player = await this.loadNote(noteName, audioUrl);
                    results.push({ noteName, success: true, player });
                } catch (error) {
                    results.push({ noteName, success: false, error: error.message });
                }
            }
        }
        
        return results;
    }

    /**
     * 播放自定义采样
     */
    async play(noteName, duration = 1.5) {
        if (!this.players.has(noteName)) {
            console.warn(`⚠️ 未找到自定义采样: ${noteName}`);
            return false;
        }

        try {
            const player = this.players.get(noteName);
            
            // 检查播放器状态
            if (player.loaded) {
                // 停止当前播放（如果有）
                if (player.state === 'started') {
                    player.stop();
                }
                
                // 开始播放
                const now = Tone.now();
                player.start(now);
                console.log(`🎵 播放自定义采样: ${noteName}`);
                
                // 设置自动停止
                if (duration > 0) {
                    setTimeout(() => {
                        if (player.state === 'started') {
                            player.stop();
                        }
                    }, duration * 1000);
                }
                
                return true;
            } else {
                console.warn(`⚠️ 自定义采样未加载完成: ${noteName}`);
                return false;
            }
        } catch (error) {
            console.error(`❌ 播放自定义采样失败: ${noteName}`, error);
            return false;
        }
    }

    /**
     * 停止播放特定音符
     */
    stop(noteName) {
        if (this.players.has(noteName)) {
            const player = this.players.get(noteName);
            if (player.state === 'started') {
                player.stop();
            }
        }
    }

    /**
     * 停止所有播放
     */
    stopAll() {
        this.players.forEach((player, noteName) => {
            if (player.state === 'started') {
                player.stop();
            }
        });
    }

    /**
     * 检查是否有自定义采样
     */
    hasNote(noteName) {
        return this.players.has(noteName) && this.players.get(noteName).loaded;
    }

    /**
     * 获取已加载的自定义采样数量
     */
    getLoadedCount() {
        let count = 0;
        this.players.forEach(player => {
            if (player.loaded) count++;
        });
        return count;
    }

    /**
     * 获取所有已加载的音符
     */
    getLoadedNotes() {
        const loadedNotes = [];
        this.players.forEach((player, noteName) => {
            if (player.loaded) {
                loadedNotes.push(noteName);
            }
        });
        return loadedNotes;
    }

    /**
     * 清理资源
     */
    dispose() {
        this.stopAll();
        this.players.forEach(player => {
            try {
                player.dispose();
            } catch (error) {
                console.warn('清理 Player 时出错:', error);
            }
        });
        this.players.clear();
        this.loadingPromises.clear();
        this.isInitialized = false;
        console.log('🗑️ 自定义采样资源已清理');
    }
}

// 创建单例实例
export const customSampler = new CustomSampler();