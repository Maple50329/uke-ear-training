import { toggleTheme } from './theme-manager.js';
import { getANoteForKey } from '../utils/helpers.js';
import { KEY_SCALES } from '../core/constants.js';
import { statsModal } from './stats-modal.js';

// 绑定主题事件
export function bindThemeEvents() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // 直接重新绑定事件，不克隆节点
        themeToggle.onclick = null; // 清除旧事件
        themeToggle.addEventListener('click', toggleTheme);
    }
}

// 绑定核心事件（基准音模式、调性选择等）
export function bindCoreEvents() {
    // 基准音模式按钮点击事件
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        btn.onclick = null; // 清除旧事件
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const baseMode = btn.dataset.mode;
            updateBaseNoteSetting(baseMode);
        });
    });

    // 调性选择变化事件
    const keySelect = document.getElementById('keySelect');
    if (keySelect) {
        keySelect.onchange = null; // 清除旧事件
        keySelect.addEventListener('change', () => {
            const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
            updateBaseNoteSetting(baseMode);
        });
    }
}

// 更新基准音设置
function updateBaseNoteSetting(mode) {
    const key = document.getElementById('keySelect')?.value || 'C';
    let baseNote;
    
    if (mode === 'c') {
        const naturalScale = KEY_SCALES[key]?.basic || KEY_SCALES.C.basic;
        baseNote = naturalScale[0];
    } else {
        baseNote = getANoteForKey(key);
    }  
    
    if (window.AppState) {
        // 更新应用状态中的基准音
        window.AppState.baseNote = baseNote;
        
        // 🔴 注意：这里不更新 questionBaseMode，因为它只在出题时更新
        // 只触发UI设置更新事件，用于其他UI反馈
        window.dispatchEvent(new CustomEvent('base-mode-setting-changed', { 
            detail: { mode } 
        }));
    }
}

export function bindStatsModalEvents() {
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    if (viewDetailsBtn) {
        viewDetailsBtn.onclick = null; // 清除旧事件
        viewDetailsBtn.addEventListener('click', function() {
            if (statsModal && typeof statsModal.show === 'function') {
                statsModal.show();
            } else {
                const modal = document.querySelector('.stats-modal');
                if (modal) {
                    modal.classList.add('show');
                }
            }
        });
    }
}



// 初始化所有事件绑定
export function initAllEventBindings() {
    bindThemeEvents();
    bindCoreEvents();
    bindStatsModalEvents();
}