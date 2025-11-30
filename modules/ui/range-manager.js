import { ranges } from '../core/config.js';
import { AppState } from '../core/state.js';
import { showKeyChangeToast } from '../utils/displayHelpers.js';
import AppGlobal from '../core/app.js';

// 更新音域
export function updateRange(key) {
    if (!ranges[key]) {
        console.warn(`未知的音域: ${key}`);
        return;
    }
    
    // 立即更新 AppState，确保播放时使用正确的音域
    AppState.quiz.currentRange = key;
    
    // 如果在播放中，只保存待处理更改，不立即应用
    if (AppState.quiz.locked) {
        AppState.quiz.pendingRangeChange = key;
        showKeyChangeToast('音域更改将在下一题生效');
        syncUIPreview(key);
        return;
    }
    
    // 答对后与其他设置保持一致，保存为待处理更改
    if (AppState.quiz.answered) {
        AppState.quiz.pendingRangeChange = key;
        showKeyChangeToast('音域更改将在下一题生效');
        syncUIPreview(key);
        return;
    }
    
    // 如果已经开始但未完成答题，提示下一题生效
    if (AppState.quiz.hasStarted && !AppState.quiz.answered) {
        AppState.quiz.pendingRangeChange = key;
        showKeyChangeToast('音域更改将在下一题生效');
        syncUIPreview(key);
        return;
    }
    
    // 未开始答题时立即应用更改
    if (!AppState.quiz.hasStarted) {
        applyRangeChange(key);
    }
}

// 应用音域更改
function applyRangeChange(key) {
    // 更新 AppState 中的音域状态
    AppState.quiz.currentRange = key;
    AppState.quiz.pendingRangeChange = null;

    // 更新UI状态
    syncUIPreview(key);
    
    // 重新初始化答题区以确保使用正确的音域
    const initAnswerArea = AppGlobal.getTool('initAnswerArea');
    if (initAnswerArea) {
        initAnswerArea();
    }
    
    // 确保触发范围变化事件
    window.dispatchEvent(new CustomEvent('range-changed', {
        detail: { range: key }
    }));

}

// 检查并应用待处理的音域更改
export function applyPendingRangeChange() {
    if (AppState.quiz.pendingRangeChange) {
        applyRangeChange(AppState.quiz.pendingRangeChange);
        return true;
    }
    return false;
}

// 同步UI预览
function syncUIPreview(key) {
    // 同步左侧面板按钮状态
    syncLeftPanelButtons(key);
}

// 获取当前音域键
export function getCurrentKey() {
    return AppState.quiz.currentRange || 'low';
}

// 获取当前音域范围数组
export function getCurrentRange() {
    const key = AppState.quiz.currentRange || 'low';
    
    // 确保 ranges[key] 存在，否则返回默认音域
    if (ranges[key]) {
        return ranges[key];
    } else {
        console.warn(`音域 ${key} 未找到，使用默认音域 low`);
        return ranges.low;
    }
}

// 同步左侧面板按钮状态
function syncLeftPanelButtons(activeKey) {
    const leftPanelBtns = document.querySelectorAll('.left-panel .range-btn');
    leftPanelBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === activeKey);
    });
}

// 绑定左侧面板音域按钮
export function bindLeftPanelRangeButtons() {
    const leftBtns = document.querySelectorAll('.left-panel .range-btn[data-range]');
    
    console.log('找到音域按钮数量:', leftBtns.length); // 调试信息

    leftBtns.forEach(btn => {
        // 移除所有现有的事件监听器（避免重复绑定）
        btn.replaceWith(btn.cloneNode(true));
    });

    // 重新获取按钮引用
    const freshBtns = document.querySelectorAll('.left-panel .range-btn[data-range]');
    
    freshBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const range = this.dataset.range;
            console.log('音域按钮点击:', range); // 调试信息
            
            if (!range) return;
            
            // 更新按钮 active 状态
            freshBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // 调用更新函数
            updateRange(range);
        });
    });
}


// 初始化音域系统
export function initRangeSystem() {
    // 确保 AppState 中有初始值
    if (!AppState.quiz.currentRange) {
        AppState.quiz.currentRange = 'low';
    }
    if (AppState.quiz.pendingRangeChange === undefined) {
        AppState.quiz.pendingRangeChange = null;
    }
    
    // 设置默认音域
    updateRange(AppState.quiz.currentRange);
    // 绑定各种音域按钮
    bindLeftPanelRangeButtons();
}