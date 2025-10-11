import { AppState } from '../core/state.js';
/*==============
显示/反馈相关函数
===============*/
export function showKeyChangeToast(message) {
   // 使用统一的toast元素而不是创建新的
   const toast = document.getElementById('toast');
   if (toast) {
     toast.textContent = message;
     toast.classList.add('show');
     
     // 2秒后自动隐藏
     setTimeout(() => {
       toast.classList.remove('show');
     }, 2000);
   }
 }

// 显示音频错误提示
export function showAudioError(message, msgDisplayElement = null) {
  console.warn('音频错误:', message);
  // 这里可以添加用户界面提示，比如在msgDisplay中显示
  if (AppState.dom.msgDisplay) {
    const originalText = AppState.dom.msgDisplay.textContent;
    AppState.dom.msgDisplay.textContent = message;
    
    // 3秒后恢复原文本
    setTimeout(() => {
      if (AppState.dom.msgDisplay) {
        AppState.dom.msgDisplay.textContent = originalText;
      }
    }, 3000);
  }
}