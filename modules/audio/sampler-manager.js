// modules/audio/sampler-manager.js
import { notes } from '../core/config.js';
import { showToast } from '../ui/feedback.js';
import { playbackManager } from './playback-manager.js';

// 默认音频文件路径
const DEFAULT_AUDIOS = {};
notes.forEach(note => {
    const safe = note.toLowerCase().replace('#', 's');
    DEFAULT_AUDIOS[note] = `audio/piano/${safe}.mp3`;
});

export const SAMPLE = {
    useCustom: false,
    buffers: new Array(24),
    loadedCount: 0,
    onLoadComplete: null,
    
    /**
     * 获取所有自定义采样的 URL 映射
     */
    getNoteUrlMap() {
        const urlMap = {};
        notes.forEach((note, index) => {
            if (this.buffers[index] && !this.buffers[index].startsWith('data:')) {
                urlMap[note] = this.buffers[index];
            }
        });
        return urlMap;
    },
    
    // 渲染采样状态
    renderStatus() {
        const total = notes.length;
        if (this.loadedCount === total) {
            document.getElementById('samplingStatus').textContent = '采样状态：已全部加载完成';
            document.getElementById('statusBox').style.display = 'none';

            if (typeof this.onLoadComplete === 'function') {
                this.onLoadComplete();
            }
            return;
        }
        
        document.getElementById('samplingStatus').textContent = `采样状态：${this.loadedCount}/${total}`;
        
        if (!this.useCustom) {
            this.clearStatus();
            return;
        }

        const html = notes.map((n, i) => {
            const url = this.buffers[i];
            const isLoaded = url && !url.startsWith('data:');
            const color = isLoaded ? '#3eaf7c' : '#bbb';
            
            return `<span style="
                      display:inline-block;
                      width:24px;height:24px;
                      line-height:24px;
                      margin:2px;
                      text-align:center;
                      border-radius:4px;
                      font-size:12px;
                      color:#fff;
                      background:${color};
                    " title="${n}">${n}</span>`;
        }).join('');
    
        const statusBox = document.getElementById('statusBox');
        if (statusBox) {
            statusBox.innerHTML = html;
            statusBox.style.display = 'block';
        }
    },
    
    // 清除状态显示
    clearStatus() {
        const statusBox = document.getElementById('statusBox');
        const samplingStatus = document.getElementById('samplingStatus');
        
        if (statusBox) {
            statusBox.style.display = 'none';
        }
        if (samplingStatus) {
            samplingStatus.textContent = '';
        }
    },
    
    /**
     * 加载自定义采样文件并更新播放系统
     */
    async load(files) {
        const re = /(C|C#|D|D#|E|F|F#|G|G#|A|A#|B)\d/i;

        Array.from(files).forEach(f => {
            const m = f.name.match(re);
            if (!m) return;

            const idx = notes.indexOf(m[0].toUpperCase());
            if (idx === -1) return;

            // 如果该位置已有 blob，先释放
            if (this.buffers[idx] && this.buffers[idx].startsWith('blob:')) {
                URL.revokeObjectURL(this.buffers[idx]);
            }

            this.buffers[idx] = URL.createObjectURL(f);
        });

        this.loadedCount = this.buffers.filter(url => url && !url.startsWith('data:')).length;
        this.useCustom = this.loadedCount > 0;
        this.renderStatus();

        // 重新加载到播放系统
        if (this.useCustom) {
            const noteUrlMap = this.getNoteUrlMap();
            await playbackManager.reloadCustomSamples(noteUrlMap);
            
            showToast(`已加载 ${this.loadedCount}/${notes.length} 个自定义采样`);
        } else {
            showToast('未识别到有效采样文件');
        }
    },
    
    /**
     * 重置为默认采样
     */
    async reset() {
        // 清理 blob URLs
        this.buffers.forEach((url, index) => {
            if (url && url.startsWith('blob:')) {
                URL.revokeObjectURL(url);
            }
        });
        
        this.useCustom = false;
        this.buffers.fill(null);
        this.loadedCount = 0;
        this.clearStatus();
        
        // 通知播放管理器使用默认采样
        playbackManager.setUseCustomSampler(false);
        
        showToast('已恢复默认采样');
    },
    
    // 获取音符的音频URL
    getNoteUrl(noteName) {
        const index = notes.indexOf(noteName.toUpperCase());
        if (index === -1) {
            console.warn('未找到音符:', noteName);
            return DEFAULT_AUDIOS[noteName] || `audio/piano/${noteName.toLowerCase().replace('#', 's')}.mp3`;
        }
        
        // 如果自定义采样存在且有效，使用自定义采样
        if (this.useCustom && this.buffers[index] && !this.buffers[index].startsWith('data:')) {
            return this.buffers[index];
        }
        
        // 否则使用默认采样
        const defaultUrl = DEFAULT_AUDIOS[noteName] || `audio/piano/${noteName.toLowerCase().replace('#', 's')}.mp3`;
        return defaultUrl;
    },
    
    // 检查采样是否就绪
    isReady() {
        return this.loadedCount > 0 || !this.useCustom;
    },
    
    // 获取已加载的采样数量
    getLoadedCount() {
        return this.loadedCount;
    },
    
    // 获取总采样数量
    getTotalCount() {
        return notes.length;
    }
};