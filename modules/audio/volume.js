// modules/audio/volume.js
import { AppState } from '../core/state.js';

// 更新主音量
function updateMasterVolume() {
  if (!AppState.audio.masterVolume) return;
  
  // 确保音量在有效范围内
  let effectiveVolume = AppState.audio.isMuted ? 0 : AppState.audio.volume;
  effectiveVolume = Math.max(0, Math.min(1, effectiveVolume));
  
  if (effectiveVolume === 0) {
    AppState.audio.masterVolume.volume.value = -Infinity; // 完全静音
  } else {
    // 线性映射：0-1 → -40dB to 0dB
    const MIN_DB = -40;
    const MAX_DB = 0;
    const dbVolume = MIN_DB + (effectiveVolume * (MAX_DB - MIN_DB));
    AppState.audio.masterVolume.volume.value = dbVolume;
  }
}

// 更新音量显示
function updateVolumeDisplay() {
  const sliderContainer = document.querySelector('.volume-slider-container');
  if (!sliderContainer) return;
  
  // 显示当前音量百分比（0-100%）
  let displayVolume;
  if (AppState.audio.isMuted) {
    displayVolume = 0; // 静音时显示0%
  } else {
    displayVolume = Math.round(AppState.audio.volume * 100); // 正常显示音量百分比
  }
  
  sliderContainer.setAttribute('data-volume', `${displayVolume}%`);
}

// 初始化音量控制
function initVolumeControl() {
  const volumeToggle = document.getElementById('volumeToggle');
  const volumeSlider = document.getElementById('volumeSlider');
  const sliderContainer = document.querySelector('.volume-slider-container');
  const volumeControl = document.querySelector('.volume-control');
  
  if (!volumeToggle || !volumeSlider) return;
  
  // 设置初始值
  volumeSlider.value = 1.0;
  AppState.audio.volume = 1.0;
  AppState.audio.lastVolume = 1.0;
  updateMasterVolume();
  updateVolumeDisplay();
  
  // 音量滑块事件
  volumeSlider.addEventListener('input', (e) => {
    AppState.audio.volume = parseFloat(e.target.value);
    updateMasterVolume();
    updateVolumeDisplay();
    
    // 如果从静音状态调整音量，取消静音
    if (AppState.audio.isMuted && AppState.audio.volume > 0) {
        AppState.audio.isMuted = false;
        volumeToggle.textContent = '🔊';
        volumeControl.classList.remove('muted');
    }
  });
  
  // 静音按钮事件
  if (volumeToggle) {
    volumeToggle.addEventListener('click', () => {
      if (AppState.audio.isMuted) {
        // 取消静音
        AppState.audio.isMuted = false;
        AppState.audio.volume = AppState.audio.lastVolume;
        volumeToggle.textContent = '🔊';
        volumeControl.classList.remove('muted');
      } else {
        // 静音
        AppState.audio.isMuted = true;
        AppState.audio.lastVolume = AppState.audio.volume;
        AppState.audio.volume = 0;
        volumeToggle.textContent = '🔇';
        volumeControl.classList.add('muted');
      }

      setTimeout(() => {
        updateMasterVolume();
        updateVolumeDisplay();
      }, 100);
      
      // 更新滑块显示（但不改变实际值）
      volumeSlider.value = AppState.audio.isMuted ? 0 : AppState.audio.volume;
    });
  }
}
initVolumeControl();
export {
  initVolumeControl, 
  updateMasterVolume,
  updateVolumeDisplay
};