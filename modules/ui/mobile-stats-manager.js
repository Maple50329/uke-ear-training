// mobile-stats-manager.js
import statsManager from '../quiz/stats-manager.js';

class MobileStatsManager {
  constructor() {
    this.stats = null;
    this.init();
  }
  
  init() {
    this.updateStats();
    this.bindEvents();
  }
  
  // 更新所有统计数据
  updateStats() {
    this.stats = statsManager.getStats();
    this.updateBasicStats();
    this.updateCategoryStats();
  }
  
  // 更新基础统计
  updateBasicStats() {
    const stats = this.stats;
    
    // 更新基础统计数字
this.updateElement('mobileTotalExercises', `${stats.totalQuestions || 0}题`);
this.updateElement('mobileTotalAccuracyRate', `${stats.totalAccuracyRate || 0}%`);
this.updateElement('mobileTotalPlays', `${stats.completed || 0}题`);
this.updateElement('mobileCorrectCount', `${stats.mastered || 0}题`);
this.updateElement('mobileAccuracyRate', `${stats.masteryRate || 0}%`);
this.updateElement('mobileCurrentStreak', `${stats.currentStreak || 0}连胜`);
this.updateElement('mobileMaxStreak', `${stats.maxStreak || 0}连胜`);
  }
  
  // 更新分类统计
  updateCategoryStats() {
    const categories = this.stats.categories;
    
    if (!categories) {
      this.resetCategoryStats();
      return;
    }
    
    // 基准音统计
    this.updateCategoryProgress('c-base', categories.baseNotes?.C, 'C基准音');
    this.updateCategoryProgress('a-base', categories.baseNotes?.A, 'A基准音');
    
    // 音级类型统计
    this.updateCategoryProgress('natural', categories.noteTypes?.natural, '自然音级');
    this.updateCategoryProgress('accidental', categories.noteTypes?.accidental, '变化音级');
    
    // 调性统计
    this.updateKeyStats(categories.keys);
    
    // 难度统计
    this.updateDifficultyStats(categories.difficulties);
  }
  
  // 更新单个分类进度
  updateCategoryProgress(type, stats, label) {
    if (!stats) {
      stats = { questions: 0, correct: 0, accuracy: 0 };
    }
    
    // 查找对应的进度项
    const progressItems = document.querySelectorAll('.mobile-progress-item');
    progressItems.forEach(item => {
      const itemLabel = item.querySelector('.mobile-progress-label');
      if (itemLabel && itemLabel.textContent.includes(label)) {
        const progressFill = item.querySelector(`.mobile-progress-fill.${type}`);
        const progressValue = item.querySelector('.mobile-progress-value');
        
        if (progressFill && progressValue) {
          const accuracy = stats.accuracy || 0;
          progressFill.style.width = `${accuracy}%`;
          progressValue.textContent = `${accuracy}%`;
          
          // 更新标签显示数量
          itemLabel.textContent = `${label} (${stats.correct || 0}/${stats.questions || 0})`;
        }
      }
    });
  }
  
  // 更新调性统计
  updateKeyStats(keys) {
    const container = document.getElementById('mobileKeyStats');
    if (!container) return;
    
    if (!keys || Object.keys(keys).length === 0) {
      container.innerHTML = '<div class="mobile-no-data">暂无数据</div>';
      return;
    }
    
    let html = '';
    const keyOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const keyNames = {
      'C': 'C调', 'D': 'D调', 'E': 'E调', 'F': 'F调', 
      'G': 'G调', 'A': 'A调', 'B': 'B调'
    };
    
    keyOrder.forEach(key => {
      const stats = keys[key];
      if (stats && stats.questions > 0) {
        const accuracy = stats.accuracy || 0;
        html += `
          <div class="mobile-progress-item">
            <div class="mobile-progress-label">${keyNames[key]} (${stats.correct}/${stats.questions})</div>
            <div class="mobile-progress-bar">
              <div class="mobile-progress-fill key-${key.toLowerCase()}" style="width: ${accuracy}%"></div>
            </div>
            <div class="mobile-progress-value">${accuracy}%</div>
          </div>
        `;
      }
    });
    
    container.innerHTML = html || '<div class="mobile-no-data">暂无数据</div>';
  }
  
  // 更新难度统计
  updateDifficultyStats(difficulties) {
    const container = document.getElementById('mobileDifficultyStats');
    if (!container) return;
    
    if (!difficulties || Object.keys(difficulties).length === 0) {
      container.innerHTML = '<div class="mobile-no-data">暂无数据</div>';
      return;
    }
    
    let html = '';
    const difficultyMap = {
      'basic': { name: '仅基本音级', class: 'basic' },
      'extended': { name: '含变化音级', class: 'extended' }
    };
    
    Object.entries(difficultyMap).forEach(([key, info]) => {
      const stats = difficulties[key];
      if (stats && stats.questions > 0) {
        const accuracy = stats.accuracy || 0;
        html += `
          <div class="mobile-progress-item">
            <div class="mobile-progress-label">${info.name} (${stats.correct}/${stats.questions})</div>
            <div class="mobile-progress-bar">
              <div class="mobile-progress-fill ${info.class}" style="width: ${accuracy}%"></div>
            </div>
            <div class="mobile-progress-value">${accuracy}%</div>
          </div>
        `;
      }
    });
    
    container.innerHTML = html || '<div class="mobile-no-data">暂无数据</div>';
  }
  
  // 重置分类统计显示
  resetCategoryStats() {
    const defaultStats = { questions: 0, correct: 0, accuracy: 0 };
    
    // 重置所有进度条
    this.updateCategoryProgress('c-base', defaultStats, 'C基准音');
    this.updateCategoryProgress('a-base', defaultStats, 'A基准音');
    this.updateCategoryProgress('natural', defaultStats, '自然音级');
    this.updateCategoryProgress('accidental', defaultStats, '变化音级');
    
    // 重置动态内容
    const keyStatsContainer = document.getElementById('mobileKeyStats');
    const difficultyStatsContainer = document.getElementById('mobileDifficultyStats');
    
    if (keyStatsContainer) {
      keyStatsContainer.innerHTML = '<div class="mobile-no-data">暂无数据</div>';
    }
    if (difficultyStatsContainer) {
      difficultyStatsContainer.innerHTML = '<div class="mobile-no-data">暂无数据</div>';
    }
  }
  
  // 更新元素内容
  updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
    }
  }
  
  // 绑定事件
  bindEvents() {
    // 监听统计更新事件
    window.addEventListener('statsUpdated', () => {
      this.updateStats();
    });
    
    // 监听题目回答事件
    window.addEventListener('answerSubmitted', () => {
      setTimeout(() => this.updateStats(), 100);
    });
  }
}

// 创建单例并导出
const mobileStatsManager = new MobileStatsManager();
export default mobileStatsManager;