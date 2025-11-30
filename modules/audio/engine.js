import { AppState } from '../core/state.js';
import { SAMPLER_CONFIG } from '../core/constants.js';
import { updateMasterVolume } from '../audio/volume.js';
import { playNoteSampler, stopAllPlayback } from './playback-manager.js';

// 初始化Sampler
function initSampler() {
  if (window.Tone) {
    const configWithCallback = {
      ...SAMPLER_CONFIG,
      onload: () => {
        AppState.audio.samplerReady = true;
      },
      onerror: (error) => {
        console.error('❌ Sampler加载失败:', error);
      }
    };
    AppState.audio.sampler = new Tone.Sampler(configWithCallback);
  }
}

// 停止所有音频的函数
function stopAllAudio() {
  console.log('🛑 强制停止所有音频');
  
  // 设置停止标志
  AppState.audio.shouldStop = true;
  AppState.audio.isPlaying = false;
  
  // 停止 Tone.js 所有声音
  if (window.Tone) {
    try {
      // 停止所有采样器
      if (AppState.audio.sampler) {
        AppState.audio.sampler.releaseAll();
      }
      // 停止音效采样器
      if (AppState.audio.sfxSampler) {
        AppState.audio.sfxSampler.releaseAll();
      }
      // 停止传输
      Tone.Transport.stop();
      Tone.Transport.cancel();
      console.log('✅ Tone.js 音频已强制停止');
    } catch (e) {
      console.log('停止 Tone.js 失败:', e.message);
    }
  }
  
  // 停止自定义采样器
  if (customSampler && typeof customSampler.stopAll === 'function') {
    customSampler.stopAll();
  }
}

// 重新导出停止函数，保持兼容性
export function stopPlayback() {
  console.log('🛑 调用播放管理器停止所有播放');
  stopAllPlayback();
}

// 停止所有音符播放
function stopAllNotes() {
  // 只停止 Tone.js 的播放
  if (AppState.audio.sampler) {
    AppState.audio.sampler.releaseAll();
  }
  if (AppState.audio.sfxSampler) {
    AppState.audio.sfxSampler.releaseAll();
  }
}

// 确保音频上下文就绪
async function ensureAudioContextReady() {
  if (AppState.audio.contextResumed) {
    return true;
  }
  
  if (window.Tone && Tone.context && Tone.context.state === 'suspended') {
    try {
      await Tone.context.resume();
      AppState.audio.contextResumed = true;
      return true;
    } catch (error) {
      console.error('确保AudioContext就绪失败:', error);
      return false;
    }
  }
  
  return AppState.audio.contextResumed;
}

// 处理首次用户交互
function handleFirstUserInteraction() {
  if (AppState.audio.firstInteractionHandled) return;
  
  AppState.audio.firstInteractionHandled = true;
  
  // 创建主音量控制（初始音量设为0dB）
  AppState.audio.masterVolume = new Tone.Volume(0).toDestination();
  
  // 重新连接Sampler到主音量
  if (AppState.audio.sampler) {
    AppState.audio.sampler.disconnect(); 
    AppState.audio.sampler.connect(AppState.audio.masterVolume);
  }
  
  if (AppState.audio.sfxSampler) {
    AppState.audio.sfxSampler.disconnect();
    AppState.audio.sfxSampler.connect(AppState.audio.masterVolume);
  }
  
  // 立即更新音量到当前设置
  updateMasterVolume();
}

// 初始化音频上下文恢复逻辑
function initAudioContextResume() {
  // 如果已经恢复过，不再初始化
  if (AppState.audio.contextResumed || AppState.audio.resumeAttempted) {
    return;
  }

  const resumeAudioContext = function() {
    // 如果已经恢复过，不再重复执行
    if (AppState.audio.contextResumed || AppState.audio.resumeAttempted) {
      return;
    }
    
    AppState.audio.resumeAttempted = true;
    
    // 处理首次交互
    handleFirstUserInteraction();
    
    // 恢复Tone.js的AudioContext
    if (window.Tone && Tone.context) {
      if (Tone.context.state === 'suspended') {
        Tone.context.resume()
          .then(() => {
            console.log('✅ AudioContext已恢复');
            AppState.audio.contextResumed = true;
            
            // 恢复后重新连接音频节点
            reconnectAudioNodes();
          })
          .catch(error => {
            console.error('恢复AudioContext失败:', error);
            AppState.audio.resumeAttempted = false;
            
            // 显示用户提示
            showAudioError('音频初始化失败，请点击页面重试');
          });
      } else if (Tone.context.state === 'running') {
        AppState.audio.contextResumed = true;
        reconnectAudioNodes();
      }
    }
    
    // 同时恢复原生的AudioContext（如果有）
    if (AppState.audio.ctx && AppState.audio.ctx.state === 'suspended') {
      AppState.audio.ctx.resume()
        .then(() => {
        })
        .catch(error => {
          console.error('恢复原生AudioContext失败:', error);
        });
    }
  };

  // 为交互元素添加事件监听
  const addResumeListener = (element) => {
    if (element) {
      const handler = () => {
        if (!AppState.audio.contextResumed && !AppState.audio.resumeAttempted) {
          resumeAudioContext();
        }
      };
      
      element.addEventListener('click', handler, { once: true, passive: true });
      element.addEventListener('touchstart', handler, { once: true, passive: true });
    }
  };

  // 监听这些元素的交互
  addResumeListener(document.getElementById('startBtn'));
  addResumeListener(document.getElementById('big-play-btn'));
  addResumeListener(document.getElementById('resetQuestionBtn'));
  addResumeListener(document.body);

  // 键盘事件
  document.addEventListener('keydown', function(e) {
    if (!AppState.audio.contextResumed && !AppState.audio.resumeAttempted && 
        [' ', 'Enter', 'Shift'].includes(e.key)) {
      resumeAudioContext();
    }
  }, { once: true, passive: true });

  // 自动恢复尝试（保险措施）
  setTimeout(() => {
    if (!AppState.audio.contextResumed && !AppState.audio.resumeAttempted) {
      resumeAudioContext();
    }
  }, 1000);
}

// 重新连接音频节点（保险措施）
function reconnectAudioNodes() {
  // 添加防重复检查
  if (AppState.audio.nodesReconnected) {
    return;
  }
  
  if (AppState.audio.sampler && AppState.audio.masterVolume) {
    try {
      AppState.audio.sampler.disconnect();
      AppState.audio.sampler.connect(AppState.audio.masterVolume);
    } catch (error) {
      console.error('主Sampler重新连接失败:', error);
    }
  }
  
  if (AppState.audio.sfxSampler && AppState.audio.masterVolume) {
    try {
      AppState.audio.sfxSampler.disconnect();
      AppState.audio.sfxSampler.connect(AppState.audio.masterVolume);
    } catch (error) {
      console.error('音效Sampler重新连接失败:', error);
    }
  }
  
  // 标记已重新连接
  AppState.audio.nodesReconnected = true;
}

// 辅助函数：显示音频错误
function showAudioError(message) {
  const msgDisplay = document.getElementById('msg');
  if (msgDisplay) {
    msgDisplay.textContent = message;
  }
}

// 导出函数
export {
  initSampler,
  stopAllAudio,
  stopAllNotes,
  ensureAudioContextReady,
  initAudioContextResume,
  handleFirstUserInteraction,
  reconnectAudioNodes,
  playNoteSampler,
};