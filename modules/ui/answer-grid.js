// modules/ui/answer-grid.js
import { AppState } from '../core/state.js';
import { KEY_SCALES } from '../core/constants.js';
import { isAccidentalNote } from '../utils/helpers.js';
import { handleWrongAnswer, shouldRevealAnswer, getErrorStatus } from '../quiz/error-limit-manager.js';
import AppGlobal from '../core/app.js';

let MIN_ANS_HEIGHT = 200;

// 简单的DOM获取辅助函数
function getAnsArea() {
    return document.getElementById('ans');
}

function getMsgDisplay() {
    return document.getElementById('msg');
}

// 渲染答题按钮
function renderAnswerButtons(scaleNotes, difficulty) {
    const ansArea = getAnsArea();
    if (!ansArea) return;
    
    ansArea.innerHTML = '';
    ansArea.classList.remove('notes-8', 'notes-13');

    // 根据当前状态设置禁用类
    if (!AppState.quiz.hasStarted || AppState.quiz.answered) {
        ansArea.classList.add('disabled');
    } else {
        ansArea.classList.remove('disabled');
    }

    let buttons;
    const key = AppState.quiz.currentKey;
    
    const getCurrentRangeFunc = AppGlobal.getTool('getCurrentRange');
    const currentRange = getCurrentRangeFunc ? getCurrentRangeFunc() : ['C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3'];
    const isLowRange = currentRange[0] === 'C3';
    
    if (difficulty === 'basic') {
        let baseScale = KEY_SCALES[key]?.basic || KEY_SCALES.C.basic;
        buttons = isLowRange ? baseScale : adjustScaleOctave(baseScale, 1);
        ansArea.classList.add('notes-8');
    } else {
        let extendedScale = KEY_SCALES[key]?.extended || KEY_SCALES.C.extended;
        buttons = isLowRange ? extendedScale : adjustScaleOctave(extendedScale, 1);
        ansArea.classList.add('notes-13');
    }
    
    // 直接定义显示名称
    const displayNames = difficulty === 'basic' 
        ? ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do']
        : ['Do', '#Do', 'Re', '#Re', 'Mi', 'Fa', '#Fa', 'Sol', '#Sol', 'La', '#La', 'Si', 'Do'];
    
    // 使用工具箱获取 checkAnswer 函数
    const checkAnswerFunc = AppGlobal.getTool('checkAnswer');
    
    buttons.forEach((noteName, index) => {
        const btn = document.createElement('button');
        btn.className = 'key-btn';
        
        const isAccidental = isAccidentalNote(noteName);
        const displayName = displayNames[index];
        
        // 设置数据属性
        btn.dataset.noteName = noteName;
        btn.dataset.index = index;
        btn.textContent = displayName;
        
        // 添加样式类
        if (isAccidental) {
            btn.classList.add('accidental');
        } else {
            btn.classList.add('natural');
        }
        
        // 标记最后一行按钮（8键：7-8，13键：13）
        const isLastRowBtn = 
            (difficulty === 'basic' && index >= 6) ||    // 8键的最后2个按钮
            (difficulty === 'extended' && index === 12); // 13键的最后1个按钮
        
        if (isLastRowBtn) {
            btn.classList.add('last-row-btn');
        }
        
        // 使用工具箱的 checkAnswer 函数
        btn.onclick = () => {
            if (checkAnswerFunc) {
                checkAnswerFunc(btn, index);
            } else {
                console.error('checkAnswer 工具未找到');
            }
        };
        
        ansArea.appendChild(btn);
      });
    
    // 使用工具箱的缩放函数
    const adjustScaleFunc = AppGlobal.getTool('adjustAnswerAreaScale');
    setTimeout(() => {
        adjustScaleFunc?.();
    }, 50);
    
}

// 调整整个音阶的八度
function adjustScaleOctave(scale, octaveShift) {
    return scale.map(note => {
        const noteBase = note.replace(/\d/g, '');
        const octave = parseInt(note.match(/\d+/)) || 4;
        const newOctave = octave + octaveShift;
        return noteBase + newOctave;
    });
}

// 窗口大小变化时重新缩放
function initResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            adjustAnswerAreaScale();
        }, 150);
    });
}

// 监听答题区变化
function initAnswerScalingObserver() {
    const ansArea = getAnsArea();
    if (!ansArea) {
        setTimeout(initAnswerScalingObserver, 200);
        return;
    }
    
    const observer = new MutationObserver(() => {
        setTimeout(adjustAnswerAreaScale, 50);
    });
    
    observer.observe(ansArea, { 
        childList: true, 
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
    });
}

// 强制刷新缩放（用于特殊情况下手动调用）
function forceRefreshScale() {
    setTimeout(() => {
        adjustAnswerAreaScale();
    }, 100);
}

// 初始化缩放系统
function initScalingSystem() {
    // 等待DOM完全加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
                initResizeHandler();
                adjustAnswerAreaScale();
            }, 300);
        });
    } else {
        setTimeout(() => {
            initResizeHandler();
            adjustAnswerAreaScale();
        }, 300);
    }
}

// 获取当前缩放信息（用于调试）
function getScaleInfo() {
    const transformWrapper = document.getElementById('answerTransformWrapper');
    const textScale = getComputedStyle(document.documentElement).getPropertyValue('--text-scale') || 1;
    
    if (transformWrapper) {
        const transform = transformWrapper.style.transform;
        const scaleMatch = transform.match(/scale\(([^)]+)\)/);
        const scaleValue = scaleMatch ? parseFloat(scaleMatch[1]) : 1;
        
        return {
            containerScale: scaleValue,
            textScale: parseFloat(textScale),
            transform: transform
        };
    }
    
    return { containerScale: 1, textScale: 1, transform: 'none' };
}

// 视觉反馈系统
function addVisualFeedback(noteName, feedbackType) {
    // 🔴 增强检查：在添加效果前检查复位状态
    if (AppState.quiz.fromReset || AppState.audio.shouldStop) {
        console.log('复位状态中，跳过视觉反馈');
        return;
    }
    
    const ansArea = getAnsArea();
    if (!ansArea) return;
    
    const buttons = ansArea.querySelectorAll('.key-btn');
    
    // 清除所有现有的反馈类
    buttons.forEach(btn => {
        btn.classList.remove('scale-playing', 'reference-playing', 'target-playing');
    });
    
    // 🔴 再次检查复位状态
    if (AppState.quiz.fromReset || AppState.audio.shouldStop) return;
    
    if (feedbackType === 'target') {
        // 目标音：所有按键闪烁蓝色
        buttons.forEach(btn => {
            if (!AppState.quiz.fromReset && !AppState.audio.shouldStop) {
                btn.classList.add('target-playing');
            }
        });
    } else {
        // 音阶或基准音：找到对应的按键
        const targetButton = Array.from(buttons).find(btn => 
            btn.dataset.noteName === noteName
        );
        
        if (targetButton && !AppState.quiz.fromReset && !AppState.audio.shouldStop) {
            if (feedbackType === 'scale') {
                targetButton.classList.add('scale-playing');
            } else if (feedbackType === 'reference') {
                targetButton.classList.add('reference-playing');
            }
        }
    }
    
    // 设置定时器清除反馈，但检查复位状态
    if (!AppState.quiz.fromReset && !AppState.audio.shouldStop) {
        const feedbackTimer = setTimeout(() => {
            if (!AppState.quiz.fromReset && !AppState.audio.shouldStop) {
                buttons.forEach(btn => {
                    btn.classList.remove('scale-playing', 'reference-playing', 'target-playing');
                });
            }
        }, 500);
        
        // 保存定时器引用以便复位时清除
        window.visualFeedbackTimer = feedbackTimer;
    }
}

// 清除所有视觉反馈
function clearVisualFeedback() {
    const ansArea = getAnsArea();
    if (!ansArea) return;
    
    const buttons = ansArea.querySelectorAll('.key-btn');
    buttons.forEach(btn => {
        // 清除所有播放相关的视觉反馈
        btn.classList.remove(
            'scale-playing', 
            'reference-playing', 
            'target-playing',
            'pulse-animation',
            'glow-effect'
        );
        
        // 重置所有样式
        btn.style.backgroundColor = '';
        btn.style.borderColor = '';
        btn.style.boxShadow = '';
        btn.style.transform = '';
        btn.style.opacity = '';
        
        // 清除答题状态（但保持禁用状态）
        if (!btn.classList.contains('hit') && !btn.classList.contains('miss')) {
            btn.classList.remove('hit', 'miss');
        }
    });
}

function refreshMinHeight() {
    // 窄屏幕允许更小
    MIN_ANS_HEIGHT = window.innerWidth < 900 ? 160 : 200;
    document.documentElement.style.setProperty('--ans-min-height', `${MIN_ANS_HEIGHT}px`);
}

function adjustAnswerAreaScale() {
    const bar = document.getElementById('desktopStatusBar');
    const st = bar ? bar.offsetHeight : 0;
    const ansArea = getAnsArea();

    if (!ansArea) return;

    // 可用空间计算
    const headerH = document.querySelector('.daw-header')?.offsetHeight || 60;
    const msgH = getMsgDisplay()?.offsetHeight || 36;
    const topFixed = headerH + msgH + 20;
    const availH = window.innerHeight - topFixed - st;

    // 答题区自然高度
    const naturalH = ansArea.offsetHeight;

    // 直接缩放，不处理滚动
    if (naturalH > availH) {
        const scale = availH / naturalH;
        ansArea.style.transform = `scale(${scale})`;
    } else {
        ansArea.style.transform = 'none';
    }
}

// 答题区初始化函数
function initAnswerArea() {
    const ansArea = getAnsArea();
    if (!ansArea) {
        console.warn('答题区元素未找到，延迟初始化');
        setTimeout(initAnswerArea, 100);
        return;
    }

    // 只设置必要的类和属性，不设置内联样式
    ansArea.style.display = 'grid';
    ansArea.classList.add('disabled');
    
    // 清除所有按钮状态，不设置内联样式
    const buttons = ansArea.querySelectorAll('.key-btn');
    buttons.forEach(btn => {
        btn.classList.remove('hit', 'miss', 'scale-playing', 'reference-playing', 'target-playing');
        btn.disabled = true; // 只设置属性，样式由CSS控制
    });

    // 其他初始化代码保持不变...
    const difficulty = document.getElementById('difficultySelect')?.value || 'basic';
    const key = document.getElementById('keySelect')?.value || 'C';

    let scale;
    if (difficulty === 'basic') {
        scale = KEY_SCALES[key]?.basic || KEY_SCALES.C.basic;
    } else {
        scale = KEY_SCALES[key]?.extended || KEY_SCALES.C.extended;
    }

    if (!scale || scale.length === 0) {
        console.error('无法获取音阶数据，使用默认C大调');
        scale = KEY_SCALES.C.basic;
    }

    try {
        const renderFunction = AppGlobal.getTool('renderAnswerButtons');
        const disableFunction = AppGlobal.getTool('disableAnswerButtons');

        if (renderFunction) {
            renderFunction(scale, difficulty);
        }
        if (disableFunction) {
            disableFunction();
        }

        setTimeout(() => {
            forceRefreshScale();
        }, 200);
        
    } catch (error) {
        console.error('答题区初始化失败:', error);
    }
}

export {
    renderAnswerButtons,
    initScalingSystem,
    forceRefreshScale,
    getScaleInfo,
    initAnswerScalingObserver,
    initResizeHandler,
    addVisualFeedback,
    clearVisualFeedback,
    adjustAnswerAreaScale,
    refreshMinHeight,
    initAnswerArea
};