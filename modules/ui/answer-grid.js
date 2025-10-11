import { AppState } from '../core/state.js';
import { KEY_SCALES } from '../core/constants.js';
import { checkAnswer } from '../quiz/manager.js';
import { getNoteDegree, getSolfegeName, isAccidentalNote } from '../utils/helpers.js';
import AppGlobal from '../core/app.js';
// 渲染答题按钮
function renderAnswerButtons(scaleNotes, difficulty) {
  if (!AppState.dom.ansArea) return;
  
  AppState.dom.ansArea.innerHTML = '';
  AppState.dom.ansArea.classList.remove('notes-8', 'notes-13');

  let buttons;
  const key = AppState.quiz.currentKey;
  
  const getCurrentRange = AppGlobal.getTool('getCurrentRange');
  const currentRange = getCurrentRange ? getCurrentRange() : ['C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3'];
  const isLowRange = currentRange[0] === 'C3';
  
  if (difficulty === 'basic') {
    let baseScale = KEY_SCALES[key]?.basic || KEY_SCALES.C.basic;
    buttons = isLowRange ? baseScale : adjustScaleOctave(baseScale, 1);
    AppState.dom.ansArea.classList.add('notes-8');
  } else {
    let extendedScale = KEY_SCALES[key]?.extended || KEY_SCALES.C.extended;
    buttons = isLowRange ? extendedScale : adjustScaleOctave(extendedScale, 1);
    AppState.dom.ansArea.classList.add('notes-13');
  }
  
  // 直接定义显示名称
  const displayNames = difficulty === 'basic' 
    ? ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si', 'Do']
    : ['Do', '#Do', 'Re', '#Re', 'Mi', 'Fa', '#Fa', 'Sol', '#Sol', 'La', '#La', 'Si', 'Do'];
  
  buttons.forEach((noteName, index) => {
    const btn = document.createElement('button');
    btn.className = 'key-btn';
    
    const isAccidental = isAccidentalNote(noteName);
    const displayName = displayNames[index];
    
    // 设置数据属性
    btn.dataset.noteName = noteName;
    btn.dataset.index = index;
    
    // 设置显示内容
    btn.textContent = displayName;
    
    // 添加样式类
    if (isAccidental) {
      btn.classList.add('accidental');
    } else {
      btn.classList.add('natural');
    }
    
    btn.onclick = () => checkAnswer(btn, index);
    AppState.dom.ansArea.appendChild(btn);
  });
  
  setTimeout(() => {
    adjustAnswerAreaScale();
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

// 答题区自适应缩放函数
function adjustAnswerAreaScale() {
    const ansArea = document.getElementById('ans');
    const transformWrapper = document.getElementById('answerTransformWrapper');
    const scalingContainer = document.getElementById('answerScalingContainer');
    const centralContainer = document.querySelector('.central-container');
    const mainContent = document.querySelector('.main-content');
    
    if (!ansArea || !transformWrapper || !scalingContainer || !centralContainer || !mainContent) {
        setTimeout(adjustAnswerAreaScale, 500);
        return;
    }
    
    // 如果答题区为空或隐藏，跳过缩放
    if (!ansArea.children.length || ansArea.style.display === 'none') {
        return;
    }
    
    try {
        // 确保容器没有高度限制
        scalingContainer.style.maxHeight = 'none';
        scalingContainer.style.height = 'auto';
        scalingContainer.style.overflow = 'visible';
        
        // 重置缩放以测量真实尺寸
        transformWrapper.style.transform = 'scale(1)';
        
        // 强制重排以获取准确尺寸
        ansArea.offsetHeight;
        
        // 获取答题区真实尺寸
        const originalHeight = ansArea.offsetHeight;
        const originalWidth = ansArea.offsetWidth;
        
        // 计算可用空间时减去更大的安全边距
        const mainContentRect = mainContent.getBoundingClientRect();
        const mainContentPadding = 20; // main-content 的 padding
        
        // 计算中央容器的可用空间（减去更大的安全边距）
        const centralRect = centralContainer.getBoundingClientRect();
        const containerTop = scalingContainer.offsetTop - centralContainer.offsetTop;
        
        // 关键修改：使用更大的安全边距（40px或45px）
        const safetyMargin = 45; // 尝试40px或45px
        const availableHeight = centralRect.height - containerTop - mainContentPadding - safetyMargin;
        
        console.log('答题区原始尺寸:', originalHeight, 'x', originalWidth);
        console.log('可用高度（已减去' + safetyMargin + 'px安全边距）:', availableHeight);
        
        // 如果空间充足，不需要缩放
        if (availableHeight >= originalHeight && availableHeight > 100) {
            console.log('空间充足，使用原始尺寸');
            transformWrapper.style.transform = 'scale(1)';
            return 1;
        }
        
        // 需要缩放的情况
        if (availableHeight > 80 && originalHeight > 0) {
            // 计算缩放比例，使用更保守的计算
            const scale = Math.min((availableHeight - 5) / originalHeight, 1); // 只留5px额外边距
            
            // 设置合理的缩放限制
            const minScale = 0.45;
            const finalScale = Math.max(scale, minScale);
            
            console.log(`应用缩放: ${Math.round(finalScale * 100)}%`);
            transformWrapper.style.transform = `scale(${finalScale})`;
            
            return finalScale;
        }
        
        // 如果空间太小，使用最小缩放
        console.log('空间过小，使用最小缩放');
        transformWrapper.style.transform = `scale(0.45)`;
        return 0.45;
        
    } catch (error) {
        console.error('答题区缩放失败:', error);
    }
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
  const ansArea = document.getElementById('ans');
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
        initAnswerScalingObserver();
        adjustAnswerAreaScale();
      }, 300);
    });
  } else {
    setTimeout(() => {
      initResizeHandler();
      initAnswerScalingObserver();
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

export {
    renderAnswerButtons,
    adjustAnswerAreaScale,
    initScalingSystem,
    forceRefreshScale,
    getScaleInfo,
    initAnswerScalingObserver,
    initResizeHandler
};