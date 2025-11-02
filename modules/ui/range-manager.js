import { ranges } from '../core/config.js';
import { AppState } from '../core/state.js';
import { showKeyChangeToast } from '../utils/displayHelpers.js';

export let currentRange = ranges.low;
export let pendingRangeChange = null; // 保留待处理的音域更改

// 更新音域
export function updateRange(key) {
    if (!ranges[key]) {
        console.warn(`未知的音域: ${key}`);
        return;
    }
    
    // 如果在播放中，只保存待处理更改，不立即应用
    if (AppState.quiz.locked) {
        pendingRangeChange = key;
        showKeyChangeToast('音域更改将在下一题生效');
        syncUIPreview(key);
        return;
    }
    
    // 🔴 修复：答对后允许立即更新音域
    if (AppState.quiz.answered) {
        // 答对后可以立即应用音域更改
        applyRangeChange(key);
        showKeyChangeToast('音域已更新');
        return;
    }
    
    // 如果已经开始但未完成答题，提示下一题生效
    if (AppState.quiz.hasStarted && !AppState.quiz.answered) {
        pendingRangeChange = key;
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
    currentRange = ranges[key];
    window.currentRange = currentRange;
    pendingRangeChange = null;

    // 更新UI状态
    syncUIPreview(key);
    
    // 🔴 确保触发范围变化事件
    window.dispatchEvent(new CustomEvent('range-changed', {
        detail: { range: key }
    }));
}

// 检查并应用待处理的音域更改
export function applyPendingRangeChange() {
    if (pendingRangeChange) {
        applyRangeChange(pendingRangeChange);
        return true;
    }
    return false;
}

// 同步UI预览
function syncUIPreview(key) {
    
    // 更新单选按钮状态
    const radio = document.querySelector(`input[name="range"][value="${key}"]`);
    if (radio) {
        radio.checked = true;
    }
    
    // 同步左侧面板按钮状态
    syncLeftPanelButtons(key);
    
    // 同步设置面板按钮状态（如果存在）
    syncSettingsPanelButtons(key);
}

// 获取当前音域键
export function getCurrentKey() {
    if (currentRange === ranges.low) return 'low';
    if (currentRange === ranges.mid) return 'mid';
    return 'low';
}

// 获取当前音域范围
export function getCurrentRange() {
    return currentRange;
}

// 同步左侧面板按钮状态
function syncLeftPanelButtons(activeKey) {
    const leftPanelBtns = document.querySelectorAll('.left-panel .range-btn');
    leftPanelBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === activeKey);
    });
}

// 同步设置面板按钮状态
function syncSettingsPanelButtons(activeKey) {
    const settingsBtns = document.querySelectorAll('#settingsPanel .rangeBtn');
    settingsBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === activeKey);
    });
}

// 绑定左侧面板音域按钮
export function bindLeftPanelRangeButtons() {
    const leftBtns = document.querySelectorAll('.left-panel .range-btn[data-range]');
    
    // 先移除所有现有的事件监听器
    leftBtns.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
    });
    
    // 重新获取按钮并绑定事件
    const freshBtns = document.querySelectorAll('.left-panel .range-btn[data-range]');
    freshBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const range = this.dataset.range;
            if (!range) return;
            updateRange(range);
        });
    });
}

// 绑定设置面板音域按钮
export function bindSettingsPanelRangeButtons() {
    // 使用事件委托处理设置面板中的按钮点击
    document.addEventListener('click', function(e) {
        // 判断点击的是否是设置面板里的音域按钮
        if (e.target.classList.contains('rangeBtn') && e.target.closest('#settingsPanel')) {
            const range = e.target.dataset.range;
            if (!range) return;

            updateRange(range);

            // 同步左侧面板按钮状态
            document.querySelectorAll('.left-panel .range-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.range === range);
            });

            // 同步设置面板按钮状态
            const rangeBtnGroup = e.target.closest('#rangeBtnGroup');
            if (rangeBtnGroup) {
                rangeBtnGroup.querySelectorAll('.rangeBtn').forEach(btn => {
                    btn.classList.toggle('active', btn === e.target);
                });
            }
        }
    });
}

// 初始化音域系统
export function initRangeSystem() {
    // 设置默认音域
    updateRange('low');
    // 绑定各种音域按钮
    bindLeftPanelRangeButtons();
    bindSettingsPanelRangeButtons();
}