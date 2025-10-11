const STORAGE_KEYS = {
    theme: 'uke-ear-trainer-theme'
  };
  // 初始化主题
  export function initTheme(){
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved) {
      saved === 'dark' && document.body.classList.add('dark');
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.body.classList.add('dark');
    }
  }
  // 切换主题
  export function toggleTheme() {
    document.body.classList.toggle('dark');
    localStorage.setItem(STORAGE_KEYS.theme, 
      document.body.classList.contains('dark') ? 'dark' : 'light');
  }

  // 获取当前主题状态
export function getCurrentTheme() {
    return document.body.classList.contains('dark') ? 'dark' : 'light';
}

// 监听系统主题变化
export function watchSystemTheme() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        // 只有当用户没有手动设置主题时才跟随系统
        if (!localStorage.getItem(STORAGE_KEYS.theme)) {
            if (e.matches) {
                document.body.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
            }
        }
    });
}