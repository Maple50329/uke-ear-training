import { getCurrentKey } from './range-manager.js';
import { updateRange } from '../ui/range-manager.js';
// 显示模态框
export function showModal(modalId, maskId) {
    const modal = document.getElementById(modalId);
    const mask = document.getElementById(maskId);
    
    if (modal && mask) {
        modal.style.display = 'block';
        mask.style.display = 'block';
    }
}

// 隐藏模态框
export function hideModal(modalId, maskId) {
    const modal = document.getElementById(modalId);
    const mask = document.getElementById(maskId);
    
    if (modal && mask) {
        modal.style.display = 'none';
        mask.style.display = 'none';
    }
}

// 显示范围选择模态框
export function showRangeModal() {
    showModal('rangeModal', 'rangeMask');
    
    // 同步当前选择的音域
    const currentKey = getCurrentKey(); // 这个函数需要在 range-manager.js 中定义
    const radio = document.querySelector(`input[name="range"][value="${currentKey}"]`);
    if (radio) {
        radio.checked = true;
    }
}

// 隐藏范围选择模态框
export function hideRangeModal() {
    hideModal('rangeModal', 'rangeMask');
}

// 初始化模态框事件
export function initModalEvents() {
    // 范围模态框确定按钮
    const rangeOkBtn = document.getElementById('rangeOkBtn');
    const rangeMask = document.getElementById('rangeMask');
    
    if (rangeOkBtn) {
        rangeOkBtn.addEventListener('click', () => {
            const selected = document.querySelector('input[name="range"]:checked')?.value;
            if (selected && updateRange) {
                updateRange(selected);
            }
            hideRangeModal();
        });
    }
    
    if (rangeMask) {
        rangeMask.addEventListener('click', hideRangeModal);
    }
}