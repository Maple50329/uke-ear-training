import { updateRange } from './range-manager.js';

export class MobileContentLoader {
    // 填充左侧设置面板
    static loadLeftPanelContent() {
        const leftPanelContent = document.querySelector('#mobileLeftPanel .panel-content');
        if (!leftPanelContent) return;

        leftPanelContent.innerHTML = `
            <div class="mobile-settings-section">
                <!-- 音域设置 -->
                <div class="mobile-settings-group">
                    <div class="mobile-settings-title">音域设置</div>
                    <div class="mobile-range-buttons" style="display: flex; gap: 8px;">
                        <button class="mobile-range-btn active" data-range="low">小字组</button>
                        <button class="mobile-range-btn" data-range="mid">小字一组</button>
                    </div>
                </div>

                <!-- 基准音设置 -->
                <div class="mobile-settings-group">
                    <div class="mobile-settings-title">基准音设置</div>
                    <div class="mobile-mode-buttons" style="display: flex; gap: 8px;">
                        <button class="mobile-mode-btn active" data-mode="c">固定C</button>
                        <button class="mobile-mode-btn" data-mode="a">固定A</button>
                    </div>
                </div>

                <!-- 调性选择 -->
                <div class="mobile-settings-group">
                    <div class="mobile-settings-title">调性选择</div>
                    <select id="mobileKeySelect">
                        <option value="C">C大调</option>
                        <option value="D">D大调</option>
                        <option value="E">E大调</option>
                        <option value="F">F大调</option>
                        <option value="G">G大调</option>
                        <option value="A">A大调</option>
                        <option value="B">B大调</option>
                    </select>
                </div>

                <!-- 难度选择 -->
                <div class="mobile-settings-group">
                    <div class="mobile-settings-title">难度选择</div>
                    <select id="mobileDifficultySelect">
                        <option value="basic">仅基本音级</option>
                        <option value="extended">含变化音级</option>
                    </select>
                </div>

                <!-- 播放选项 -->
                <div class="mobile-settings-group">
                <div class="mobile-settings-title">播放选项</div>
                
                <!-- 自动下一音选项 - 使用步进按钮 -->
                <div class="mobile-settings-option">
                    <div class="checkbox-with-buttons">
                        <label class="checkbox-label">
                            <input type="checkbox" id="mobileAutoNextCheckbox">
                            <span class="checkbox-text">自动下一音</span>
                        </label>
                        <div class="time-controls">
                            <button class="time-btn minus" type="button" disabled="true">-</button>
                            <span class="time-value" id="mobileAutoNextTimeValue">3秒</span>
                            <button class="time-btn plus" type="button" disabled="true">+</button>
                        </div>
                    </div>
                </div>
                
                <!-- 先播放音阶选项 -->
                <div class="mobile-settings-option">
                    <label class="checkbox-label">
                        <input type="checkbox" id="mobileScalePlaybackCheckbox" checked>
                        <span class="checkbox-text">先播放音阶</span>
                    </label>
                </div>
            </div>
            </div>
        `;

        // 绑定事件
        this.bindLeftPanelEvents();
    }

    // 绑定左侧面板事件
    static bindLeftPanelEvents() {
        // 音域按钮
        document.querySelectorAll('.mobile-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = e.target.dataset.range;
                document.querySelectorAll('.mobile-range-btn').forEach(b => {
                    b.style.background = b === e.target ? 'var(--accent-color)' : 'var(--btn-sec)';
                    b.style.color = b === e.target ? 'white' : 'var(--text)';
                });
                updateRange(range);
            });
        });

        // 基准音按钮
        document.querySelectorAll('.mobile-mode-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const mode = e.target.dataset.mode;
                document.querySelectorAll('.mobile-mode-btn').forEach(b => {
                    b.style.background = b === e.target ? 'var(--accent-color)' : 'var(--btn-sec)';
                    b.style.color = b === e.target ? 'white' : 'var(--text)';
                });
                // 同步到桌面端模式按钮
                const desktopBtn = document.querySelector(`.mode-btn[data-mode="${mode}"]`);
                if (desktopBtn) {
                    desktopBtn.click();
                }
            });
        });

        // 同步选择框状态
        const keySelect = document.getElementById('keySelect');
        const mobileKeySelect = document.getElementById('mobileKeySelect');
        if (keySelect && mobileKeySelect) {
            mobileKeySelect.value = keySelect.value;
            mobileKeySelect.addEventListener('change', () => {
                keySelect.value = mobileKeySelect.value;
                keySelect.dispatchEvent(new Event('change'));
            });
        }

        const difficultySelect = document.getElementById('difficultySelect');
        const mobileDifficultySelect = document.getElementById('mobileDifficultySelect');
        if (difficultySelect && mobileDifficultySelect) {
            mobileDifficultySelect.value = difficultySelect.value;
            mobileDifficultySelect.addEventListener('change', () => {
                difficultySelect.value = mobileDifficultySelect.value;
                difficultySelect.dispatchEvent(new Event('change'));
            });
        }

        // 同步复选框状态
        const autoNextCheckbox = document.getElementById('autoNextCheckbox');
        const mobileAutoNextCheckbox = document.getElementById('mobileAutoNextCheckbox');
        if (autoNextCheckbox && mobileAutoNextCheckbox) {
            mobileAutoNextCheckbox.checked = autoNextCheckbox.checked;
            mobileAutoNextCheckbox.addEventListener('change', () => {
                autoNextCheckbox.checked = mobileAutoNextCheckbox.checked;
            });
        }

        const scalePlaybackCheckbox = document.getElementById('enableScalePlayback');
        const mobileScalePlaybackCheckbox = document.getElementById('mobileScalePlaybackCheckbox');
        if (scalePlaybackCheckbox && mobileScalePlaybackCheckbox) {
            mobileScalePlaybackCheckbox.checked = scalePlaybackCheckbox.checked;
            mobileScalePlaybackCheckbox.addEventListener('change', () => {
                scalePlaybackCheckbox.checked = mobileScalePlaybackCheckbox.checked;
            });
        }
    }

    // 更新右侧面板统计
    static updateRightPanelStats(stats) {
        if (!stats) return;

        // 更新统计数字
        const elements = {
            'mobileTotalPlays': `${stats.completed || 0}题`,
            'mobileCorrectCount': `${stats.mastered || 0}题`,
            'mobileAccuracyRate': `${stats.masteryRate || 0}%`,
            'mobileCurrentStreak': `${stats.currentStreak || 0}连胜`,
            'mobileMaxStreak': `${stats.maxStreak || 0}连胜`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    // 更新历史记录显示
    static updateHistoryDisplay(history) {
        const historyList = document.getElementById('mobileHistoryList');
        if (!historyList) return;

        if (!history || history.length === 0) {
            historyList.innerHTML = '<div class="mobile-history-empty">暂无播放记录</div>';
            return;
        }

        let html = '';
        history.slice(0, 10).forEach(entry => {
            const time = new Date(entry.timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            html += `
                <div class="mobile-history-item ${entry.correct ? 'correct' : 'incorrect'}">
                    <div class="mobile-history-note">${entry.note}</div>
                    <div class="mobile-history-info">
                        <span class="mobile-history-time">${time}</span>
                        <span class="mobile-history-status ${entry.correct ? 'correct' : 'incorrect'}">
                            ${entry.correct ? '✓' : '✗'}
                        </span>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = html;
    }

}

function initMobileAutoNextSlider() {
    console.log('🔄 初始化移动端自动下一音按钮...');
    
    const mobileCheckbox = document.getElementById('mobileAutoNextCheckbox');
    const mobileTimeValue = document.getElementById('mobileAutoNextTimeValue');
    const minusBtn = document.querySelector('.time-btn.minus');
    const plusBtn = document.querySelector('.time-btn.plus');
    
    if (!mobileCheckbox || !mobileTimeValue || !minusBtn || !plusBtn) {
        console.log('⏳ 移动端按钮元素尚未加载，等待重试...');
        return false;
    }
    
    console.log('✅ 找到移动端按钮元素');
    
    let currentTime = 3; // 默认3秒
    
    // 更新时间显示和按钮状态
    function updateTimeDisplay() {
        mobileTimeValue.textContent = currentTime + '秒';
        
        // 更新按钮禁用状态
        minusBtn.disabled = currentTime <= 1;
        plusBtn.disabled = currentTime >= 5;
        
        // 同步到桌面端
        const desktopSlider = document.getElementById('autoNextTimeSlider');
        const desktopValue = document.getElementById('autoNextTimeValue');
        
        if (desktopSlider) {
            desktopSlider.value = currentTime;
            if (desktopValue) {
                desktopValue.textContent = currentTime + '秒';
            }
        }
        
        console.log('⏱️ 更新时间:', currentTime + '秒');
    }
    
    // 减少时间
    minusBtn.addEventListener('click', function() {
        if (this.disabled) return;
        currentTime = Math.max(1, currentTime - 1);
        updateTimeDisplay();
    });
    
    // 增加时间
    plusBtn.addEventListener('click', function() {
        if (this.disabled) return;
        currentTime = Math.min(5, currentTime + 1);
        updateTimeDisplay();
    });
    
    // 更新滑块禁用状态的函数
    function updateControlsState() {
        const isChecked = mobileCheckbox.checked;
        minusBtn.disabled = !isChecked;
        plusBtn.disabled = !isChecked;
        mobileTimeValue.style.opacity = isChecked ? '1' : '0.6';
        
        console.log('🔄 更新控制状态:', isChecked ? '启用' : '禁用');
    }
    
    // 同步复选框状态
    const desktopCheckbox = document.getElementById('autoNextCheckbox');
    if (desktopCheckbox) {
        // 初始同步
        mobileCheckbox.checked = desktopCheckbox.checked;
        updateControlsState();
        updateTimeDisplay();
        
        // 从桌面端同步时间
        const desktopSlider = document.getElementById('autoNextTimeSlider');
        if (desktopSlider) {
            currentTime = parseInt(desktopSlider.value);
            updateTimeDisplay();
        }
        
        // 移动端复选框变化
        mobileCheckbox.addEventListener('change', function() {
            console.log('📱 移动端复选框变化:', this.checked);
            updateControlsState();
            desktopCheckbox.checked = this.checked;
            desktopCheckbox.dispatchEvent(new Event('change'));
        });
        
        // 桌面端复选框变化同步到移动端
        desktopCheckbox.addEventListener('change', function() {
            console.log('💻 桌面端复选框变化:', this.checked);
            mobileCheckbox.checked = this.checked;
            updateControlsState();
        });
    }
    
    console.log('✅ 移动端按钮初始化完成');
    return true;
}

// 在移动端面板加载完成后调用
export function onMobileContentLoaded() {
    
    // 尝试初始化，如果失败则重试
    let retryCount = 0;
    const maxRetries = 5;
    
    const tryInit = () => {
        const success = initMobileAutoNextSlider();
        if (!success && retryCount < maxRetries) {
            retryCount++;
            console.log(`🔄 第 ${retryCount} 次重试初始化滑块...`);
            setTimeout(tryInit, 200);
        }
    };
    
    tryInit();
}

// 在移动端面板打开时调用
export function onMobileLeftPanelOpen() {
    initMobileAutoNextSlider();
}
