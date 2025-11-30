// modules/quiz/error-limit-manager.js
import { AppState } from '../core/state.js';
import AppGlobal from '../core/app.js';
import { UI_TEXT } from '../core/constants.js';

// 初始化错误次数限制系统
export function initErrorLimitSystem() {
    const checkbox = document.getElementById('enableErrorLimit');
    const slider = document.getElementById('errorLimitSlider');
    const display = document.getElementById('errorLimitDisplay');

    if (!checkbox || !slider || !display) {
        console.warn('错误次数系统控件未找到');
        return;
    }

    // 读取本地存储
    const savedEnabled = localStorage.getItem('errorLimitEnabled') === 'true';
    const savedCount = parseInt(localStorage.getItem('allowedErrorCount') || '1');

    // 写入 AppState
    AppState.quiz.errorLimitEnabled = savedEnabled;
    AppState.quiz.allowedErrorCount = savedCount;
    AppState.quiz.currentErrorCount = 0;
    AppState.quiz.answerRevealed = false;

    // 同步 UI
    checkbox.checked = savedEnabled;
    slider.value = savedCount;
    display.textContent = `${savedCount}次`;

    slider.disabled = !savedEnabled;
    display.style.opacity = savedEnabled ? '1' : '0.5';

    // 复选框事件
    checkbox.addEventListener('change', function () {
        const enabled = this.checked;

        AppState.quiz.errorLimitEnabled = enabled;
        AppState.quiz.currentErrorCount = 0;
        AppState.quiz.answerRevealed = false;

        slider.disabled = !enabled;
        display.style.opacity = enabled ? '1' : '0.5';

        localStorage.setItem('errorLimitEnabled', enabled);
    });

    // 滑块事件
    slider.addEventListener('input', function () {
        const count = parseInt(this.value, 10);

        AppState.quiz.allowedErrorCount = count;
        AppState.quiz.currentErrorCount = 0;
        AppState.quiz.answerRevealed = false;

        display.textContent = `${count}次`;

        localStorage.setItem('allowedErrorCount', count);
    });

    console.log('✅ 错误次数系统初始化完成（唯一有效版本）');
}

// 更新提示文字
function updateErrorLimitDisplay(count) {
    const display = document.getElementById('errorLimitDisplay');
    if (display) display.textContent = `${count}次`;
}

// -----------------------------
// 核心逻辑：处理错误答案
// -----------------------------
export function handleWrongAnswer() {
    if (!AppState.quiz.errorLimitEnabled) {
        // 未开启限制 → 原生逻辑
        return { shouldReveal: false, canContinue: true };
    }

    AppState.quiz.currentErrorCount++;

    console.log(`错误次数：${AppState.quiz.currentErrorCount}/${AppState.quiz.allowedErrorCount}`);

    // allowed = 0 → 第一次就揭示正确答案
    if (AppState.quiz.allowedErrorCount === 0) {
        AppState.quiz.answerRevealed = true;
        return { shouldReveal: true, canContinue: false };
    }

    // 一般情况：超过 allowed 时揭示答案
    if (AppState.quiz.currentErrorCount > AppState.quiz.allowedErrorCount) {
        AppState.quiz.answerRevealed = true;
        return { shouldReveal: true, canContinue: false };
    }

    return { shouldReveal: false, canContinue: true };
}

// 是否应揭示答案
export function shouldRevealAnswer() {
    return AppState.quiz.answerRevealed;
}

// 揭示正确答案
export function revealCorrectAnswer() {
    const ansArea = document.getElementById('ans');
    if (!ansArea) return;

    const correctNote = AppState.quiz.currentTargetNote;
    const buttons = ansArea.querySelectorAll('.key-btn');

    const correctBtn = [...buttons].find(btn => btn.dataset.noteName === correctNote);
    if (correctBtn) {
        correctBtn.classList.add('hit');
        correctBtn.disabled = false;

        if (window.playSFX) window.playSFX('ok');
    }

    AppState.quiz.answered = true;
    AppState.quiz.hasAnsweredCurrent = true;

    const disableButtons = AppGlobal.getTool('disableAnswerButtons');
    disableButtons?.();

    setTimeout(() => {
        if (AppState.dom.mainBtn) {
            AppState.dom.mainBtn.textContent = UI_TEXT.NEXT;
            const updateBig = AppGlobal.getTool('updateBigButtonState');
            updateBig?.();
        }
    }, 100);
}

// 重置错误次数
export function resetErrorCount() {
    AppState.quiz.currentErrorCount = 0;
    AppState.quiz.answerRevealed = false;
    console.log('错误次数已重置');
}

// 获取当前状态
export function getCurrentErrorStatus() {
    if (!AppState.quiz.errorLimitEnabled) {
        return {
            enabled: false,
            current: 0,
            allowed: 0
        };
    }

    return {
        enabled: true,
        current: AppState.quiz.currentErrorCount,
        allowed: AppState.quiz.allowedErrorCount
    };
}

export const getErrorStatus = getCurrentErrorStatus;
