// modules/quiz/manager.js
import { AppState } from '../core/state.js';
import { UI_TEXT, KEY_SCALES, NOTE_FREQUENCIES } from '../core/constants.js';
import { updateBigButtonState, updateResetButtonState } from '../ui/buttons.js';
import { playNoteSampler, ensureAudioContextReady, stopAllAudio, stopPlayback } from '../audio/engine.js';
import { playSFX } from '../audio/sfx.js';
import { resetAnswerInfo } from '../ui/panel-manager.js';
import { 
  showAnswerFeedback, 
  hideAllWelcomeOverlays, 
  updateModeButtonsVisualState, 
  updateAnswerAreaState,
  disableAnswerButtons,
  syncButtonStates,
  enableAnswerButtons,
  updateIntervalDisplayInfo,
  showUkulelePositions,
  updateCurrentPitchDisplay
} from '../ui/feedback.js';
import { addToHistory, updateRightPanelStats } from './history.js';
import { getANoteForKey, calculateIntervalType, getBaseNote } from '../utils/helpers.js';
import { renderAnswerButtons } from '../ui/answer-grid.js';
import { getCurrentRange } from '../ui/range-manager.js';

// 导入统计管理器
import statsManager from './stats-manager.js';

// 导入工具箱
import AppGlobal from '../core/app.js';

// 答题区渲染
async function playQuizSequence(isReplay = false) {
    // 使用工具箱获取函数
    const hideOverlays = AppGlobal.getTool('hideAllWelcomeOverlays') || hideAllWelcomeOverlays;
    const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState') || updateModeButtonsVisualState;
    const updateAnswerState = AppGlobal.getTool('updateAnswerAreaState') || updateAnswerAreaState;
    const disableButtons = AppGlobal.getTool('disableAnswerButtons') || disableAnswerButtons;
    const enableButtons = AppGlobal.getTool('enableAnswerButtons') || enableAnswerButtons;
    const syncButtons = AppGlobal.getTool('syncButtonStates') || syncButtonStates;
    const updateIntervalDisplay = AppGlobal.getTool('updateIntervalDisplayInfo') || updateIntervalDisplayInfo;
    const showUkulele = AppGlobal.getTool('showUkulelePositions') || showUkulelePositions;
    const updatePitch = AppGlobal.getTool('updateCurrentPitchDisplay') || updateCurrentPitchDisplay;
    const renderFunc = AppGlobal.getTool('renderAnswerButtons') || renderAnswerButtons;
if (!isReplay && window.applyPendingRangeChange) {
        const rangeChanged = window.applyPendingRangeChange();
    }
    
    // 原有代码继续...
    if (AppState.ui.firstPlay && !isReplay) {
      AppState.ui.firstPlay = false;
      hideOverlays();
    }
    
    updateModeVisuals();
    
    /* ---------- 1. 新题目：先更新调号与基准音 ---------- */
    if (!isReplay) {
    if (statsManager && typeof statsManager.cancelCurrentQuestion === 'function') {
    statsManager.cancelCurrentQuestion();
    }
   statsManager.recordNewQuestion();
   
  // 保存出题时的基准音模式
  const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
  AppState.quiz.questionBaseMode = baseMode;
  
  const newKey = document.getElementById('keySelect')?.value || 'C';
  AppState.quiz.currentKey = newKey;
  AppState.quiz.hasStarted = true;
  AppState.quiz.answered = false;
  
  // 重置当前题目的尝试状态
  AppState.quiz.hasAnsweredCurrent = false;
  AppState.quiz.attemptCount = 0;
  
  // 使用工具箱重置答案信息
  const resetInfo = AppGlobal.getTool('resetAnswerInfo') || resetAnswerInfo;
  resetInfo();

  const degreeElement = document.getElementById('currentDegree');

  /* 让基准音随调号和音域走 */
  const currentRange = getCurrentRange();
  const isLowRange = currentRange[0] === 'C3';
  
  if (baseMode === 'c') {
    // 固定C模式
    const baseScale = KEY_SCALES[newKey]?.basic || KEY_SCALES.C.basic;
    AppState.quiz.fixedCNote = isLowRange ? baseScale[0] : adjustOctave(baseScale[0], 1);
    AppState.quiz.fixedANote = isLowRange ? 'A3' : 'A4';
  } else {
    // 固定A模式
    const baseScale = KEY_SCALES[newKey]?.basic || KEY_SCALES.C.basic;
    AppState.quiz.fixedCNote = isLowRange ? baseScale[0] : adjustOctave(baseScale[0], 1);
    AppState.quiz.fixedANote = isLowRange ? 'A3' : 'A4';
  }
}
  
    /* ---------- 2. 音频就绪检查 ---------- */
    const audioReady = await ensureAudioContextReady();
    if (!audioReady) {
      if (AppState.dom.msgDisplay) AppState.dom.msgDisplay.textContent = '音频未就绪，请点击页面激活';
      AppState.quiz.locked = false;
      // 解锁基准音按钮
      const modeButtons = document.querySelectorAll('.mode-btn');
      modeButtons.forEach(btn => {
        btn.disabled = false;
      });
      updateResetButtonState();
      return;
    }
  
    AppState.quiz.locked = true;
    AppState.audio.isPlaying = true;
    updateAnswerState();
    updateResetButtonState();
    updateBigButtonState();
    disableButtons();
  
    try {
      const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
      const enableScale = document.getElementById('enableScalePlayback')?.checked ?? true;
  const currentRange = getCurrentRange();

      if (!isReplay) {
        AppState.quiz.currentDifficulty = document.getElementById('difficultySelect')?.value || 'basic';
      }
  
      const key = AppState.quiz.currentKey;
      const difficulty = AppState.quiz.currentDifficulty;
   
      
      // 根据当前音域获取对应的音阶
      const naturalScale = getScaleForRange(KEY_SCALES[key]?.basic || KEY_SCALES.C.basic, currentRange);
      const fullScale = getScaleForRange(KEY_SCALES[key]?.extended || KEY_SCALES.C.extended, currentRange);
  
      /* 取已存好的动态基准音 */
      const baseNote = getQuestionBaseNote();
      if (!isReplay) {
        AppState.quiz.currentScale = difficulty === 'basic' ? naturalScale : fullScale;
      }
  
      /* ---------- 3. 播放流程 ---------- */
      const eighthNote = 0.5, quarterNote = 1.0, noteInterval = 120;
  
      if (!isReplay) {
        updatePitch('--', null);
        const targetScale = difficulty === 'basic' ? naturalScale : fullScale;
        const targetIndex = Math.floor(Math.random() * targetScale.length);
        AppState.quiz.currentTargetNote = targetScale[targetIndex];
        AppState.quiz.currentNoteIdx = targetIndex;
        AppState.quiz.answered = false;
  
        if (AppState.dom.ansArea) {
          AppState.dom.ansArea.style.display = 'grid';
          renderFunc(targetScale, difficulty);
          disableButtons();
        }
      } else {
        if (AppState.dom.ansArea) {
          AppState.dom.ansArea.style.display = 'grid';
          renderFunc(AppState.quiz.currentScale, AppState.quiz.currentDifficulty);
          disableButtons();
        }
      }
  
      if (AppState.audio.shouldStop) { 
        AppState.audio.shouldStop = false; 
        updateResetButtonState(); 
        return; 
      }
  
      if ((!isReplay || enableScale) && enableScale) {
        if (AppState.dom.mainBtn) AppState.dom.mainBtn.textContent = UI_TEXT.PLAYING_SCALE;
        updateBigButtonState();
        if (AppState.dom.msgDisplay) AppState.dom.msgDisplay.textContent = UI_TEXT.PLAYING_SCALE;
        AppState.audio.isPlaying = true; 
        updateAnswerState();
        
        for (const note of naturalScale) {
          if (AppState.audio.shouldStop) break;
          await playNoteSampler(note, eighthNote);
          if (AppState.audio.shouldStop) break;
          await new Promise(resolve => setTimeout(resolve, noteInterval));
        }
        
        if (!AppState.audio.shouldStop) await new Promise(resolve => setTimeout(resolve, 300));
      }
  
      if (AppState.audio.shouldStop) { 
        AppState.audio.shouldStop = false; 
        updateResetButtonState(); 
        return; 
      }
  
      /* 播放基准音 */
      if (AppState.dom.mainBtn) AppState.dom.mainBtn.textContent = UI_TEXT.PLAYING_REFERENCE;
      updateBigButtonState();
      if (AppState.dom.msgDisplay) AppState.dom.msgDisplay.textContent = UI_TEXT.PLAYING_REFERENCE;
      AppState.audio.isPlaying = true; 
      updateAnswerState();
      
      await playNoteSampler(baseNote, quarterNote);
      if (AppState.audio.shouldStop) { 
        updateResetButtonState(); 
        return; 
      }
      await new Promise(resolve => setTimeout(resolve, noteInterval));
      
      await playNoteSampler(baseNote, quarterNote);
      if (AppState.audio.shouldStop) { 
        updateResetButtonState(); 
        return; 
      }
      await new Promise(resolve => setTimeout(resolve, noteInterval));
  
      if (AppState.audio.shouldStop) { 
        AppState.audio.shouldStop = false; 
        updateResetButtonState(); 
        return; 
      }
  
      /* 播放目标音 */
      disableButtons();
      
      if (AppState.dom.mainBtn) {
        AppState.dom.mainBtn.textContent = isReplay ? UI_TEXT.REPLAYING_TARGET : UI_TEXT.PLAYING_TARGET;
      }
      updateBigButtonState();
      
      if (AppState.dom.msgDisplay) {
        AppState.dom.msgDisplay.textContent = isReplay ? UI_TEXT.REPLAYING_TARGET : UI_TEXT.PLAYING_TARGET;
      }
      
      AppState.audio.isPlaying = true; 
      updateAnswerState();
      
      await playNoteSampler(AppState.quiz.currentTargetNote, quarterNote);
      enableButtons();
  
      if (AppState.dom.mainBtn) {
        AppState.dom.mainBtn.textContent = UI_TEXT.REPLAY;
        updateBigButtonState();
      }
      
      AppState.quiz.hasStarted = true;
      AppState.quiz.isReplayMode = isReplay;
  
    } catch (error) {
      console.error('播放序列错误:', error);
      if (AppState.dom.msgDisplay) {
        AppState.dom.msgDisplay.textContent = '播放出错，请重试';
      }
    } finally {
      AppState.quiz.locked = false;
      AppState.audio.isPlaying = false; 
      updateModeVisuals();
      updateAnswerState();
      updateResetButtonState();
      updateBigButtonState();
      syncButtons();
      
      if (AppState.dom.msgDisplay && !AppState.quiz.answered) {
        AppState.dom.msgDisplay.textContent = '请选择你听到的音高';
      }
    }
}

// 根据音域获取对应的基准音
function getBaseNoteForRange(baseMode, key, currentRange) {
  const isLowRange = currentRange[0].includes('3'); // 判断是否是小字组音域
  
  console.log('getBaseNoteForRange 调试:');
  console.log('baseMode:', baseMode, 'key:', key, 'isLowRange:', isLowRange);
  
  if (baseMode === 'c') {
    // 固定C模式：使用当前调性的主音
    const cNote = KEY_SCALES[key]?.basic[0] || 'C3';
    console.log('C基准音原始:', cNote);
    const result = isLowRange ? cNote : adjustOctave(cNote, 1); // 小字组保持，小字1组升八度
    console.log('C基准音调整后:', result);
    return result;
  } else {
    // 固定A模式
    const aNote = getANoteForKey(key);
    console.log('A基准音原始:', aNote);
    // 修正：小字组应该比A4低一个八度得到A3，小字1组保持A4
    const result = isLowRange ? adjustOctave(aNote, -1) : aNote;
    console.log('A基准音调整后:', result);
    return result;
  }
}

// 调整音符的八度
function adjustOctave(noteName, octaveShift) {
  const noteBase = noteName.replace(/\d/g, '');
  const octave = parseInt(noteName.match(/\d+/)) || 4;
  const newOctave = octave + octaveShift;
  return noteBase + newOctave;
}

// 根据音域获取对应的音阶
function getScaleForRange(scale, currentRange) {
  const isLowRange = currentRange[0] === 'C3';
  
  if (isLowRange) {
    // 小字组音域：保持原音阶（已经是小字组）
    return scale;
  } else {
    // 小字1组音域：将音阶整体升八度
    const adjustedScale = scale.map(note => adjustOctave(note, 1));
    return adjustedScale;
  }
}

// 检查答案

function checkAnswer(btn, selectedIndex) {
    if (btn.classList.contains('hit') || btn.classList.contains('miss') || AppState.quiz.answered) return;
    
    // 使用工具箱获取函数
    const showFeedback = AppGlobal.getTool('showAnswerFeedback') || showAnswerFeedback;
    const disableButtons = AppGlobal.getTool('disableAnswerButtons') || disableAnswerButtons;
    const syncButtons = AppGlobal.getTool('syncButtonStates') || syncButtonStates;
    const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState') || updateModeButtonsVisualState;
    const updateIntervalDisplay = AppGlobal.getTool('updateIntervalDisplayInfo') || updateIntervalDisplayInfo;
    const showUkulele = AppGlobal.getTool('showUkulelePositions') || showUkulelePositions;
    const updatePitch = AppGlobal.getTool('updateCurrentPitchDisplay') || updateCurrentPitchDisplay;
    const addHistory = AppGlobal.getTool('addToHistory') || addToHistory;
    const updateStats = AppGlobal.getTool('updateRightPanelStats') || updateRightPanelStats;
    const showCards = AppGlobal.getTool('showInfoCards') || showInfoCards;
    const hideCards = AppGlobal.getTool('hideInfoCards') || hideInfoCards;
    const resetInfo = AppGlobal.getTool('resetAnswerInfo') || resetAnswerInfo;
    
    const isCorrect = selectedIndex === AppState.quiz.currentNoteIdx;
    
    // 🔴 关键修复：正确判断是否是第一次尝试
    const isFirstAttempt = !AppState.quiz.hasAnsweredCurrent && AppState.quiz.attemptCount === 0;
    
    if (AppState.dom.msgDisplay) {
        AppState.dom.msgDisplay.textContent = isCorrect ? '回答正确！' : '回答错误，请重试';
    }

    btn.classList.add(isCorrect ? 'hit' : 'miss');

    // 如果是正确答案，暂时移除disabled状态以确保样式显示
    if (isCorrect) {
        btn.disabled = false;
        setTimeout(() => {
            btn.disabled = true;
        }, 500);
    }

    playSFX(isCorrect ? 'ok' : 'fail');
    showFeedback(isCorrect);

    // 答对后禁用复位
    if (isCorrect) {
        AppState.quiz.canReset = false;
        updateResetButtonState();
    }

    // 答对后禁用所有答题按钮
    if (isCorrect) {
        disableButtons();
    }
    
    syncButtons();
    
    // 获取所有统计参数
    const difficulty = document.getElementById('difficultySelect')?.value || 'basic';
    const key = document.getElementById('keySelect')?.value || 'C';
    const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
    const userAnswerNote = getNoteNameFromIndex(selectedIndex, difficulty, key);

// 使用统计管理器记录答案
statsManager.recordAnswer(isCorrect, isFirstAttempt, userAnswerNote, baseMode, key, difficulty);

// 更新右侧面板统计
if (typeof updateRightPanelStats === 'function') {
    updateRightPanelStats();
} else {
    console.error('❌ updateRightPanelStats 不可用');
}

  
    // 更新历史记录
    addHistory(userAnswerNote, isCorrect);
    // 答对后的处理
    if (isCorrect) {
        AppState.quiz.answered = true;
        AppState.quiz.hasAnsweredCurrent = true; // 标记当前题目已回答

        if (AppState.quiz.currentTargetNote) {
            const frequency = NOTE_FREQUENCIES[AppState.quiz.currentTargetNote];
            // 回答正确后更新显示完整信息
            updatePitch(AppState.quiz.currentTargetNote, frequency);
        }
        
        // 显示音程信息 - 使用出题时的基准音模式，而不是当前选择的
        const currentKey = AppState.quiz.currentKey || 'C';
        const baseNote = getQuestionBaseNote();
        const targetNote = AppState.quiz.currentTargetNote;
        const intervalType = calculateIntervalType(baseNote, targetNote);
        
        // 显示音程信息
        if (intervalType) {
            updateIntervalDisplay(baseNote, targetNote, intervalType);
        }
        
        // 显示尤克里里指位信息
        showUkulele(AppState.quiz.currentTargetNote);
        
        // 回答正确后立即解锁音级更新
        AppState.quiz.shouldUpdateDegree = true;
        
        // 解锁调性选择和基准音选择（答题已完成）
        AppState.quiz.hasStarted = false;
        updateModeVisuals();
        
        // 重置当前题目的尝试状态（为下一题准备）
        AppState.quiz.attemptCount = 0;
        
        // 答对后立即处理，不设置定时器
        stopPlayback();
        if (AppState.dom.mainBtn) {
            AppState.dom.mainBtn.textContent = UI_TEXT.NEXT;
            updateBigButtonState();
        }
        updateResetButtonState();
        
        // 只有在开启自动下一题时才自动跳转
        const autoNextEnabled = document.getElementById('autoNextCheckbox')?.checked;
        if (autoNextEnabled && AppState.dom.mainBtn) {
            const displayTime = parseInt(document.getElementById('infoDisplayTime')?.value || '6');
            
            console.log('设置信息显示时长:', displayTime + '秒');
            
            // 清除之前的定时器（如果有）
            if (AppState.quiz.autoNextTimer) {
                clearTimeout(AppState.quiz.autoNextTimer);
            }
            
            // 显示信息卡片
            if (showCards) {
                showCards();
            }
            
            // 设置新的定时器
            AppState.quiz.autoNextTimer = setTimeout(() => {
                console.log('信息显示时长结束，检查是否进入下一题');
                
                // 检查是否仍然处于已回答状态
                if (AppState.quiz.answered && AppState.dom.mainBtn.textContent === UI_TEXT.NEXT) {
                    if (resetInfo) {
                        resetInfo();
                    }
                    if (hideCards) {
                        hideCards();
                    }
                    
                    // 重置当前题目的状态，为下一题准备
                    AppState.quiz.hasAnsweredCurrent = false;
                    
                    AppState.dom.mainBtn.click();
                    console.log('进入下一题');
                } else {
                    console.log('状态已改变，取消自动下一题');
                }
                
                AppState.quiz.autoNextTimer = null;
            }, displayTime * 1000);
        } else {
            if (AppState.dom.msgDisplay) {
                AppState.dom.msgDisplay.textContent = '回答正确！点击"下一题"继续';
            }
        }

        syncButtons();
        updateModeVisuals();
    } else {
        // 修复：答错处理 - 只增加尝试计数，不标记已回答
        if (!AppState.quiz.attemptCount) {
            AppState.quiz.attemptCount = 1;
        } else {
            AppState.quiz.attemptCount++;
        }
        
        // 只在当前是第一次答错时显示错误消息
        if (AppState.quiz.attemptCount === 1 && AppState.dom.msgDisplay) {
            AppState.dom.msgDisplay.textContent = '回答错误，请重试';
        }
    }
    
    // 只有答错时才在延迟后移除样式，答对保持显示
    if (!isCorrect) {
        setTimeout(() => {
            btn.classList.remove('hit', 'miss');
            syncButtons();
            updateModeVisuals();
        }, 800);
    }
}

/**
 * 处理答对后的逻辑
 */
function handleCorrectAnswer() {
    stopPlayback();
    
    if (AppState.dom.mainBtn) {
        AppState.dom.mainBtn.textContent = UI_TEXT.NEXT;
        updateBigButtonState();
    }
    updateResetButtonState();
    
    // 只有在开启自动下一题时才自动跳转
    const autoNextEnabled = document.getElementById('autoNextCheckbox')?.checked;
    if (autoNextEnabled && AppState.dom.mainBtn) {
        const displayTime = parseInt(document.getElementById('infoDisplayTime')?.value || '6');
        
        console.log('设置信息显示时长:', displayTime + '秒');
        
        // 清除之前的定时器（如果有）
        if (AppState.quiz.autoNextTimer) {
            clearTimeout(AppState.quiz.autoNextTimer);
        }
        
        // 显示信息卡片
        if (showCards) {
            showCards();
        }
        
        // 设置新的定时器
        AppState.quiz.autoNextTimer = setTimeout(() => {
            console.log('信息显示时长结束，检查是否进入下一题');
            
            // 检查是否仍然处于已回答状态
            if (AppState.quiz.answered && AppState.dom.mainBtn.textContent === UI_TEXT.NEXT) {
                if (resetInfo) {
                    resetInfo();
                }
                if (hideCards) {
                    hideCards();
                }
                
                // 🔴 重置当前题目的状态，为下一题准备
                AppState.quiz.hasAnsweredCurrent = false;
                
                AppState.dom.mainBtn.click();
                console.log('进入下一题');
            } else {
                console.log('状态已改变，取消自动下一题');
            }
            
            AppState.quiz.autoNextTimer = null;
        }, displayTime * 1000);
    } else {
        if (AppState.dom.msgDisplay) {
            AppState.dom.msgDisplay.textContent = '回答正确！点击"下一题"继续';
        }
    }
    
    syncButtons();
    updateModeVisuals();
}

function getNoteNameFromIndex(index, difficulty, key) {
    if (difficulty === 'basic') {
      const scale = KEY_SCALES[key]?.basic || KEY_SCALES.C.basic;
      return scale[index] || 'C4';
    } else {
      const scale = KEY_SCALES[key]?.extended || KEY_SCALES.C.extended;
      return scale[index] || 'C4';
    }
}

// 新增辅助函数：根据索引获取音符类型
function getNoteTypeFromIndex(index, difficulty, key) {
    if (difficulty === 'basic') {
      return 'natural'; // 基础难度只有自然音级
    } else {
      // 扩展难度：检查是否是变化音级
      const scale = KEY_SCALES[key]?.extended || KEY_SCALES.C.extended;
      const note = scale[index];
      // 变化音级通常包含 # 或 b
      return note && (note.includes('#') || note.includes('b')) ? 'accidental' : 'natural';
    }
}

// 获取出题时的基准音
function getQuestionBaseNote() {
    const currentKey = AppState.quiz.currentKey || 'C';
    const baseMode = AppState.quiz.questionBaseMode || 'c';
    
    // 使用工具箱获取当前音域
    const getCurrentRange = AppGlobal.getTool('getCurrentRange');
    const currentRange = getCurrentRange ? getCurrentRange() : ['C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3'];
    const isLowRange = currentRange[0] === 'C3';
    
    if (baseMode === 'c') {
        // 固定C模式：根据音域调整八度
        const baseScale = KEY_SCALES[currentKey]?.basic || KEY_SCALES.C.basic;
        const cNote = baseScale[0]; // 例如 C3 或 C4
        return isLowRange ? cNote : adjustOctave(cNote, 1);
    } else {
        // 固定A模式：根据音域调整八度
        const aNote = getANoteForKey(currentKey); // 例如 A4
        return isLowRange ? adjustOctave(aNote, -1) : aNote; // A3 或 A4
    }
}

export {
    playQuizSequence,
    checkAnswer,
    getNoteNameFromIndex,
    getQuestionBaseNote,
};