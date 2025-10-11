// modules/ui/stats-modal.js
import { AppState } from '../core/state.js';
import statsManager from '../quiz/stats-manager.js';

class StatsModal {
    constructor() {
        this.modal = null;
        this.isInitialized = false;
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        this.createModal();
        this.bindEvents();
        this.isInitialized = true;
    }
    
    createModal() {
        // 创建模态框HTML结构
        this.modal = document.createElement('div');
        this.modal.className = 'stats-modal';
        this.modal.innerHTML = this.getModalHTML();
        document.body.appendChild(this.modal);
    }
    
    getModalHTML() {
        return `
            <div class="modal-overlay">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>📊 详细统计信息</h3>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <!-- 🗑️ 删除筛选器部分 -->
                        
                        <!-- 总体统计 -->
                        <div class="modal-section">
                            <h4>总体统计</h4>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-value" id="modalTotalPlays">0</div>
                                    <div class="stat-label">总播放次数</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value" id="modalTotalCorrect">0</div>
                                    <div class="stat-label">总正确次数</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value" id="modalTotalAccuracy">0%</div>
                                    <div class="stat-label">总正确率</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value" id="modalMaxStreak">0</div>
                                    <div class="stat-label">最高连胜</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 今日统计 -->
                        <div class="modal-section">
                            <h4>今日统计</h4>
                            <div class="stats-grid">
                                <div class="stat-card">
                                    <div class="stat-value" id="modalTodayPlays">0</div>
                                    <div class="stat-label">今日练习</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value" id="modalTodayCorrect">0</div>
                                    <div class="stat-label">正确次数</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value" id="modalTodayAccuracy">0%</div>
                                    <div class="stat-label">今日正确率</div>
                                </div>
                                <div class="stat-card">
                                    <div class="stat-value" id="modalCurrentStreak">0</div>
                                    <div class="stat-label">当前连胜</div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 分类统计 -->
                        <div class="modal-section">
                            <h4>分类统计</h4>
                            <div class="category-stats">
                                <!-- 基准音表现 -->
                                <div class="category-group">
                                    <h5>基准音表现</h5>
                                    <div class="progress-group">
                                        <div class="progress-item">
                                            <div class="progress-label" data-label="modalCBase">C基准音 (0/0)</div>
                                            <div class="progress-bar">
                                                <div class="progress-fill c-base" id="modalCBaseProgress" style="width: 0%"></div>
                                            </div>
                                            <div class="progress-value" id="modalCBaseValue">0%</div>
                                        </div>
                                        <div class="progress-item">
                                            <div class="progress-label" data-label="modalABase">A基准音 (0/0)</div>
                                            <div class="progress-bar">
                                                <div class="progress-fill a-base" id="modalABaseProgress" style="width: 0%"></div>
                                            </div>
                                            <div class="progress-value" id="modalABaseValue">0%</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 音级类型 -->
                                <div class="category-group">
                                    <h5>音级类型</h5>
                                    <div class="progress-group">
                                        <div class="progress-item">
                                            <div class="progress-label" data-label="modalNatural">自然音级 (0/0)</div>
                                            <div class="progress-bar">
                                                <div class="progress-fill natural" id="modalNaturalProgress" style="width: 0%"></div>
                                            </div>
                                            <div class="progress-value" id="modalNaturalValue">0%</div>
                                        </div>
                                        <div class="progress-item">
                                            <div class="progress-label" data-label="modalAccidental">变化音级 (0/0)</div>
                                            <div class="progress-bar">
                                                <div class="progress-fill accidental" id="modalAccidentalProgress" style="width: 0%"></div>
                                            </div>
                                            <div class="progress-value" id="modalAccidentalValue">0%</div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 调性统计 -->
                                <div class="category-group">
                                    <h5>调性表现</h5>
                                    <div class="key-stats-list" id="modalKeyStats">
                                        <div class="no-data">暂无调性统计数据</div>
                                    </div>
                                </div>
                                
                                <!-- 难度统计 -->
                                <div class="category-group">
                                    <h5>难度表现</h5>
                                    <div class="difficulty-stats-list" id="modalDifficultyStats">
                                        <div class="no-data">暂无难度统计数据</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- 控制按钮 -->
                        <div class="modal-controls">
                            <button id="modalResetStats" class="btn-danger">重置统计</button>
                            <button id="modalExportData" class="btn-secondary">导出数据</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindEvents() {
        // 关闭事件
        this.modal.querySelector('.close-modal').addEventListener('click', () => {
            this.hide();
        });
        
        this.modal.querySelector('.modal-overlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hide();
            }
        });
        
        // 控制按钮事件
        const resetBtn = document.getElementById('modalResetStats');
        const exportBtn = document.getElementById('modalExportData');
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('确定要重置所有统计数据吗？此操作不可撤销。')) {
                    statsManager.resetStats();
                    this.updateContent();
                    this.showToast('统计数据已重置');
                }
            });
        }
        
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                // 暂时禁用导出功能
                this.showToast('导出功能开发中');
            });
        }
    }
    
    show() {
        if (!this.isInitialized) this.init();

        this.modal.classList.add('show');
        this.updateContent();
    }
    
    hide() {
        if (this.modal) {
            this.modal.classList.remove('show');
        }
    }
    
    /**
 * 更新分类统计信息（显示数量和百分比）
 */
updateCategoryStats(categories) {
    if (!categories) {
        console.log('⚠️ 没有分类统计数据');
        this.resetCategoryStats();
        return;
    }
    
    // 基准音统计 - 显示数量和百分比
    if (categories.baseNotes) {
        // C基准音
        const cStats = categories.baseNotes.C || { questions: 0, correct: 0, accuracy: 0 };
        this.updateCategoryProgressBar('modalCBase', cStats, 'C基准音');
        
        // A基准音
        const aStats = categories.baseNotes.A || { questions: 0, correct: 0, accuracy: 0 };
        this.updateCategoryProgressBar('modalABase', aStats, 'A基准音');
    } else {
        this.updateCategoryProgressBar('modalCBase', { questions: 0, correct: 0, accuracy: 0 }, 'C基准音');
        this.updateCategoryProgressBar('modalABase', { questions: 0, correct: 0, accuracy: 0 }, 'A基准音');
    }
    
    // 音级类型统计 - 显示数量和百分比
    if (categories.noteTypes) {
        // 自然音级
        const naturalStats = categories.noteTypes.natural || { questions: 0, correct: 0, accuracy: 0 };
        this.updateCategoryProgressBar('modalNatural', naturalStats, '自然音级');
        
        // 变化音级
        const accidentalStats = categories.noteTypes.accidental || { questions: 0, correct: 0, accuracy: 0 };
        this.updateCategoryProgressBar('modalAccidental', accidentalStats, '变化音级');
    } else {
        this.updateCategoryProgressBar('modalNatural', { questions: 0, correct: 0, accuracy: 0 }, '自然音级');
        this.updateCategoryProgressBar('modalAccidental', { questions: 0, correct: 0, accuracy: 0 }, '变化音级');
    }
    
    // 调性统计 - 新增调性统计显示
    if (categories.keys) {
        this.updateKeyStats(categories.keys);
    } else {
        this.updateKeyStats({});
    }
    
    // 难度统计 - 新增难度统计显示
    if (categories.difficulties) {
        this.updateDifficultyStats(categories.difficulties);
    } else {
        this.updateDifficultyStats({});
    }
}

/**
 * 更新分类进度条（显示数量和百分比）
 */
updateCategoryProgressBar(prefix, stats, label) {
    const progressFill = document.getElementById(`${prefix}Progress`);
    const progressValue = document.getElementById(`${prefix}Value`);
    const progressLabel = document.querySelector(`[data-label="${prefix}"]`);
    
    // 更新标签显示具体数量
    if (progressLabel) {
        progressLabel.textContent = `${label} (${stats.correct}/${stats.questions})`;
    }
    
    // 更新进度条和数值
    if (progressFill && progressValue) {
        const displayValue = stats.accuracy || 0;
        progressFill.style.width = `${displayValue}%`;
        progressValue.textContent = `${displayValue}%`;
    }
}

/**
 * 更新调性统计 - 使用进度条样式
 */
updateKeyStats(keys) {
    const keysContainer = document.getElementById('modalKeyStats');
    if (!keysContainer) return;
    
    let html = '';
    const keyOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const keyNames = {
        'C': 'C调', 'D': 'D调', 'E': 'E调', 'F': 'F调', 
        'G': 'G调', 'A': 'A调', 'B': 'B调'
    };
    
    keyOrder.forEach(key => {
        const stats = keys[key] || { questions: 0, correct: 0, accuracy: 0 };
        if (stats.questions > 0) {
            html += `
                <div class="progress-item">
                    <div class="progress-label" data-label="modalKey${key}">${keyNames[key]} (${stats.correct}/${stats.questions})</div>
                    <div class="progress-bar">
                        <div class="progress-fill key-${key.toLowerCase()}" id="modalKey${key}Progress" style="width: ${stats.accuracy}%"></div>
                    </div>
                    <div class="progress-value" id="modalKey${key}Value">${stats.accuracy}%</div>
                </div>
            `;
        }
    });
    
    if (html) {
        keysContainer.innerHTML = html;
    } else {
        keysContainer.innerHTML = '<div class="no-data">暂无调性统计数据</div>';
    }
}

/**
 * 更新难度统计 - 使用进度条样式
 */
updateDifficultyStats(difficulties) {
    const difficultiesContainer = document.getElementById('modalDifficultyStats');
    if (!difficultiesContainer) return;
    
    let html = '';
    const difficultyMap = {
        'basic': { name: '基础难度', class: 'basic' },
        'extended': { name: '扩展难度', class: 'extended' }
    };
    
    Object.entries(difficultyMap).forEach(([key, info]) => {
        const stats = difficulties[key] || { questions: 0, correct: 0, accuracy: 0 };
        if (stats.questions > 0) {
            html += `
                <div class="progress-item">
                    <div class="progress-label" data-label="modal${info.name}">${info.name} (${stats.correct}/${stats.questions})</div>
                    <div class="progress-bar">
                        <div class="progress-fill ${info.class}" id="modal${info.name}Progress" style="width: ${stats.accuracy}%"></div>
                    </div>
                    <div class="progress-value" id="modal${info.name}Value">${stats.accuracy}%</div>
                </div>
            `;
        }
    });
    
    if (html) {
        difficultiesContainer.innerHTML = html;
    } else {
        difficultiesContainer.innerHTML = '<div class="no-data">暂无难度统计数据</div>';
    }
}

/**
 * 重置分类统计显示
 */
resetCategoryStats() {
    // 重置基准音统计
    this.updateCategoryProgressBar('modalCBase', { questions: 0, correct: 0, accuracy: 0 }, 'C基准音');
    this.updateCategoryProgressBar('modalABase', { questions: 0, correct: 0, accuracy: 0 }, 'A基准音');
    
    // 重置音级类型统计
    this.updateCategoryProgressBar('modalNatural', { questions: 0, correct: 0, accuracy: 0 }, '自然音级');
    this.updateCategoryProgressBar('modalAccidental', { questions: 0, correct: 0, accuracy: 0 }, '变化音级');
    
    // 重置调性统计
    const keysContainer = document.getElementById('modalKeyStats');
    if (keysContainer) {
        keysContainer.innerHTML = '<div class="no-data">暂无调性统计数据</div>';
    }
    
    // 重置难度统计
    const difficultiesContainer = document.getElementById('modalDifficultyStats');
    if (difficultiesContainer) {
        difficultiesContainer.innerHTML = '<div class="no-data">暂无难度统计数据</div>';
    }
}

updateContent() {
    try {
        // 检查 statsManager 是否可用
        if (!statsManager || typeof statsManager.getStats !== 'function') {
            console.error('❌ statsManager 不可用或缺少 getStats 方法');
            this.showToast('统计数据暂不可用');
            return;
        }
        
        const stats = statsManager.getStats();
        
        
        // 更新总体统计
        this.updateElement('modalTotalPlays', stats.totalQuestions || 0);
        this.updateElement('modalTotalCorrect', stats.totalCorrect || 0);
        
        // 使用总正确率而不是今日正确率
        const totalAccuracy = stats.totalAccuracyRate || 
            (stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0);
        this.updateElement('modalTotalAccuracy', `${totalAccuracy}%`);
        
        this.updateElement('modalMaxStreak', stats.maxStreak || 0);
        
        // 更新今日统计
        this.updateElement('modalTodayPlays', stats.completed || 0);
        this.updateElement('modalTodayCorrect', stats.mastered || 0);
        this.updateElement('modalTodayAccuracy', `${stats.masteryRate || 0}%`);
        this.updateElement('modalCurrentStreak', stats.currentStreak || 0);
        
        // 确保调用新的分类统计方法
        this.updateCategoryStats(stats.categories);
        
    } catch (error) {
        console.error('❌ 更新模态框内容失败:', error);
        this.showToast('加载统计数据失败');
    }
}

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
    
    showToast(message) {
        // 简单的提示信息显示
        const toast = document.createElement('div');
        toast.className = 'stats-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 2000);
    }
}

// 创建单例并导出
const statsModal = new StatsModal();
export { statsModal };
export default statsModal;