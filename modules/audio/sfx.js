import { AppState } from '../core/state.js';
import { SFX_FILES } from '../core/constants.js';
import { UI_TEXT } from '../core/constants.js';
import { updateBigButtonState } from '../ui/buttons.js';
async function loadSFX() {
    try {
      AppState.audio.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const [okBuf, failBuf] = await Promise.all([
        fetch(SFX_FILES.ok).then(r => r.arrayBuffer()).then(b => AppState.audio.ctx.decodeAudioData(b)),
        fetch(SFX_FILES.fail).then(r => r.arrayBuffer()).then(b => AppState.audio.ctx.decodeAudioData(b))
      ]);
      AppState.audio.SFX.ok = okBuf;
      AppState.audio.SFX.fail = failBuf;
      AppState.audio.sfxReady = true;
      if (AppState.dom.mainBtn) {
        AppState.dom.mainBtn.textContent = UI_TEXT.INITIAL;
        updateBigButtonState(); 
      } 
    } catch (e) {
      console.warn('音效加载失败，已进入无音效模式', e);
      if (AppState.dom.mainBtn) {
        AppState.dom.mainBtn.textContent = UI_TEXT.NO_SFX;
        updateBigButtonState(); 
      }
    }
  }

  function initSFXSampler() {
    if (!window.Tone) {
      console.warn('Tone.js未加载，无法初始化音效Sampler');
      return;
    }
    
    try {
      AppState.audio.sfxSampler = new Tone.Sampler({
        urls: {
          "C6": "correct.mp3",  // 使用高音区的C6代表正确音效
          "C7": "error.mp3"     // 使用更高音区的C7代表错误音效
        },
        baseUrl: "audio/sfx/",
        release: 0.5,
        attack: 0.001,
        onload: () => {
          AppState.audio.sfxSamplerReady = true;
          if (AppState.audio.masterVolume) {
            AppState.audio.sfxSampler.connect(AppState.audio.masterVolume);
          }
        },
        onerror: (error) => {
          console.error('音效Sampler加载失败:', error);
          AppState.audio.sfxSamplerReady = false;
        }
      });
      
    } catch (error) {
      console.error('初始化音效Sampler失败:', error);
      AppState.audio.sfxSamplerReady = false;
    }
  }

  function playSFX(name) {
    // 优先使用音效Sampler
    if (AppState.audio.sfxSamplerReady && AppState.audio.sfxSampler) {
      playSFXWithSampler(name);
      return;
    }
    
    // 其次使用主Sampler（作为备用）
    if (AppState.audio.samplerReady && AppState.audio.sampler) {
      playSFXWithMainSampler(name);
      return;
    }
    
    // 最后使用Web Audio API备用
    playSFXFallback(name);
  }

function playSFXWithSampler(name) {
    try {
      const sfxNote = name === 'ok' ? 'C6' : 'C7';
      
      // 直接设置音量
      const volume = AppState.audio.isMuted ? 0 : AppState.audio.volume * 0.7;
      if (AppState.audio.masterVolume) {
        const dbVolume = volume === 0 ? -60 : Tone.gainToDb(volume);
        AppState.audio.masterVolume.volume.value = dbVolume;
      }
      
      // 播放音效
      AppState.audio.sfxSampler.triggerAttackRelease(sfxNote, 0.3);
      
    } catch (error) {
      console.error('音效Sampler播放失败，使用备用方案:', error);
      playSFXFallback(name);
    }
  }

  function playSFXWithMainSampler(name) {
    try {
      // 使用对应的音符名称
      const sfxNote = name === 'ok' ? 'C6' : 'C7';
      const volume = AppState.audio.isMuted ? 0 : AppState.audio.volume * 0.7;
      
      AppState.audio.sampler.triggerAttackRelease(sfxNote, 0.3);
      
    } catch (error) {
      console.error('主Sampler播放音效失败:', error);
      playSFXFallback(name);
    }
  }

  function playSFXFallback(name) {
    if (!AppState.audio.sfxReady || !AppState.audio.ctx || !AppState.audio.SFX[name]) return;
    
    const src = AppState.audio.ctx.createBufferSource();
    const gainNode = AppState.audio.ctx.createGain();
    src.buffer = AppState.audio.SFX[name];
    src.connect(gainNode);
    gainNode.gain.value = AppState.audio.isMuted ? 0 : AppState.audio.volume * 0.7;
    gainNode.connect(AppState.audio.ctx.destination);
    src.start();
  }

  export {
    loadSFX,
    initSFXSampler,
    playSFX,
    playSFXWithSampler,
    playSFXWithMainSampler,
    playSFXFallback
  };