import { MobileContentLoader } from './mobile-content-loader.js';
import AppGlobal from '../core/app.js';
import { AppState } from '../core/state.js';

function initMobileTabs() {
    
    const tabBtns = document.querySelectorAll('.mobile-tab-btn');
    const tabContents = document.querySelectorAll('.mobile-tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // 移除所有激活状态
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // 激活当前标签
            btn.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

function initCategoryStats() {
    
    // 增加延迟时间确保 DOM 完全就绪
    setTimeout(() => {
        try {
            // 折叠/展开功能
            const categoryTitles = document.querySelectorAll('.mobile-category-title');
            
            if (categoryTitles.length === 0) {
                console.warn('⚠️ 未找到分类标题元素，DOM 还未准备好');
                return;
            }
            
            // 先移除之前可能绑定的事件（避免重复）
            categoryTitles.forEach(title => {
                const cloned = title.cloneNode(true);
                title.parentNode.replaceChild(cloned, title);
            });
            
            // 重新获取元素并绑定事件
            document.querySelectorAll('.mobile-category-title').forEach(title => {
                title.addEventListener('click', () => {
                    const group = title.closest('.mobile-category-group');
                    if (group) {
                        group.classList.toggle('expanded');
                        console.log(`📁 ${group.classList.contains('expanded') ? '展开' : '折叠'}分类组`);
                    }
                });
                
                // 同时绑定 touchstart 确保移动端响应
                title.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    const group = title.closest('.mobile-category-group');
                    if (group) {
                        group.classList.toggle('expanded');
                    }
                });
            });
            
            // 展开全部按钮
            const expandAllBtn = document.querySelector('.mobile-expand-all');
            if (expandAllBtn) {
                const cloned = expandAllBtn.cloneNode(true);
                expandAllBtn.parentNode.replaceChild(cloned, expandAllBtn);
                
                document.querySelector('.mobile-expand-all').addEventListener('click', () => {
                    const allGroups = document.querySelectorAll('.mobile-category-group');
                    const isAnyExpanded = Array.from(allGroups).some(g => g.classList.contains('expanded'));
                    
                    allGroups.forEach(group => {
                        group.classList.toggle('expanded', !isAnyExpanded);
                    });
                    
                    document.querySelector('.mobile-expand-all').textContent = isAnyExpanded ? '展开全部' : '收起全部';
                });
            }
        } catch (error) {
            console.error('❌ 分类统计交互初始化失败:', error);
        }
    }, 300);
}

// 移动端面板管理器
class MobilePanelManager {
    constructor() {        
        this.leftPanel = document.getElementById('mobileLeftPanel');
        this.rightPanel = document.getElementById('mobileRightPanel');
        this.overlay = document.getElementById('mobilePanelOverlay');
        this.isOpen = false;
        this.isReadyForSwipe = false;
        this.startX = 0;
        this.currentX = 0;
        this.swipeThreshold = 60;
        this.dataSynced = false; 
        this.tabs = {
            stats: document.getElementById('statsTabBtn'),
            history: document.getElementById('historyTabBtn'),
            statsContent: document.getElementById('statsTab'),
            historyContent: document.getElementById('historyTab')
        };

        this.initMobileStatsManager();
        this.initEvents();
        this.restoreLastActiveTab(); 
        setTimeout(() => this.initTouchEvents(), 100);
    }
    
    async initMobileStatsManager() {
        try {
            const mobileStatsModule = await import('./mobile-stats-manager.js');
            window.mobileStatsManager = mobileStatsModule.default;
        } catch (error) {
            console.error('❌ 移动端统计管理器初始化失败:', error);
        }
    }
    
    initEvents() {
        const settingBtn = document.querySelector('.mobile-control-btn.setting-btn');
        if (settingBtn) settingBtn.addEventListener('click', () => this.openLeftPanel());

        const historyBtn = document.querySelector('.mobile-control-btn.history-btn');
        if (historyBtn) historyBtn.addEventListener('click', () => this.openRightPanelWithDataLoad());

        const detailBtn = document.querySelector('.expand-detail-btn');
        if (detailBtn) detailBtn.addEventListener('click', () => this.openDetailPanel());

        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.closeAllPanels());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.closeAllPanels();
        });

        // 标签事件
        this.tabs.stats?.addEventListener('click', () => this.switchTab('stats'));
        this.tabs.history?.addEventListener('click', () => this.switchTab('history'));
    }
    switchTab(tabName) {
        this.tabs.stats?.classList.toggle('active', tabName === 'stats');
        this.tabs.history?.classList.toggle('active', tabName === 'history');
        this.tabs.statsContent?.classList.toggle('active', tabName === 'stats');
        this.tabs.historyContent?.classList.toggle('active', tabName === 'history');
        localStorage.setItem('lastActiveTab', tabName);
    }

    restoreLastActiveTab() {
        const lastTab = localStorage.getItem('lastActiveTab') || 'stats';
        this.switchTab(lastTab);
    }
    initTouchEvents() {
        if (this.overlay) this.addSwipeToDismiss(this.overlay);
        [this.leftPanel, this.rightPanel].forEach(panel => panel && this.addSwipeToDismiss(panel));
        this.bindTabSwipeEvent();
    }

    bindTabSwipeEvent() {
        if (!this.rightPanel) return;
        let startX = 0;
        this.rightPanel.addEventListener('touchstart', e => startX = e.touches[0].clientX);
        this.rightPanel.addEventListener('touchend', e => {
            if (!this.rightPanel.classList.contains('active')) return;
            const diffX = e.changedTouches[0].clientX - startX;
            if (diffX > this.swipeThreshold) this.switchTab('stats');
            if (diffX < -this.swipeThreshold) this.switchTab('history');
        });
    }

    addSwipeToDismiss(element) {
        let startX = 0;
        let currentX = 0;
        let isSwiping = false;

        element.addEventListener('touchstart', (e) => {
            if (!this.isOpen || !this.isReadyForSwipe) return;
            
            startX = e.touches[0].clientX;
            currentX = startX;
            isSwiping = true;
            
            if (this.leftPanel?.classList.contains('active')) {
                this.leftPanel.classList.add('swiping');
            }
            if (this.rightPanel?.classList.contains('active')) {
                this.rightPanel.classList.add('swiping');
            }
            this.overlay?.classList.add('swiping');
        });

        element.addEventListener('touchmove', (e) => {
            if (!this.isOpen || !this.isReadyForSwipe || !isSwiping) return;
            
            currentX = e.touches[0].clientX;
            const deltaX = currentX - startX;
            
            if (Math.abs(deltaX) > 10) {
                requestAnimationFrame(() => {
                    try {
                        if (this.leftPanel?.classList.contains('active')) {
                            const progress = Math.max(0, Math.min(1, -deltaX / window.innerWidth));
                            this.leftPanel.style.transform = `translateX(${-100 + progress * 100}%)`;
                            this.updateOverlayOpacity(1 - progress);
                        } else if (this.rightPanel?.classList.contains('active')) {
                            const progress = Math.max(0, Math.min(1, deltaX / window.innerWidth));
                            this.rightPanel.style.transform = `translateX(${100 - progress * 100}%)`;
                            this.updateOverlayOpacity(1 - progress);
                        }
                    } catch (error) {
                        console.warn('滑动处理错误:', error);
                    }
                });
            }
        });

        element.addEventListener('touchend', () => {
            if (!this.isOpen || !this.isReadyForSwipe || !isSwiping) {
                this.clearSwipeState();
                return;
            }
            
            const deltaX = currentX - startX;
            const isLeftPanel = this.leftPanel?.classList.contains('active');
            const isRightPanel = this.rightPanel?.classList.contains('active');
            
            let shouldClose = false;
            
            if (isLeftPanel && deltaX < -this.swipeThreshold) {
                shouldClose = true;
            } else if (isRightPanel && deltaX > this.swipeThreshold) {
                shouldClose = true;
            }
            
            if (shouldClose) {
                this.closePanelWithSwipe();
            } else {
                this.resetPanelTransform();
            }
            
            this.clearSwipeState();
        });

        this.addMouseSwipeSupport(element);
    }

    addMouseSwipeSupport(element) {
        let startX = 0;
        let currentX = 0;
        let isSwiping = false;

        element.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return;
            if (!this.isOpen || !this.isReadyForSwipe) return;
            
            startX = e.clientX;
            currentX = startX;
            isSwiping = true;
            
            if (this.leftPanel?.classList.contains('active')) {
                this.leftPanel.classList.add('swiping');
            }
            if (this.rightPanel?.classList.contains('active')) {
                this.rightPanel.classList.add('swiping');
            }
            this.overlay?.classList.add('swiping');
            
            const handleMouseMove = (e) => {
                if (!this.isOpen || !this.isReadyForSwipe || !isSwiping) return;
                
                currentX = e.clientX;
                const deltaX = currentX - startX;
                
                if (Math.abs(deltaX) > 10) {
                    requestAnimationFrame(() => {
                        if (this.leftPanel?.classList.contains('active')) {
                            const progress = Math.max(0, Math.min(1, -deltaX / window.innerWidth));
                            this.leftPanel.style.transform = `translateX(${-100 + progress * 100}%)`;
                            this.updateOverlayOpacity(1 - progress);
                        } else if (this.rightPanel?.classList.contains('active')) {
                            const progress = Math.max(0, Math.min(1, deltaX / window.innerWidth));
                            this.rightPanel.style.transform = `translateX(${100 - progress * 100}%)`;
                            this.updateOverlayOpacity(1 - progress);
                        }
                    });
                }
            };
            
            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
                
                if (!this.isOpen || !this.isReadyForSwipe || !isSwiping) {
                    this.clearSwipeState();
                    return;
                }
                
                const deltaX = currentX - startX;
                const isLeftPanel = this.leftPanel?.classList.contains('active');
                const isRightPanel = this.rightPanel?.classList.contains('active');
                
                let shouldClose = false;
                
                if (isLeftPanel && deltaX < -this.swipeThreshold) {
                    shouldClose = true;
                } else if (isRightPanel && deltaX > this.swipeThreshold) {
                    shouldClose = true;
                }
                
                if (shouldClose) {
                    this.closePanelWithSwipe();
                } else {
                    this.resetPanelTransform();
                }
                
                this.clearSwipeState();
                isSwiping = false;
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
    }

    clearSwipeState() {
        setTimeout(() => {
            this.leftPanel?.classList.remove('swiping');
            this.rightPanel?.classList.remove('swiping');
            this.overlay?.classList.remove('swiping');
        }, 50);
    }

    resetPanelTransform() {
        if (this.leftPanel?.classList.contains('active')) {
            this.leftPanel.style.transform = 'translateX(0)';
        }
        if (this.rightPanel?.classList.contains('active')) {
            this.rightPanel.style.transform = 'translateX(0)';
        }
        
        setTimeout(() => {
            this.leftPanel?.classList.remove('swiping');
            this.rightPanel?.classList.remove('swiping');
            this.leftPanel?.style.removeProperty('transform');
            this.rightPanel?.style.removeProperty('transform');
        }, 50);
        
        this.updateOverlayOpacity(1);
    }

    closePanelWithSwipe() {
        const isLeftPanel = this.leftPanel?.classList.contains('active');
        const isRightPanel = this.rightPanel?.classList.contains('active');
        
        if (isLeftPanel) {
            this.leftPanel.style.transition = 'transform 0.25s ease-out';
            this.leftPanel.style.transform = 'translateX(-100%)';
        } else if (isRightPanel) {
            this.rightPanel.style.transition = 'transform 0.25s ease-out';
            this.rightPanel.style.transform = 'translateX(100%)';
        }
        
        this.overlay.style.transition = 'opacity 0.25s ease-out';
        this.overlay.style.opacity = '0';
        
        setTimeout(() => {
            this.closeAllPanels();
            this.leftPanel?.style.removeProperty('transition');
            this.rightPanel?.style.removeProperty('transition');
            this.overlay.style.removeProperty('transition');
            this.overlay.style.removeProperty('opacity');
        }, 250);
    }

    updateOverlayOpacity(progress) {
        if (this.overlay) this.overlay.style.opacity = progress.toString();
    }

    openLeftPanel() {
        this.closeAllPanels();
        this.leftPanel?.classList.add('active');
        this.overlay?.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        MobileContentLoader.loadLeftPanelContent();
        setTimeout(() => {
            MobileContentLoader.initMobileAutoNextStepper();
            this.isReadyForSwipe = true;
        }, 100);
    }

    async openRightPanelWithDataLoad() {
        this.closeAllPanels();
        this.rightPanel?.classList.add('active');
        this.overlay?.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        if (!this.dataSynced) {
            this.showLoading();
            await this.syncAllData();
            this.dataSynced = true;
            this.hideLoading();
        }
        setTimeout(() => this.isReadyForSwipe = true, 300);
    }

    openDetailPanel() {
        const simplePanel = document.getElementById('simplePanel');
        if (simplePanel) {
            simplePanel.style.display = 'block';
            simplePanel.classList.add('active', 'mobile-active');
            
            const closeBtn = simplePanel.querySelector('.panel-close');
            if (closeBtn) {
                closeBtn.onclick = () => {
                    simplePanel.style.display = 'none';
                    simplePanel.classList.remove('active', 'mobile-active');
                };
            }
        }
    }

    closeAllPanels() {
        this.leftPanel?.classList.remove('active');
        this.rightPanel?.classList.remove('active');
        this.overlay?.classList.remove('active');
        this.isOpen = false;
        this.isReadyForSwipe = false;
        document.body.style.overflow = '';
        this.resetPanelTransform();
        this.clearSwipeState();
    }

       async syncAllData() {
        try {
            const syncHistory = AppGlobal.getTool('updateAllHistoryDisplays');
            if (syncHistory) {
                syncHistory();
                this.cacheHistoryData();
            } else {
                this.loadHistoryFromCache();
            }
            await this.copyDesktopStatsToMobile();
            this.cacheStatsData();
        } catch (error) {
            console.error('❌ 右侧面板数据同步失败:', error);
            this.showErrorMsg('数据加载失败，显示缓存内容');
            this.loadHistoryFromCache();
            this.loadStatsFromCache();
        }
    }
    copyDesktopStatsToMobile() {
        setTimeout(() => {            
            // 同步基础统计数据
            const mappings = [
                { desktop: 'totalExercises', mobile: 'mobileTotalExercises' },
                { desktop: 'totalAccuracyRate', mobile: 'mobileTotalAccuracyRate' },
                { desktop: 'totalPlays', mobile: 'mobileTotalPlays' },
                { desktop: 'correctCount', mobile: 'mobileCorrectCount' },
                { desktop: 'accuracyRate', mobile: 'mobileAccuracyRate' },
                { desktop: 'currentStreak-label', mobile: 'mobileCurrentStreak' },
                { desktop: 'maxStreak-label', mobile: 'mobileMaxStreak' }
            ];
            
            mappings.forEach(mapping => {
                const desktopElement = document.getElementById(mapping.desktop);
                const mobileElement = document.getElementById(mapping.mobile);
                
                if (desktopElement && mobileElement) {
                    mobileElement.textContent = desktopElement.textContent;
                }
            });
            
            this.syncHistoryToMobile();
            
            // 🔥 关键修复：直接调用桌面端的详细统计更新函数
            this.syncDetailedStatsFromDesktop();
            
            // 数据同步完成后，再初始化交互
            initCategoryStats();
            this.cacheStatsData();
        }, 50);
    }
    
    // 直接从桌面端同步详细统计数据
    async syncDetailedStatsFromDesktop() {
        try {
            // 方法1：尝试调用桌面端的统计更新函数
            const updateRightPanelStats = AppGlobal.getTool('updateRightPanelStats');
            if (updateRightPanelStats) {
                
                // 使用动态导入获取统计管理器
                const statsManagerModule = await import('../quiz/stats-manager.js');
                const statsManager = statsManagerModule.default;
                const stats = statsManager.getStats();
                
                // 调用桌面端函数来更新移动端显示
                updateRightPanelStats(stats);
                
                // 额外触发分类统计更新
                this.updateMobileCategoryStats(stats.categories);
                
            } else {
                console.warn('⚠️ 未找到桌面端统计更新函数，尝试直接使用统计管理器数据');
                // 方法2：直接使用统计管理器数据
                await this.syncStatsDirectly();
            }
        } catch (error) {
            console.error('❌ 同步详细统计失败:', error);
        }
    }
    
    // 方法2：直接使用统计管理器数据
    async syncStatsDirectly() {
        try {
            console.log('🔄 直接使用统计管理器数据...');
            const statsManagerModule = await import('../quiz/stats-manager.js');
            const statsManager = statsManagerModule.default;
            const stats = statsManager.getStats();
            
            console.log('📊 获取到的统计数据:', stats);
            this.updateMobileCategoryStats(stats.categories);
            
        } catch (error) {
            console.error('❌ 直接同步统计失败:', error);
        }
    }
    
    // 更新移动端分类统计
    updateMobileCategoryStats(categories) {
        if (!categories) {
            console.warn('⚠️ 没有分类统计数据');
            return;
        }
        
        // 更新调性统计
        if (categories.keys) {
            this.updateMobileKeyStats(categories.keys);
        }
        
        // 更新难度统计
        if (categories.difficulties) {
            this.updateMobileDifficultyStats(categories.difficulties);
        }
        
        // 更新基准音统计
        if (categories.baseNotes) {
            this.updateMobileBaseNotes(categories.baseNotes);
        }
        
        // 更新音级类型统计
        if (categories.noteTypes) {
            this.updateMobileNoteTypes(categories.noteTypes);
        }
    }
    
    // 更新移动端调性统计
    updateMobileKeyStats(keys) {
        const container = document.getElementById('mobileKeyStats');
        if (!container) {
            console.warn('⚠️ 移动端调性统计容器未找到');
            return;
        }
        
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
    
    // 更新移动端难度统计
    updateMobileDifficultyStats(difficulties) {
        const container = document.getElementById('mobileDifficultyStats');
        if (!container) {
            console.warn('⚠️ 移动端难度统计容器未找到');
            return;
        }
        
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
    
    // 更新移动端基准音统计
    updateMobileBaseNotes(baseNotes) {
        if (baseNotes.C) {
            this.updateMobileProgressItem('c-base', baseNotes.C, 'C基准音');
        }
        if (baseNotes.A) {
            this.updateMobileProgressItem('a-base', baseNotes.A, 'A基准音');
        }
    }
    
    // 更新移动端音级类型统计
    updateMobileNoteTypes(noteTypes) {
        if (noteTypes.natural) {
            this.updateMobileProgressItem('natural', noteTypes.natural, '自然音级');
        }
        if (noteTypes.accidental) {
            this.updateMobileProgressItem('accidental', noteTypes.accidental, '变化音级');
        }
    }
    
    // 通用的移动端进度项更新
    updateMobileProgressItem(className, stats, label) {
        const progressItems = document.querySelectorAll('.mobile-progress-item');
        let found = false;
        
        progressItems.forEach(item => {
            const itemLabel = item.querySelector('.mobile-progress-label');
            if (itemLabel && itemLabel.textContent.includes(label)) {
                const progressFill = item.querySelector(`.mobile-progress-fill.${className}`);
                const progressValue = item.querySelector('.mobile-progress-value');
                
                if (progressFill && progressValue) {
                    const accuracy = stats.accuracy || 0;
                    progressFill.style.width = `${accuracy}%`;
                    progressValue.textContent = `${accuracy}%`;
                    itemLabel.textContent = `${label} (${stats.correct || 0}/${stats.questions || 0})`;
                    found = true;
                }
            }
        });
        
        if (!found) {
            console.warn(`⚠️ 未找到移动端进度项: ${label}`);
        }
    }

    
    syncHistoryToMobile() {
        const updateAllHistoryDisplays = AppGlobal.getTool('updateAllHistoryDisplays');
        if (updateAllHistoryDisplays) {
            updateAllHistoryDisplays();
            this.cacheHistoryData(); // 同步后立即缓存
        } else {
            console.warn('⚠️ 历史记录更新工具未找到');
        }
    }

    cacheHistoryData() {
        if (this.tabs.historyContent) {
            localStorage.setItem('cachedHistory', this.tabs.historyContent.innerHTML);
        }
    }
    cacheStatsData() {
        if (this.tabs.statsContent) {
            localStorage.setItem('cachedStats', this.tabs.statsContent.innerHTML);
        }
    }
    loadHistoryFromCache() {
        const cached = localStorage.getItem('cachedHistory');
        if (cached && this.tabs.historyContent) this.tabs.historyContent.innerHTML = cached;
    }
    loadStatsFromCache() {
        const cached = localStorage.getItem('cachedStats');
        if (cached && this.tabs.statsContent) this.tabs.statsContent.innerHTML = cached;
    }

    showLoading() {
        this.rightPanel?.classList.add('loading');
    }
    hideLoading() {
        this.rightPanel?.classList.remove('loading');
    }
    showErrorMsg(msg) {
        const msgEl = document.createElement('div');
        msgEl.className = 'panel-error';
        msgEl.textContent = msg;
        this.rightPanel?.prepend(msgEl);
        setTimeout(() => msgEl.remove(), 3000);
    }
}

// 初始化函数
export function initMobilePanels() {
    try {
        const manager = new MobilePanelManager();
        window.mobilePanelManager = manager;
        
        initMobileTabs();
        initCategoryStats();
        return manager;
    } catch (error) {
        console.error('❌ 移动端面板管理器初始化失败:', error);
        return null;
    }
}

export { MobilePanelManager };