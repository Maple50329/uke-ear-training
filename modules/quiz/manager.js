// modules/quiz/manager.js
import { AppState } from '../core/state.js';
import { UI_TEXT, KEY_SCALES, NOTE_FREQUENCIES } from '../core/constants.js';
import { updateBigButtonState, updateResetButtonState } from '../ui/buttons.js';
import { playNoteSampler, ensureAudioContextReady, stopPlayback } from '../audio/engine.js';
import { playSFX } from '../audio/sfx.js';
import { updateAllMessageDisplays } from '../ui/feedback.js';
import { addToHistory, updateRightPanelStats } from './history.js';
import { getANoteForKey, calculateIntervalType } from '../utils/helpers.js';

// 导入统计管理器
import statsManager from './stats-manager.js';

// 导入工具箱
import AppGlobal from '../core/app.js';

// 答题区渲染
async function playQuizSequence(isReplay = false) {

    const hideOverlays = AppGlobal.getTool('hideAllWelcomeOverlays');
    const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState');
    const updateAnswerState = AppGlobal.getTool('updateAnswerAreaState');
    const disableButtons = AppGlobal.getTool('disableAnswerButtons');
    const enableButtons = AppGlobal.getTool('enableAnswerButtons');
    const syncButtons = AppGlobal.getTool('syncButtonStates');
    const updatePitch = AppGlobal.getTool('updateCurrentPitchDisplay');
    const renderFunc = AppGlobal.getTool('renderAnswerButtons');
    const updateAllMessages = AppGlobal.getTool('updateAllMessageDisplays');
    const getCurrentRangeFunc = AppGlobal.getTool('getCurrentRange');
    const PendingChange = AppGlobal.getTool('applyPendingRangeChange');

    if (!isReplay && PendingChange) {
        const rangeChanged = PendingChange();
    }
    
    if (!isReplay && AppState.dom.ansArea) {
        const buttons = AppState.dom.ansArea.querySelectorAll('.key-btn');
        buttons.forEach(btn => {
            btn.classList.remove('hit', 'miss');
        });
    }

    if (AppState.ui.firstPlay && !isReplay) {
        AppState.ui.firstPlay = false;
        hideOverlays();
    }
    
    updateModeVisuals(); 
    if (!isReplay) {
        // 应用预选调性
        if (AppState.quiz.pendingKeyChange) {
            const newKey = AppState.quiz.pendingKeyChange;
            AppState.quiz.currentKey = newKey;
            AppState.quiz.pendingKeyChange = null;
            
            // 更新UI下拉框显示实际调性
            const keySelect = document.getElementById('keySelect');
            if (keySelect) keySelect.value = newKey;
        }
        
        // 应用预选基准音模式
        if (AppState.quiz.pendingBaseModeChange) {
            const newMode = AppState.quiz.pendingBaseModeChange;
            AppState.quiz.questionBaseMode = newMode;
            AppState.quiz.pendingBaseModeChange = null;
            
            // 更新UI按钮显示实际模式
            const modeButtons = document.querySelectorAll('.mode-btn');
            modeButtons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === newMode);
            });
        }
        // 应用预选难度
        if (AppState.quiz.pendingDifficultyChange) {
            const newDifficulty = AppState.quiz.pendingDifficultyChange;
            AppState.quiz.currentDifficulty = newDifficulty;
            AppState.quiz.pendingDifficultyChange = null;
            
            // 更新UI下拉框显示实际难度
            const difficultySelect = document.getElementById('difficultySelect');
            if (difficultySelect) difficultySelect.value = newDifficulty;

        }
    
    }

    /* ---------- 1. 新题目：先更新调号与基准音 ---------- */
    if (!isReplay) {
        if (statsManager && typeof statsManager.cancelCurrentQuestion === 'function') {
            statsManager.cancelCurrentQuestion();
        }
        statsManager.recordNewQuestion();
        
        // 保存出题时的基准音模式
        const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
        AppState.quiz.questionBaseMode = baseMode;
        
        window.dispatchEvent(new CustomEvent('base-mode-changed', {
            detail: { mode: baseMode }
        }));

        const newKey = document.getElementById('keySelect')?.value || 'C';
        AppState.quiz.currentKey = newKey;
        AppState.quiz.hasStarted = true;
        AppState.quiz.answered = false;
        
        // 重置当前题目的尝试状态
        AppState.quiz.hasAnsweredCurrent = false;
        AppState.quiz.attemptCount = 0;
        
        // 使用工具箱重置答案信息
        const resetInfo = AppGlobal.getTool('resetAnswerInfo');
        resetInfo();

        const degreeElement = document.getElementById('currentDegree');

        /* 让基准音随调号和音域走 */
        const currentRange = getCurrentRangeFunc();
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

        // 🔴 修复关键点：立即设置当前音阶和难度，并渲染答题按钮
        AppState.quiz.currentDifficulty = document.getElementById('difficultySelect')?.value || 'basic';
        const key = AppState.quiz.currentKey;
        const difficulty = AppState.quiz.currentDifficulty;
        
        // 根据当前音域获取对应的音阶
        const naturalScale = getScaleForRange(KEY_SCALES[key]?.basic || KEY_SCALES.C.basic, currentRange);
        const fullScale = getScaleForRange(KEY_SCALES[key]?.extended || KEY_SCALES.C.extended, currentRange);
        
        AppState.quiz.currentScale = difficulty === 'basic' ? naturalScale : fullScale;

        // 🔴 立即渲染答题按钮（新增这行代码）
        if (AppState.dom.ansArea && renderFunc) {
            AppState.dom.ansArea.style.display = 'grid';
            renderFunc(AppState.quiz.currentScale, AppState.quiz.currentDifficulty);
            disableButtons();
        }
    }
    
    /* ---------- 2. 音频就绪检查 ---------- */
    const audioReady = await ensureAudioContextReady();
    if (!audioReady) {
        updateAllMessages('音频未就绪，请点击页面激活');
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
        const currentRange = getCurrentRangeFunc();
        const key = AppState.quiz.currentKey;
        const difficulty = AppState.quiz.currentDifficulty;
        
        // 根据当前音域获取对应的音阶
        const naturalScale = getScaleForRange(KEY_SCALES[key]?.basic || KEY_SCALES.C.basic, currentRange);
        const fullScale = getScaleForRange(KEY_SCALES[key]?.extended || KEY_SCALES.C.extended, currentRange);
        
        /* 取已存好的动态基准音 */
        const baseNote = getQuestionBaseNote();
        
        // 🔴 确保使用已设置的音阶（移除这里的重复设置）
        // if (!isReplay) {
        //     AppState.quiz.currentScale = difficulty === 'basic' ? naturalScale : fullScale;
        // }
        
        /* ---------- 3. 播放流程 ---------- */
        const eighthNote = 0.5, quarterNote = 1.0, noteInterval = 120;
        
        if (!isReplay) {
            updatePitch('--', null);
            // 🔴 使用已经设置好的音阶
            const targetScale = AppState.quiz.currentScale;
            
            let targetIndex;
            let newTargetNote;
            let attempts = 0;
            const maxAttempts = 10; // 防止无限循环
            
            do {
                targetIndex = Math.floor(Math.random() * targetScale.length);
                newTargetNote = targetScale[targetIndex];
                attempts++;
            } while (
                // 避免与最近3题重复
                AppState.quiz.recentTargetNotes.includes(newTargetNote) && 
                targetScale.length > 3 && // 确保有足够的选择
                attempts < maxAttempts
            );
            
            AppState.quiz.currentTargetNote = newTargetNote;
            AppState.quiz.currentNoteIdx = targetIndex;
            AppState.quiz.answered = false;
            
            // 更新历史记录，只保留最近3个
            AppState.quiz.recentTargetNotes.unshift(newTargetNote);
            AppState.quiz.recentTargetNotes = AppState.quiz.recentTargetNotes.slice(0, 3);
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
            updateAllMessages(UI_TEXT.PLAYING_SCALE);
            AppState.audio.isPlaying = true; 
            updateAnswerState();
            
            for (const note of naturalScale) {
                if (AppState.audio.shouldStop) break;
                
                // 添加音阶播放的视觉反馈
                const addVisualFeedback = AppGlobal.getTool('addVisualFeedback');
                if (addVisualFeedback) {
                    addVisualFeedback(note, 'scale');
                }
                
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
        updateAllMessages(UI_TEXT.PLAYING_REFERENCE);
        AppState.audio.isPlaying = true; 
        updateAnswerState();
        
        // 第一次播放基准音
        const addVisualFeedback = AppGlobal.getTool('addVisualFeedback');
        if (addVisualFeedback) {
            addVisualFeedback(baseNote, 'reference');
        }
        
        await playNoteSampler(baseNote, quarterNote);
        if (AppState.audio.shouldStop) { 
            updateResetButtonState(); 
            return; 
        }
        await new Promise(resolve => setTimeout(resolve, noteInterval));
        
        // 第二次播放基准音
        if (addVisualFeedback) {
            addVisualFeedback(baseNote, 'reference');
        }
        
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
        
        updateAllMessages(isReplay ? UI_TEXT.REPLAYING_TARGET : UI_TEXT.PLAYING_TARGET);
        
        AppState.audio.isPlaying = true; 
        updateAnswerState();
        
        // 添加目标音播放的视觉反馈
        if (addVisualFeedback) {
            addVisualFeedback(AppState.quiz.currentTargetNote, 'target');
        }
        
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
        updateAllMessages('播放出错，请重试');
    } finally {
        AppState.quiz.locked = false;
        AppState.audio.isPlaying = false; 
        updateModeVisuals();
        updateAnswerState();
        updateResetButtonState();
        updateBigButtonState();
        syncButtons();
        
        if (!AppState.quiz.answered) {
            updateAllMessages('请选择你听到的音高');
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
    
    const showFeedback = AppGlobal.getTool('showAnswerFeedback');
    const disableButtons = AppGlobal.getTool('disableAnswerButtons');
    const syncButtons = AppGlobal.getTool('syncButtonStates');
    const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState');
    const updateIntervalDisplay = AppGlobal.getTool('updateIntervalDisplayInfo');
    const showUkulele = AppGlobal.getTool('showUkulelePositions');
    const updatePitch = AppGlobal.getTool('updateCurrentPitchDisplay');
    const addHistory = AppGlobal.getTool('addToHistory');
    const showCards = AppGlobal.getTool('showInfoCards');
    const hideCards = AppGlobal.getTool('hideInfoCards');
    const resetInfo = AppGlobal.getTool('resetAnswerInfo');
    const updateAllMessages = AppGlobal.getTool('updateAllMessageDisplays') || updateAllMessageDisplays;
    const isCorrect = selectedIndex === AppState.quiz.currentNoteIdx;
    
    // 正确判断是否是第一次尝试
    const isFirstAttempt = !AppState.quiz.hasAnsweredCurrent && AppState.quiz.attemptCount === 0;
    
    updateAllMessageDisplays(isCorrect ? '回答正确！' : '回答错误，请重试');

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
        
        // 触发答对事件，让状态栏开始监听面板变化
    window.dispatchEvent(new CustomEvent('answer-correct'));
    
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
          updateAllMessageDisplays('回答正确！点击"下一题"继续');
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
        if (AppState.quiz.attemptCount === 1) {
            updateAllMessages('回答错误，请重试');
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

// 处理答对后的逻辑
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
    const getCurrentRangeFunc = AppGlobal.getTool('getCurrentRange');
    const currentRange = getCurrentRangeFunc ? getCurrentRangeFunc() : ['C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3'];
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