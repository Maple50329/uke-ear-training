import { AppState } from '../core/state.js';
import statsManager from './stats-manager.js';
import { getQuestionBaseNote } from '../quiz/manager.js';
import AppGlobal from '../core/app.js';

function updateAllElements(id, value) {
    document.querySelectorAll(`#${id}`).forEach(el => {
        el.textContent = value;
    });
}

// 历史记录管理器
const HistoryManager = {
  MAX_RECORDS: 100,
  STORAGE_KEY: 'pitch_history_v2',
  
  // 添加新记录
  addRecord(baseNote, targetNote, key, baseMode, answerType = 'normal') {
    const records = this.getRecords();
    
    // 计算唱名
    const baseSolfeggio = this.calculateSolfeggio(baseNote, key, baseMode, true);
    const targetSolfeggio = this.getSolfeggioFromAnswerArea();    
    const newRecord = {
      id: `timestamp_${Date.now()}`,
      baseNote,
      targetNote,
      baseSolfeggio,
      targetSolfeggio,
      key,
      baseMode,
      answerType,
      timestamp: Date.now()
    };
    
    // 添加到开头并限制数量（现在为30条）
    records.unshift(newRecord);
    if (records.length > this.MAX_RECORDS) {
      records.splice(this.MAX_RECORDS);
    }
    
    this.saveRecords(records);
    return newRecord;
  },

  // 唱名计算函数
  calculateSolfeggio(note, key, baseMode, isBaseNote = false) {
    try {
      // 基准音特殊处理
      if (isBaseNote) {
        if (baseMode === 'c') {
          return 'Do';
        } else {
          return 'La';
        }
      }
      
      // 目标音从答题区获取
      return this.getSolfeggioFromAnswerArea();
      
    } catch (error) {
      console.error('唱名计算错误:', error);
      return '--';
    }
  },

  // 从答题区获取唱名
  getSolfeggioFromAnswerArea() {

    try {
      const answerArea = document.getElementById('ans');
      if (!answerArea) return '--';
  
      const targetNote = AppState.quiz.currentTargetNote;
      
      if (!targetNote) return '--';
  
      // 用音符匹配按钮，而不是依赖 .hit
      const correctButton = answerArea.querySelector(`.key-btn[data-note-name="${targetNote}"]`);
          console.log('🔍 targetNote:', targetNote);
      if (!correctButton) return '--';
  
      return correctButton.textContent.trim();
  
    } catch (e) {
      console.error('获取目标唱名失败:', e);
      return '--';
    }
  },

  // 解析音符
  parseNote(note) {
    const match = note.match(/^([A-G][#b]?)(\d+)$/);
    if (!match) {
      console.warn('无法解析音符:', note);
      return { noteName: note, octave: 4 };
    }
    return { noteName: match[1], octave: parseInt(match[2]) };
  },

  // 获取所有记录
  getRecords() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return []; // 确保返回空数组而不是 null
      }
      return JSON.parse(stored);
    } catch (error) {
      console.error('读取历史记录失败:', error);
      return []; // 确保返回空数组
    }
  },

  // 保存记录到 localStorage（关闭浏览器不会消失）
  saveRecords(records) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records));
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  },

  // 清空历史记录
  clearRecords() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('清空历史记录失败:', error);
      return false;
    }
  },

  // 调试存储状态
  debugStorage() {
    console.log('🔍 调试存储状态:');
    console.log('- STORAGE_KEY:', this.STORAGE_KEY);
    console.log('- MAX_RECORDS:', this.MAX_RECORDS);
    console.log('- localStorage 中是否存在:', localStorage.getItem(this.STORAGE_KEY) !== null);
    
    const records = this.getRecords();
    console.log('- 当前记录数量:', records.length);
    console.log('- 记录内容:', records);
  }
};

class HistoryInteraction {
  constructor() {
    this.currentSelectedId = null;
    this.currentPlayingType = null;
    this.bindEvents();
    this.renderHistory();
  }
  
  // 绑定事件（同时支持桌面端和移动端）
  bindEvents() {
    const historyLists = [
      document.getElementById('historyList'),
      document.getElementById('mobileHistoryList')
    ];
    
    historyLists.forEach(list => {
      if (list) {
        list.addEventListener('click', (e) => {
          this.handleHistoryClick(e);
        });
      }
    });

    const clearButtons = [
      document.getElementById('clearHistoryBtn'),
      document.getElementById('mobileClearHistoryBtn')
    ];
    
    clearButtons.forEach(btn => {
      if (btn) {
        btn.addEventListener('click', () => {
          this.clearHistory();
        });
      }
    });
  }
  
  // 统一处理历史记录点击（支持移动端和桌面端）
  handleHistoryClick(e) {
    const historyItem = e.target.closest('.history-item');
    if (!historyItem) return;
    
    const recordId = historyItem.dataset.recordId;
    const clickedSection = e.target.closest('[data-type]');
    
    if (clickedSection) {
      const playType = clickedSection.dataset.type;
      this.handleSectionClick(recordId, playType, historyItem);
    } else {
      this.selectItem(recordId);
    }
  }
  
  // 清空历史记录
  clearHistory() {
    const records = HistoryManager.getRecords();
    if (records.length === 0) {
      this.showToast('暂无记录可清空');
      return;
    }
    
    if (confirm(`确定要清空 ${records.length} 条历史记录吗？此操作不可撤销。`)) {
      const success = HistoryManager.clearRecords();
      if (success) {
        this.renderHistory();
        console.log('✅ 历史记录已清空');
        this.showToast('历史记录已清空');
      } else {
        this.showToast('清空失败，请重试');
      }
    }
  }

  // 显示提示
  showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => {
        toast.classList.remove('show');
      }, 2000);
    }
  }
  
  // 处理分区点击
  handleSectionClick(recordId, playType, historyItem) {
    const records = HistoryManager.getRecords();
    const record = records.find(r => r.id === recordId);
    
    if (!record) return;
    
    this.selectItem(recordId);
    this.playAudio(record, playType, historyItem);
  }
  
  // 播放音频
  async playAudio(record, playType, historyItem) {
    this.stopCurrentPlayback();
    
    this.currentPlayingType = playType;
    historyItem.classList.add(`playing-${playType}`);
    
    const noteToPlay = playType === 'base' ? record.baseNote : record.targetNote;
    
    try {
      // 确保音频上下文就绪
      const ensureAudioContextReady = AppGlobal?.getTool('ensureAudioContextReady');
      if (ensureAudioContextReady) {
        await ensureAudioContextReady();
      }
      
      // 使用工具箱的播放函数
      const playNoteSamplerTool = AppGlobal?.getTool('playNoteSampler');
      if (playNoteSamplerTool) {
        await playNoteSamplerTool(noteToPlay, 1.0);
      } else {
        console.error('❌ playNoteSampler 工具未找到');
        this.showToast('音频播放功能暂不可用');
      }
    } catch (error) {
      console.error('播放历史记录音频失败:', error);
      this.showToast('播放失败，请重试');
    } finally {
      this.clearPlaybackState(historyItem);
    }
  }
  
  // 停止当前播放
  stopCurrentPlayback() {
    // 只清除UI播放状态，不停止音频引擎
    document.querySelectorAll('.history-item.playing-base, .history-item.playing-target')
      .forEach(item => {
        item.classList.remove('playing-base', 'playing-target');
      });
    
    this.currentPlayingType = null;
  }
  
  // 清除播放状态
  clearPlaybackState(historyItem) {
    setTimeout(() => {
      historyItem.classList.remove('playing-base', 'playing-target');
      this.currentPlayingType = null;
    }, 100);
  }
  
  // 选中项目
  selectItem(recordId) {
    // 清除所有已选中项（桌面 + 移动）
    document.querySelectorAll('.history-item.selected').forEach(item => {
      item.classList.remove('selected');
      item.removeAttribute('aria-selected');
    });

    // 在页面中查找所有具有相同 recordId 的历史项（包含桌面与移动端），并全部标为选中
    const matches = document.querySelectorAll(`[data-record-id="${recordId}"]`);
    if (matches && matches.length > 0) {
      matches.forEach(el => {
        el.classList.add('selected');
        el.setAttribute('aria-selected', 'true');
      });
      this.currentSelectedId = recordId;
    }
  }
  
  // 渲染历史记录
  renderHistory() {
    const records = HistoryManager.getRecords();
    const historyList = document.getElementById('historyList');
    const mobileHistoryList = document.getElementById('mobileHistoryList');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const mobileClearHistoryBtn = document.getElementById('mobileClearHistoryBtn');
    const historyCount = document.getElementById('historyCount');
    const mobileHistoryCount = document.getElementById('mobileHistoryCount');
    
    // 更新统计信息
    if (historyCount) {
      historyCount.textContent = records.length;
    }
    if (mobileHistoryCount) {
      mobileHistoryCount.textContent = records.length;
    }
    
    // 更新清空按钮状态
    const clearButtons = [clearHistoryBtn, mobileClearHistoryBtn];
    clearButtons.forEach(btn => {
      if (btn) {
        btn.disabled = records.length === 0;
        if (records.length === 0) {
          btn.title = '暂无记录可清空';
        } else {
          btn.title = `清空 ${records.length} 条记录（最多保存 ${HistoryManager.MAX_RECORDS} 条）`;
        }
      }
    });
    
    if (records.length === 0) {
      const emptyHtml = '<div class="history-empty">暂无练习记录，答对题目后将会出现在这里</div>';
      if (historyList) historyList.innerHTML = emptyHtml;
      if (mobileHistoryList) mobileHistoryList.innerHTML = emptyHtml;
      return;
    }
    
    const html = records.map(record => {
      // 根据 answerType 决定 class（颜色）
      let typeClass = '';
      if (record.answerType === 'first_try') typeClass = ' first-try';
      else if (record.answerType === 'multi_try') typeClass = ' multi-try';
      else if (record.answerType === 'system_reveal') typeClass = ' system-reveal';
    
      // ⭐ 仅首击正确显示徽标
      const badgeHtml = record.answerType === 'first_try'
        ? '<span class="history-badge first-try-badge">首击</span>'
        : '';
    
      return `
        <div class="history-item${typeClass}" data-record-id="${record.id}">
          <div class="history-section-left" data-type="base">
            <div class="solfeggio-name">${record.baseSolfeggio}</div>
          </div>
    
          <div class="history-section-middle">
            <div class="key-info">
              <span class="key-text">${record.key}调</span>
              ${badgeHtml}
            </div>
          </div>
    
          <div class="history-section-right" data-type="target">
            <div class="solfeggio-name">${record.targetSolfeggio}</div>
          </div>
        </div>
      `;
    }).join('');
    
    if (historyList) historyList.innerHTML = html;
    if (mobileHistoryList) mobileHistoryList.innerHTML = html;
  }
  
  // 添加新记录
  addNewRecord(baseNote, targetNote, key, baseMode, answerType = 'normal') {
    const newRecord = HistoryManager.addRecord(
      baseNote,
      targetNote,
      key,
      baseMode,
      answerType
    );
    this.renderHistory();
    return newRecord;
  }
}

/**
 * 添加历史记录
 * @param {string} noteName        // 当前答的音（现在没用到，先保留）
 * @param {boolean} isCorrect      // recordedCorrect（系统揭晓你现在传的是 false）
 * @param {boolean} shouldReveal   // 是否系统揭晓
 * @param {boolean} isFirstAttempt // 是否首击（来自 manager.js）
 */
export function addToHistory(noteName, isCorrect, shouldReveal = false, isFirstAttempt = false) {
  try {
    const historyManager = window.historyInteraction;
    if (!historyManager || !historyManager.addNewRecord) {
      console.warn('❌ 历史记录管理器未找到');
      return;
    }

    // 只在「用户最终答对」或「系统揭晓」时记录
    if (!isCorrect && !shouldReveal) {
      return;
    }

    const baseNote = getQuestionBaseNote();
    const targetNote = AppState.quiz.currentTargetNote;
    const key = AppState.quiz.currentKey;
    const baseMode = AppState.quiz.questionBaseMode;

    let answerType = 'normal';

    if (shouldReveal) {
      // 🟥 系统揭晓
      answerType = 'system_reveal';
    } else if (isCorrect && isFirstAttempt) {
      // 🟩 首击正确
      answerType = 'first_try';
    } else if (isCorrect && !isFirstAttempt) {
      // 🟧 曾经答错过，但最终自己点对
      answerType = 'multi_try';
    }

    historyManager.addNewRecord(
      baseNote,
      targetNote,
      key,
      baseMode,
      answerType
    );
  } catch (error) {
    console.error('添加历史记录失败:', error);
  }
}

// 初始化历史记录：
export function initHistorySystem() {
  window.historyInteraction = new HistoryInteraction();
}

/**
 * 统一更新所有历史记录显示（桌面端 + 移动端）
 */
export function updateAllHistoryDisplays() {
  try {
    if (window.historyInteraction && window.historyInteraction.renderHistory) {
      window.historyInteraction.renderHistory();
    }
  } catch (error) {
    console.error('❌ 更新历史记录显示失败:', error);
  }
}

/**
 * 初始化历史模块
 */
export function initHistory() {
  initHistorySystem();
  updateRightPanelStats();
}

/**
 * 初始化右侧面板统计（带延迟确保数据加载完成）
 */
 export function updateRightPanelStats() {
  // 等待统计数据加载完成
  if (statsManager && typeof statsManager.getStats === 'function') {
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
    
    // 总正确率 - 确保有默认值
    const totalAccuracy = stats.totalAccuracyRate || 0;
    updateAllElements('totalAccuracyRate', `${totalAccuracy}%`);
    
    // 更新进度条（显示今日正确率）
    const progressFills = document.querySelectorAll('#accuracyProgress');
    progressFills.forEach(fill => {
      fill.style.width = `${todayAccuracy}%`;
    });
    
  } else {
    // 如果统计管理器还没准备好，设置默认值
    console.log('🔄 统计管理器未就绪，设置默认值');
    updateAllElements('totalAccuracyRate', '0%');
    updateAllElements('accuracyRate', '0%');
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
    
    // 总正确率
    updateAllElements('totalAccuracyRate', `${stats.totalAccuracyRate}%`);
    
    // 更新进度条
    const progressFills = document.querySelectorAll('#accuracyProgress');
    progressFills.forEach(fill => fill.style.width = `${stats.masteryRate}%`);

  } catch (e) {
    console.error('initRightPanel 失败:', e);
  }
}