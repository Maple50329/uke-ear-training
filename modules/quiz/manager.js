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

// 简单延迟函数
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 答题区渲染
async function playQuizSequence(isReplay = false) {
    // 创建中断标志和检查函数
    let interrupted = false;
    
    const checkInterrupt = () => {
        if (AppState.quiz.fromReset || AppState.audio.shouldStop) {
            interrupted = true;
            throw new Error('PLAYBACK_INTERRUPTED');
        }
    };
    
    // 可中断的延迟函数
    const interruptibleDelay = async (ms) => {
        const chunkSize = 100; // 每100ms检查一次中断
        let remaining = ms;
        
        while (remaining > 0 && !interrupted) {
            const currentChunk = Math.min(chunkSize, remaining);
            await delay(currentChunk);
            checkInterrupt();
            remaining -= currentChunk;
        }
    };

    try {
        // 开始前检查
        checkInterrupt();
        
        // 在播放前应用待处理的音域更改
        if (AppState.quiz.pendingRangeChange && !isReplay) {
            console.log('播放前应用待处理音域:', AppState.quiz.pendingRangeChange);
            AppState.quiz.currentRange = AppState.quiz.pendingRangeChange;
            AppState.quiz.pendingRangeChange = null;
            
            const activeRangeBtn = document.querySelector(`.range-btn[data-range="${AppState.quiz.currentRange}"]`);
            if (activeRangeBtn) {
                document.querySelectorAll('.range-btn').forEach(btn => btn.classList.remove('active'));
                activeRangeBtn.classList.add('active');
            }
        }
        
        checkInterrupt();
        
        const hideOverlays = AppGlobal.getTool('hideAllWelcomeOverlays');
        const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState');
        const updateAnswerState = AppGlobal.getTool('updateAnswerAreaState');
        const disableButtons = AppGlobal.getTool('disableAnswerButtons');
        const enableButtons = AppGlobal.getTool('enableAnswerButtons');
        const updatePitch = AppGlobal.getTool('updateCurrentPitchDisplay');
        const updateAllMessageDisplaysFunc = AppGlobal.getTool('updateAllMessageDisplays');
        const getCurrentRangeFunc = AppGlobal.getTool('getCurrentRange');
        const addVisualFeedback = AppGlobal.getTool('addVisualFeedback');
        const clearVisualFeedback = AppGlobal.getTool('clearVisualFeedback');
        
        console.log('=== 播放序列开始 ===');
        
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
            // 重置“已答”标记，否则第二题会被跳过
            statsManager.recordNewQuestion();
            checkInterrupt();
            
            const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
            AppState.quiz.questionBaseMode = baseMode;
            
            window.dispatchEvent(new CustomEvent('base-mode-changed', {
                detail: { mode: baseMode }
            }));

            const newKey = document.getElementById('keySelect')?.value || 'C';
            AppState.quiz.currentKey = newKey;
            AppState.quiz.hasStarted = true;
            AppState.quiz.answered = false;
            
            AppState.quiz.hasAnsweredCurrent = false;
            AppState.quiz.attemptCount = 0;
            
            const updateResetButtonState = AppGlobal.getTool('updateResetButtonState');
            updateResetButtonState?.();

            const resetInfo = AppGlobal.getTool('resetAnswerInfo');
            resetInfo();

            const currentRangeType = AppState.quiz.currentRange || 'low';
            const currentRangeArray = getCurrentRangeFunc();
            
            console.log('播放序列 - 当前音域类型:', currentRangeType);
            
            const isLowRange = currentRangeType === 'low';
            
            if (baseMode === 'c') {
                const baseScale = KEY_SCALES[newKey]?.basic || KEY_SCALES.C.basic;
                AppState.quiz.fixedCNote = isLowRange ? baseScale[0] : adjustOctave(baseScale[0], 1);
                AppState.quiz.fixedANote = isLowRange ? 'A3' : 'A4';
            } else {
                const baseScale = KEY_SCALES[newKey]?.basic || KEY_SCALES.C.basic;
                AppState.quiz.fixedCNote = isLowRange ? baseScale[0] : adjustOctave(baseScale[0], 1);
                AppState.quiz.fixedANote = isLowRange ? 'A3' : 'A4';
            }

            AppState.quiz.currentDifficulty = document.getElementById('difficultySelect')?.value || 'basic';
            const key = AppState.quiz.currentKey;
            const difficulty = AppState.quiz.currentDifficulty;
            
            const naturalScale = getScaleForRange(KEY_SCALES[key]?.basic || KEY_SCALES.C.basic, currentRangeType);
            const fullScale = getScaleForRange(KEY_SCALES[key]?.extended || KEY_SCALES.C.extended, currentRangeType);

            AppState.quiz.currentScale = difficulty === 'basic' ? naturalScale : fullScale;

            if (AppState.dom.ansArea) {
                const renderFunc = AppGlobal.getTool('renderAnswerButtons');
                if (renderFunc) {
                    AppState.dom.ansArea.style.display = 'grid';
                    AppState.dom.ansArea.classList.remove('disabled');
                    renderFunc(AppState.quiz.currentScale, AppState.quiz.currentDifficulty);
                    disableButtons();
                }
            }
        }
        
        checkInterrupt();
        
        /* ---------- 音频就绪检查 ---------- */
        const audioReady = await ensureAudioContextReady();
        if (!audioReady) {
            if (updateAllMessageDisplaysFunc) {
                updateAllMessageDisplaysFunc('音频未就绪，请点击页面激活');
            }
            AppState.quiz.locked = false;
            return;
        }
        
        checkInterrupt();
        
        AppState.quiz.locked = true;
        updateAnswerState();
        
        const updateResetButtonState = AppGlobal.getTool('updateResetButtonState');
        const updateBigButtonState = AppGlobal.getTool('updateBigButtonState');
        updateResetButtonState?.();
        updateBigButtonState?.();
        disableButtons();
        
        try {
            const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
            const enableScale = document.getElementById('enableScalePlayback')?.checked ?? true;
            
            const currentRangeType = AppState.quiz.currentRange || 'low';
            const key = AppState.quiz.currentKey;
            const difficulty = AppState.quiz.currentDifficulty;

            const naturalScale = getScaleForRange(KEY_SCALES[key]?.basic || KEY_SCALES.C.basic, currentRangeType);
            
            const baseNote = getQuestionBaseNote();
            
            const eighthNote = 0.5, quarterNote = 1.0, noteInterval = 120;
            
            if (!isReplay) {
                updatePitch('--', null);
                const targetScale = AppState.quiz.currentScale;
                
                let targetIndex;
                let newTargetNote;
                let attempts = 0;
                const maxAttempts = 10;
                
                do {
                    targetIndex = Math.floor(Math.random() * targetScale.length);
                    newTargetNote = targetScale[targetIndex];
                    attempts++;
                } while (
                    AppState.quiz.recentTargetNotes.includes(newTargetNote) && 
                    targetScale.length > 3 &&
                    attempts < maxAttempts
                );
                
                AppState.quiz.currentTargetNote = newTargetNote;
                AppState.quiz.currentNoteIdx = targetIndex;
                AppState.quiz.answered = false;
                
                AppState.quiz.recentTargetNotes.unshift(newTargetNote);
                AppState.quiz.recentTargetNotes = AppState.quiz.recentTargetNotes.slice(0, 3);
            } else {
                if (AppState.dom.ansArea) {
                    const renderFunc = AppGlobal.getTool('renderAnswerButtons');
                    if (renderFunc) {
                        AppState.dom.ansArea.style.display = 'grid';
                        renderFunc(AppState.quiz.currentScale, AppState.quiz.currentDifficulty);
                        disableButtons();
                    }
                }
            }
            
            checkInterrupt();
            
            /* ---------- 播放音阶 ---------- */
            if ((!isReplay || enableScale) && enableScale) {
                checkInterrupt();
                
                if (AppState.dom.mainBtn) AppState.dom.mainBtn.textContent = UI_TEXT.PLAYING_SCALE;
                updateBigButtonState?.();
                if (updateAllMessageDisplaysFunc) updateAllMessageDisplaysFunc(UI_TEXT.PLAYING_SCALE);
                updateAnswerState?.();
                
                for (const note of naturalScale) {
                    checkInterrupt();
                    
                    if (addVisualFeedback) {
                        addVisualFeedback(note, 'scale');
                    }
                    
                    const playQuizAudioFunc = AppGlobal.getTool('playQuizAudio');
                    await playQuizAudioFunc(note, eighthNote);
                    checkInterrupt();
                    
                    await interruptibleDelay(noteInterval);
                    checkInterrupt();
                }
                
                if (!interrupted) await interruptibleDelay(300);
            }
            
            checkInterrupt();
            
            /* ---------- 播放基准音 ---------- */
            if (AppState.dom.mainBtn) AppState.dom.mainBtn.textContent = UI_TEXT.PLAYING_REFERENCE;
            updateBigButtonState?.();
            if (updateAllMessageDisplaysFunc) updateAllMessageDisplaysFunc(UI_TEXT.PLAYING_REFERENCE);
            updateAnswerState?.();
            
            checkInterrupt();
            
            if (addVisualFeedback) {
                addVisualFeedback(baseNote, 'reference');
            }
            
            const playQuizAudioFunc = AppGlobal.getTool('playQuizAudio');
            await playQuizAudioFunc(baseNote, quarterNote);
            checkInterrupt();
            
            await interruptibleDelay(noteInterval);
            checkInterrupt();
            
            if (addVisualFeedback) {
                addVisualFeedback(baseNote, 'reference');
            }
            
            await playQuizAudioFunc(baseNote, quarterNote);
            checkInterrupt();
            
            await interruptibleDelay(noteInterval);
            checkInterrupt();
            
            /* ---------- 播放目标音 ---------- */
            disableButtons?.();
            
            if (AppState.dom.mainBtn) {
                AppState.dom.mainBtn.textContent = isReplay ? UI_TEXT.REPLAYING_TARGET : UI_TEXT.PLAYING_TARGET;
            }
            updateBigButtonState?.();
            if (updateAllMessageDisplaysFunc) updateAllMessageDisplaysFunc(isReplay ? UI_TEXT.REPLAYING_TARGET : UI_TEXT.PLAYING_TARGET);
            updateAnswerState?.();
            
            checkInterrupt();
            
            if (addVisualFeedback) {
                addVisualFeedback(AppState.quiz.currentTargetNote, 'target');
            }
            
            await playQuizAudioFunc(AppState.quiz.currentTargetNote, quarterNote);
            checkInterrupt();

            if (!interrupted) {
                enableButtons?.();
                
                AppState.quiz.hasStarted = true;
                AppState.quiz.isReplayMode = isReplay;
                
                if (AppState.dom.mainBtn) {
                    AppState.dom.mainBtn.textContent = UI_TEXT.REPLAY;
                    updateBigButtonState?.();
                }
            } else {
                disableButtons?.();
            }
            
        } catch (error) {
            if (error.message !== 'PLAYBACK_INTERRUPTED') {
                console.error('播放序列错误:', error);
                if (updateAllMessageDisplaysFunc) {
                    updateAllMessageDisplaysFunc('播放出错，请重试');
                }
            }
        } finally {
            if (!interrupted) {
                AppState.quiz.locked = false;
                const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState');
                const updateResetButtonState = AppGlobal.getTool('updateResetButtonState');
                const updateBigButtonState = AppGlobal.getTool('updateBigButtonState');
                const syncButtons = AppGlobal.getTool('syncButtonStates');
                
                updateModeVisuals?.();
                updateResetButtonState?.();
                updateBigButtonState?.();
                syncButtons?.();
                
                if (!AppState.quiz.answered && updateAllMessageDisplaysFunc) {
                    updateAllMessageDisplaysFunc('请选择你听到的音高');
                }
            } else {
                console.log('播放流程被复位中断');
                AppState.quiz.locked = false;
            }
        }
        
    } catch (error) {
        if (error.message === 'PLAYBACK_INTERRUPTED') {
            console.log('播放流程在开始阶段被中断');
            AppState.quiz.locked = false;
        } else {
            console.error('播放序列外层错误:', error);
        }
    }
}

function interruptibleDelay(ms, controller) {
    return new Promise((resolve) => {
        let resolved = false;
        
        const timeoutId = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                resolve();
            }
        }, ms);
        
        const checkInterval = setInterval(() => {
            if (controller.shouldStop() && !resolved) {
                resolved = true;
                clearTimeout(timeoutId);
                clearInterval(checkInterval);
                resolve();
            }
        }, 50);
    });
}

// 根据音域获取对应的基准音
function getBaseNoteForRange(baseMode, key, currentRange) {
    const isLowRange = currentRange === 'low';
  
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
function getScaleForRange(scale, rangeType) {
    const isLowRange = rangeType === 'low'; // 直接使用音域类型判断
    
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
    
    console.log('🎯 checkAnswer 开始', { 
        selectedIndex, 
        currentNoteIdx: AppState.quiz.currentNoteIdx,
        hasAnsweredCurrent: AppState.quiz.hasAnsweredCurrent,
        attemptCount: AppState.quiz.attemptCount
    });
    
    const isCorrect = selectedIndex === AppState.quiz.currentNoteIdx;

    // 记录这次点击之前已经尝试了几次
    const prevAttempts = AppState.quiz.attemptCount || 0;
    
    // 只有在完全没点过这一题时才算“首击”
    const isFirstAttempt = prevAttempts === 0;
    
    // 当前这一下计入一次尝试
    AppState.quiz.attemptCount = prevAttempts + 1;
    
    console.log('🎯 答题结果', { 
        isCorrect, 
        isFirstAttempt,
        prevAttempts,
        attemptCountAfter: AppState.quiz.attemptCount
    });
    
    console.log('🎯 答题结果', { isCorrect, isFirstAttempt });

    // 🔴 关键修复：先处理错误次数逻辑，确定是否要揭示答案
    let shouldRevealAnswer = false;
    let recordedCorrect = isCorrect;

    if (!isCorrect) {
        const handleWrongAnswer = AppGlobal.getTool('handleWrongAnswer');
        if (handleWrongAnswer) {
            const errorResult = handleWrongAnswer();
            console.log('🔴 错误处理结果:', errorResult);
            
            if (errorResult.shouldReveal) {
                shouldRevealAnswer = true;
                recordedCorrect = false; // 系统揭示答案视为错误
            }
        }
    }

    // 🔴 关键修复：立即记录统计信息（在修改任何状态之前）
    const difficulty = document.getElementById('difficultySelect')?.value || 'basic';
    const key = document.getElementById('keySelect')?.value || 'C';
    const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
    const userAnswerNote = getNoteNameFromIndex(selectedIndex, difficulty, key);

    console.log('📊 准备记录统计', { 
        recordedCorrect, 
        isFirstAttempt, 
        userAnswerNote,
        baseMode, 
        key, 
        difficulty 
    });

    // 🔴 关键修复：确保 statsManager 存在并记录统计
    if (typeof statsManager !== 'undefined' && statsManager && typeof statsManager.recordAnswer === 'function') {
        try {
            const result = statsManager.recordAnswer(recordedCorrect, isFirstAttempt, userAnswerNote, baseMode, key, difficulty);
            console.log('📊 统计记录完成', result);
        } catch (error) {
            console.error('❌ 统计记录失败:', error);
        }
    } else {
        console.error('❌ statsManager 不可用', { 
            statsManager: typeof statsManager,
            recordAnswer: statsManager ? typeof statsManager.recordAnswer : 'undefined'
        });
    }

    // 更新右侧面板统计
    if (typeof updateRightPanelStats === 'function') {
        updateRightPanelStats();
    } else {
        console.error('❌ updateRightPanelStats 不可用');
    }

    // 更新历史记录
    const addHistory = AppGlobal.getTool('addToHistory');
    if (addHistory) {
        addHistory(userAnswerNote, recordedCorrect, shouldRevealAnswer, isFirstAttempt);
    }

    // 🔴 关键修复：UI 反馈和状态更新
    btn.classList.add(isCorrect ? 'hit' : 'miss');

    if (isCorrect) {
        btn.disabled = false;
        setTimeout(() => {
            btn.disabled = true;
        }, 500);
    }

    playSFX(isCorrect ? 'ok' : 'fail');
    
    const showFeedback = AppGlobal.getTool('showAnswerFeedback');
    if (showFeedback) showFeedback(isCorrect);

    // 答对后禁用复位
    if (isCorrect) {
        AppState.quiz.canReset = false;
        const updateResetButtonState = AppGlobal.getTool('updateResetButtonState');
        updateResetButtonState?.();
    }

    // 处理揭示答案的情况
    let feedbackMessage = isCorrect ? '回答正确！' : '回答错误，请重试';
    
    if (shouldRevealAnswer) {
        feedbackMessage = '请看正确答案！';
        const revealCorrectAnswer = AppGlobal.getTool('revealCorrectAnswer');
        if (revealCorrectAnswer) {
            revealCorrectAnswer();
        }
    } else if (!isCorrect) {
        const getErrorStatus = AppGlobal.getTool('getErrorStatus');
        const errorStatus = getErrorStatus ? getErrorStatus() : { enabled: false, current: 0, allowed: 0 };
        
        if (errorStatus.enabled) {
            feedbackMessage = `回答错误！再听听看 (${errorStatus.current}/${errorStatus.allowed})`;
        } else {
            feedbackMessage = '回答错误，请重试';
        }
    }

    const updateAllMessages = AppGlobal.getTool('updateAllMessageDisplays');
    if (updateAllMessages) updateAllMessages(feedbackMessage);

    // 答对或揭示答案后禁用所有答题按钮
    if (isCorrect || shouldRevealAnswer) {
        const disableButtons = AppGlobal.getTool('disableAnswerButtons');
        if (disableButtons) disableButtons();
        
        AppState.quiz.answered = true;
        AppState.quiz.hasAnsweredCurrent = true;
    }

    const syncButtons = AppGlobal.getTool('syncButtonStates');
    if (syncButtons) syncButtons();

    // 答对后的处理
    if (isCorrect || shouldRevealAnswer) {
        // 更新复位按钮状态
        const updateResetButtonState = AppGlobal.getTool('updateResetButtonState');
        updateResetButtonState?.();

        if (AppState.quiz.currentTargetNote) {
            const frequency = NOTE_FREQUENCIES[AppState.quiz.currentTargetNote];
            // 回答正确后更新显示完整信息
            const updatePitch = AppGlobal.getTool('updateCurrentPitchDisplay');
            if (updatePitch) updatePitch(AppState.quiz.currentTargetNote, frequency);
        }
        
        // 显示音程信息
        const currentKey = AppState.quiz.currentKey || 'C';
        const baseNote = getQuestionBaseNote();
        const targetNote = AppState.quiz.currentTargetNote;
        const intervalType = calculateIntervalType(baseNote, targetNote);
        
        if (intervalType) {
            const updateIntervalDisplay = AppGlobal.getTool('updateIntervalDisplayInfo');
            if (updateIntervalDisplay) updateIntervalDisplay(baseNote, targetNote, intervalType);
        }
        
        // 显示尤克里里指位信息
        const showUkulele = AppGlobal.getTool('showUkulelePositions');
        if (showUkulele) showUkulele(AppState.quiz.currentTargetNote);
        
        // 回答正确后立即解锁音级更新
        AppState.quiz.shouldUpdateDegree = true;
        
        // 解锁调性选择和基准音选择（答题已完成）
        AppState.quiz.hasStarted = false;
        
        const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState');
        if (updateModeVisuals) updateModeVisuals();
        
        // 重置当前题目的尝试状态（为下一题准备）
        AppState.quiz.attemptCount = 0;
        
        // 重置错误计数（答对后）
        const resetErrorCount = AppGlobal.getTool('resetErrorCount');
        if (resetErrorCount) {
            resetErrorCount();
        }

        // 答对后立即处理，不设置定时器
        stopPlayback();
        if (AppState.dom.mainBtn) {
            AppState.dom.mainBtn.textContent = UI_TEXT.NEXT;
            const updateBigButtonState = AppGlobal.getTool('updateBigButtonState');
            if (updateBigButtonState) updateBigButtonState();
        }
        
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
            const showCards = AppGlobal.getTool('showInfoCards');
            if (showCards) showCards();
            
            // 设置新的定时器
            AppState.quiz.autoNextTimer = setTimeout(() => {
                console.log('信息显示时长结束，检查是否进入下一题');
                
                // 检查是否仍然处于已回答状态
                if (AppState.quiz.answered && AppState.dom.mainBtn.textContent === UI_TEXT.NEXT) {
                    const resetInfo = AppGlobal.getTool('resetAnswerInfo');
                    const hideCards = AppGlobal.getTool('hideInfoCards');
                    
                    if (resetInfo) resetInfo();
                    if (hideCards) hideCards();
                    
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
            const updateAllMessages = AppGlobal.getTool('updateAllMessageDisplays');
            if (updateAllMessages) {
                if (shouldRevealAnswer) {
                    // ✅ 系统揭晓答案的情况
                    updateAllMessages('请看正确答案！');
                } else {
                    // ✅ 用户真的答对才显示这句
                    updateAllMessages('回答正确！点击"下一题"继续');
                }
            }
        }
    }
    
    // 只有答错且还有机会时才在延迟后移除样式
    if (!isCorrect && !shouldRevealAnswer) {
        const getErrorStatus = AppGlobal.getTool('getErrorStatus');
        const status = getErrorStatus ? getErrorStatus() : { enabled: false, current: 0, allowed: 0 };
        
        const remaining = status.allowed - status.current;
    
        if (!status.enabled || remaining > 0) {
            setTimeout(() => {
                btn.classList.remove('hit', 'miss');
                const syncButtons = AppGlobal.getTool('syncButtonStates');
                const updateModeVisuals = AppGlobal.getTool('updateModeButtonsVisualState');
                syncButtons?.();
                updateModeVisuals?.();
            }, 800);
        }
    }
    
    console.log('🎯 checkAnswer 结束', { 
        answered: AppState.quiz.answered,
        hasAnsweredCurrent: AppState.quiz.hasAnsweredCurrent,
        attemptCount: AppState.quiz.attemptCount
    });
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
    
    // 直接使用音域类型判断，而不是通过音域数组
    const currentRangeType = AppState.quiz.currentRange || 'low';
    const isLowRange = currentRangeType === 'low';
    
    if (baseMode === 'c') {
        // 固定C模式：根据音域调整八度
        const baseScale = KEY_SCALES[currentKey]?.basic || KEY_SCALES.C.basic;
        const cNote = baseScale[0];
        return isLowRange ? cNote : adjustOctave(cNote, 1);
    } else {
        // 固定A模式：根据音域调整八度
        const aNote = getANoteForKey(currentKey);
        return isLowRange ? adjustOctave(aNote, -1) : aNote;
    }
}

export {
    playQuizSequence,
    checkAnswer,
    getNoteNameFromIndex,
    getQuestionBaseNote,
};