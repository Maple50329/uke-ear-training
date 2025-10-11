// modules/quiz/history.js
import { AppState } from '../core/state.js';
import statsManager from './stats-manager.js';

function updateAllElements(id, value) {
    document.querySelectorAll(`#${id}`).forEach(el => {
        el.textContent = value;
    });
}

/**
 * 添加历史记录
 */
export function addToHistory(noteName, isCorrect) {
    try {
        if (!AppState.stats.history) {
            AppState.stats.history = [];
        }
        
        const historyEntry = {
            timestamp: new Date().toISOString(),
            note: noteName,
            correct: isCorrect,
            key: AppState.quiz.currentKey,
            baseMode: AppState.quiz.questionBaseMode,
            difficulty: AppState.quiz.currentDifficulty
        };
        
        AppState.stats.history.unshift(historyEntry);
        
        // 保持历史记录不超过50条
        if (AppState.stats.history.length > 50) {
            AppState.stats.history = AppState.stats.history.slice(0, 50);
        }
        
        updateHistoryDisplay();
        
    } catch (error) {
        console.error('添加历史记录失败:', error);
    }
}

/**
 * 更新历史记录显示
 */
function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;
    
    if (!AppState.stats.history || AppState.stats.history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">暂无播放记录</div>';
        return;
    }
    
    let html = '';
    AppState.stats.history.slice(0, 10).forEach(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
            <div class="history-item ${entry.correct ? 'correct' : 'incorrect'}">
                <div class="history-note">${entry.note}</div>
                <div class="history-info">
                    <span class="history-time">${time}</span>
                    <span class="history-status">${entry.correct ? '✓' : '✗'}</span>
                </div>
            </div>
        `;
    });
    
    historyList.innerHTML = html;
}

/**
 * 重置答案信息
 */
export function resetAnswerInfo() {
    // 重置音高显示
    const currentPitch = document.getElementById('currentPitch');
    const currentDegree = document.getElementById('currentDegree');
    const currentFrequency = document.getElementById('currentFrequency');
    
    if (currentPitch) currentPitch.textContent = '--';
    if (currentDegree) currentDegree.textContent = '';
    if (currentFrequency) currentFrequency.textContent = '';
    
    // 重置音程信息
    const intervalName = document.getElementById('intervalName');
    const intervalDetail = document.getElementById('intervalDetail');
    
    if (intervalName) intervalName.textContent = '--';
    if (intervalDetail) intervalDetail.textContent = '--';
    
    // 重置尤克里里信息
    const ukeNoteName = document.getElementById('ukeNoteName');
    const ukeCommonPositions = document.getElementById('ukeCommonPositions');
    const ukeHighPositions = document.getElementById('ukeHighPositions');
    const ukeRelatedChords = document.getElementById('ukeRelatedChords');
    
    if (ukeNoteName) ukeNoteName.textContent = '--';
    if (ukeCommonPositions) ukeCommonPositions.textContent = '--';
    if (ukeHighPositions) ukeHighPositions.textContent = '--';
    if (ukeRelatedChords) ukeRelatedChords.textContent = '--';
}

/**
 * 初始化历史模块
 */
export function initHistory() {
    console.log('📊 初始化历史模块');
    updateHistoryDisplay();
    updateRightPanelStats(); // 初始化时也更新统计
}

/**
 * 初始化右侧面板统计
 */
export function updateRightPanelStats() {
    try {
        const stats = statsManager.getStats();
        
        // 更新显示
        updateAllElements('currentStreak-label', `${stats.currentStreak || 0}连胜`);
        updateAllElements('maxStreak-label', `${stats.maxStreak || 0}连胜`);
        updateAllElements('totalPlays', `${stats.completed || 0}题`);
        updateAllElements('correctCount', `${stats.mastered || 0}题`);
        updateAllElements('totalExercises', `${stats.totalQuestions || 0}题`);
        
        // 今日正确率
        const todayAccuracy = stats.masteryRate || 0;
        updateAllElements('accuracyRate', `${todayAccuracy}%`);
        
        // 总正确率
        const totalAccuracy = stats.totalAccuracyRate || 0;
        updateAllElements('totalAccuracyRate', `${totalAccuracy}%`);
        
        // 更新进度条（显示今日正确率）
        const progressFills = document.querySelectorAll('#accuracyProgress');
        progressFills.forEach(fill => {
            fill.style.width = `${todayAccuracy}%`;
        });
        
    } catch (error) {
        console.error('更新统计失败:', error);
    }
}

// 修复初始化右侧面板
export function initRightPanel() {
    try {
        const stats = statsManager.getStats();

        /* ---------- 1. 写入数字区域 ---------- */
        const numEl = document.getElementById('currentStreak-num');
        if (numEl) numEl.textContent = stats.currentStreak;

        /* ---------- 2. 写入文字区域 ---------- */
        const labelEl = document.getElementById('currentStreak-label');
        if (labelEl) labelEl.textContent = `${stats.currentStreak}连胜`;

        const maxEl = document.getElementById('maxStreak-label');
        if (maxEl) maxEl.textContent = `${stats.maxStreak}连胜`;

        /* ---------- 3. 更新所有统计字段 ---------- */
        updateAllElements('totalPlays', `${stats.completed}题`);
        updateAllElements('correctCount', `${stats.mastered}题`);
        updateAllElements('totalExercises', `${stats.totalQuestions}题`);
        
        // 今日正确率
        updateAllElements('accuracyRate', `${stats.masteryRate}%`);
        
        // 总正确率（新增）
        updateAllElements('totalAccuracyRate', `${stats.totalAccuracyRate}%`);
        
        // 更新进度条
        const progressFills = document.querySelectorAll('#accuracyProgress');
        progressFills.forEach(fill => fill.style.width = `${stats.masteryRate}%`);

    } catch (e) {
        console.error('initRightPanel 失败:', e);
    }
}

