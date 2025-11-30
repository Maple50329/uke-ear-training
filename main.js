import { initRangeSystem, updateRange } from './modules/ui/range-manager.js';
import { initTheme, watchSystemTheme } from './modules/ui/theme-manager.js';
import { initAllEventBindings } from './modules/ui/event-bindings.js';

function showToast(message, duration = 2000) {
  const toast = document.getElementById('toast');
  if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      
      setTimeout(() => {
          toast.classList.remove('show');
      }, duration);
  }
}

// 应用初始化
function initialize() {
    
    try {
        //初始化各子系统
        initRangeSystem();     // 音域系统
        initTheme();          // 主题系统
        watchSystemTheme();   // 系统主题监听
        
        //初始化事件绑定
            // 模态框事件
        initAllEventBindings(); // 所有其他事件
        
    } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        showToast('初始化失败，请刷新页面', 3000);
    }
}

// 启动应用
window.addEventListener('DOMContentLoaded', initialize);

// 导出用于测试
export { initialize, showToast };