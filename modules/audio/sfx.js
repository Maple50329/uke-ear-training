import { AppState } from '../core/state.js';
import { UI_TEXT } from '../core/constants.js';
import { updateBigButtonState } from '../ui/buttons.js';

// 初始化音效Sampler
function initSFXSampler() {
  if (!window.Tone) {
    console.warn('Tone.js未加载，无法初始化音效Sampler');
    return;
  }
  
  try {
    AppState.audio.sfxSampler = new Tone.Sampler({
      urls: {
        "C6": "correct.mp3",  // 正确音效
        "C7": "error.mp3"     // 错误音效
      },
      baseUrl: "audio/sfx/",
      release: 0.5,
      attack: 0.001,
      onload: () => {
        AppState.audio.sfxSamplerReady = true;
        
        // 连接到主音量控制
        if (AppState.audio.masterVolume) {
          AppState.audio.sfxSampler.connect(AppState.audio.masterVolume);
        }
      },
      onerror: (error) => {
        console.error('❌ 音效Sampler加载失败:', error);
        AppState.audio.sfxSamplerReady = false;
      }
    });
    
  } catch (error) {
    console.error('初始化音效Sampler失败:', error);
    AppState.audio.sfxSamplerReady = false;
  }
}

// 加载音效（简化版，只设置状态）
async function loadSFX() {
  try {
    // 设置UI状态
    if (AppState.dom.mainBtn) {
      AppState.dom.mainBtn.textContent = UI_TEXT.INITIAL;
      updateBigButtonState(); 
    }
    
  } catch (e) {
    console.warn('音效初始化失败，使用无音效模式', e);
    if (AppState.dom.mainBtn) {
      AppState.dom.mainBtn.textContent = UI_TEXT.NO_SFX;
      updateBigButtonState(); 
    }
  }
}

// 播放音效 - 只用 Tone.js
function playSFX(name) {
  // 只使用音效Sampler
  if (AppState.audio.sfxSamplerReady && AppState.audio.sfxSampler) {
    playSFXWithSampler(name);
    return;
  }
}

// 使用音效Sampler播放
function playSFXWithSampler(name) {
  try {
    const sfxNote = name === 'ok' ? 'C6' : 'C7';
    
    // 设置音量（通过主音量控制）
    const volume = AppState.audio.isMuted ? 0 : AppState.audio.volume * 0.7;
    if (AppState.audio.masterVolume) {
      const dbVolume = volume === 0 ? -60 : Tone.gainToDb(volume);
      AppState.audio.masterVolume.volume.value = dbVolume;
    }
    
    // 播放音效
    AppState.audio.sfxSampler.triggerAttackRelease(sfxNote, 0.3);
    
  } catch (error) {
    console.error('音效播放失败:', error);
  }
}

export {
  loadSFX,
  initSFXSampler,
  playSFX
};