import { SAMPLE } from '../audio/sampler-manager.js';
import { toggleTheme } from './theme-manager.js';
import { getANoteForKey } from '../utils/helpers.js';
import { KEY_SCALES } from '../core/constants.js';
import { statsModal } from './stats-modal.js';
import statsManager from '../quiz/stats-manager.js';
// 绑定自定义采样事件
export function bindCustomSampleEvents() {
    const customBtn = document.getElementById('customBtn');
    const resetBtn = document.getElementById('resetBtn');
    const fileIn = document.getElementById('fileIn');
    
    if (customBtn && fileIn) {
        // 移除旧的事件监听器
        customBtn.replaceWith(customBtn.cloneNode(true));
        const freshCustomBtn = document.getElementById('customBtn');
        
        freshCustomBtn.onclick = () => fileIn.click();
    }
    
    if (resetBtn) {
        // 移除旧的事件监听器
        resetBtn.replaceWith(resetBtn.cloneNode(true));
        const freshResetBtn = document.getElementById('resetBtn');
        
        freshResetBtn.onclick = () => {
            SAMPLE.reset();
        };
    }
    
    if (fileIn) {
        fileIn.onchange = (e) => {
            if (e.target.files.length) {
                SAMPLE.load(Array.from(e.target.files));
            }
            e.target.value = '';
        };
    }
}

// 绑定主题事件
export function bindThemeEvents() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        // 移除旧的事件监听器
        themeToggle.replaceWith(themeToggle.cloneNode(true));
        const freshThemeToggle = document.getElementById('themeToggle');
        
        freshThemeToggle.addEventListener('click', toggleTheme);
    }
}

// 绑定核心事件（基准音模式、调性选择等）
export function bindCoreEvents() {
    // 基准音模式按钮点击事件
    const modeButtons = document.querySelectorAll('.mode-btn');
    modeButtons.forEach(btn => {
        // 克隆按钮以移除旧事件
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });

    // 重新绑定事件
    const freshModeButtons = document.querySelectorAll('.mode-btn');
    freshModeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            freshModeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const baseMode = btn.dataset.mode;
            updateBaseNoteSetting(baseMode);
        });
    });

    // 调性选择变化事件
    const keySelect = document.getElementById('keySelect');
    if (keySelect) {
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
        window.AppState.baseNote = baseNote;
    }
}

export function bindStatsModalEvents() {
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    if (viewDetailsBtn) {
        // 移除旧的事件监听器
        viewDetailsBtn.replaceWith(viewDetailsBtn.cloneNode(true));
        const freshBtn = document.getElementById('viewDetailsBtn');
        
        freshBtn.addEventListener('click', function() {
            
            // 调用原始统计模态框显示逻辑
            if (statsModal && typeof statsModal.show === 'function') {
                statsModal.show();
            } else {
                // 备用方案：直接显示模态框
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
    bindCustomSampleEvents();
    bindThemeEvents();
    bindCoreEvents();
    bindStatsModalEvents();
}