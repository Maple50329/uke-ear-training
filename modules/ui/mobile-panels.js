import { MobileContentLoader } from './mobile-content-loader.js';
import AppGlobal from '../core/app.js';
import { AppState } from '../core/state.js';

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
        this.initEvents();
        // 延迟初始化触摸事件
        setTimeout(() => {
            this.initTouchEvents();
        }, 100);
    }

    initEvents() {
        // 设置按钮 - 打开左侧面板
        const settingBtn = document.querySelector('.mobile-control-btn.setting-btn');
        if (settingBtn) {
            settingBtn.addEventListener('click', () => {
                this.openLeftPanel();
            });
        }

        // 历史记录按钮 - 打开右侧面板
        const historyBtn = document.querySelector('.mobile-control-btn.history-btn');
        if (historyBtn) {
            historyBtn.addEventListener('click', () => {
                this.openRightPanel();
            });
        }

        // 详细按钮 - 打开浮动面板
        const detailBtn = document.querySelector('.expand-detail-btn');
        if (detailBtn) {
            detailBtn.addEventListener('click', () => {
                this.openDetailPanel();
            });
        }

        // 关闭按钮
        document.querySelectorAll('.panel-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeAllPanels();
            });
        });

        // 遮罩层点击关闭
        if (this.overlay) {
            this.overlay.addEventListener('click', () => {
                this.closeAllPanels();
            });
        }

        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.closeAllPanels();
            }
        });
    }

    initTouchEvents() {
        // 为遮罩层添加滑动事件
        if (this.overlay) {
            this.addSwipeToDismiss(this.overlay);
        }
        
        // 为面板本身也添加滑动事件
        [this.leftPanel, this.rightPanel].forEach(panel => {
            if (panel) {
                this.addSwipeToDismiss(panel);
            }
        });
    }

    addSwipeToDismiss(element) {
        let startX = 0;
        let currentX = 0;
        let isSwiping = false;

        element.addEventListener('touchstart', (e) => {
            // 只有在面板打开且准备好滑动时才处理
            if (!this.isOpen || !this.isReadyForSwipe) return;
            
            startX = e.touches[0].clientX;
            currentX = startX;
            isSwiping = true;
            
            // 添加滑动状态类
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
            
            // 只有在明显的水平滑动时才处理
            if (Math.abs(deltaX) > 10) {
                // 使用 requestAnimationFrame 来避免阻塞
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

        // 鼠标事件支持
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
        // 延迟清除滑动状态，确保动画完成
        setTimeout(() => {
            this.leftPanel?.classList.remove('swiping');
            this.rightPanel?.classList.remove('swiping');
            this.overlay?.classList.remove('swiping');
        }, 50);
    }

    resetPanelTransform() {
        // 恢复面板位置
        if (this.leftPanel?.classList.contains('active')) {
            this.leftPanel.style.transform = 'translateX(0)';
        }
        if (this.rightPanel?.classList.contains('active')) {
            this.rightPanel.style.transform = 'translateX(0)';
        }
        
        // 移除滑动类并恢复过渡
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
        
        // 添加关闭动画
        if (isLeftPanel) {
            this.leftPanel.style.transition = 'transform 0.25s ease-out';
            this.leftPanel.style.transform = 'translateX(-100%)';
        } else if (isRightPanel) {
            this.rightPanel.style.transition = 'transform 0.25s ease-out';
            this.rightPanel.style.transform = 'translateX(100%)';
        }
        
        this.overlay.style.transition = 'opacity 0.25s ease-out';
        this.overlay.style.opacity = '0';
        
        // 延迟关闭
        setTimeout(() => {
            this.closeAllPanels();
            // 恢复样式
            this.leftPanel?.style.removeProperty('transition');
            this.rightPanel?.style.removeProperty('transition');
            this.overlay.style.removeProperty('transition');
            this.overlay.style.removeProperty('opacity');
        }, 250);
    }

    updateOverlayOpacity(progress) {
        if (this.overlay) {
            this.overlay.style.opacity = progress.toString();
        }
    }

    openLeftPanel() {
        this.closeAllPanels();
        this.leftPanel?.classList.add('active');
        this.overlay?.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        // 延迟启用滑动，确保动画完成
        setTimeout(() => {
            this.isReadyForSwipe = true;
        }, 300);
        
        // 加载左侧面板内容
        MobileContentLoader.loadLeftPanelContent();
        
        // ✅ 确保自动下一音事件监听正常工作（延迟执行）
        setTimeout(() => {
            this.fixMobileAutoNextEvents();
            
            if (window.onMobileContentLoaded) {
                window.onMobileContentLoaded();
            }
        }, 400); // 稍微延迟，确保内容加载完成
    }

    openRightPanel() {
        this.closeAllPanels();
        this.rightPanel?.classList.add('active');
        this.overlay?.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        // 延迟启用滑动
        setTimeout(() => {
            this.isReadyForSwipe = true;
        }, 300);
        
        // 同步桌面端统计信息到移动端
        this.copyDesktopStatsToMobile();
    }

    openDetailPanel() {
        // 复用现有的浮动面板
        const simplePanel = document.getElementById('simplePanel');
        if (simplePanel) {
            simplePanel.style.display = 'block';
            simplePanel.classList.add('active', 'mobile-active');
            
            // 添加移动端关闭按钮事件
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
        this.isReadyForSwipe = false; // 重置滑动准备状态
        document.body.style.overflow = '';
        
        // 重置变换
        this.resetPanelTransform();
        this.clearSwipeState();
    }

// 移动端自动下一音事件监听和步进功能（从AppState恢复延迟时间）
fixMobileAutoNextEvents() {
    // 延迟执行，确保移动端元素已经加载
    setTimeout(() => {
        const mobileCheckbox = document.getElementById('mobileAutoNextCheckbox');
        const desktopCheckbox = document.getElementById('autoNextCheckbox');
        const mobileStepDown = document.querySelector('button.time-btn.minus');
        const mobileStepUp = document.querySelector('button.time-btn.plus');
        const mobileValueDisplay = document.getElementById('mobileAutoNextTimeValue');
        
        if (!mobileCheckbox || !mobileStepDown || !mobileStepUp || !mobileValueDisplay) {
            console.warn('❌ 移动端自动下一音元素未找到');
            return;
        }
        
        console.log('🔧 修复移动端自动下一音事件监听和步进功能...');
        
        // 移除可能存在的旧监听器
        const newCheckbox = mobileCheckbox.cloneNode(true);
        if (mobileCheckbox.parentNode) {
            mobileCheckbox.parentNode.replaceChild(newCheckbox, mobileCheckbox);
        }
        
        // 重新获取元素
        const fixedCheckbox = document.getElementById('mobileAutoNextCheckbox');
        
        // 自动下一音延迟时间（秒）- 范围1-5秒，默认3秒
        let autoNextDelay = 3;
        
        // 更新数值显示
        const updateValueDisplay = () => {
            // ✅ 修复：保留"秒"字
            mobileValueDisplay.textContent = autoNextDelay + '秒';
            console.log('⏱️ 自动下一音延迟时间:', autoNextDelay + '秒');
            
            // 更新按钮状态（边界检查）
            mobileStepDown.disabled = autoNextDelay <= 1 || !fixedCheckbox.checked;
            mobileStepUp.disabled = autoNextDelay >= 5 || !fixedCheckbox.checked;
        };
        
        // 设置复选框change事件监听器
        fixedCheckbox.addEventListener('change', function() {
            const isEnabled = this.checked;
            
            // 1. 同步桌面端复选框
            if (desktopCheckbox) {
                desktopCheckbox.checked = isEnabled;
            }
            
            // 2. 更新步进按钮状态
            updateValueDisplay(); // 这会根据当前延迟时间和复选框状态更新按钮
            
            console.log('✅ 移动端自动下一音状态更新:', {
                启用: isEnabled,
                延迟时间: autoNextDelay + '秒',
                步进按钮禁用: !isEnabled
            });
        });
        
        // ✅ 新增：步进按钮点击事件
        mobileStepDown.addEventListener('click', () => {
            if (mobileStepDown.disabled) return;
            
            if (autoNextDelay > 1) {
                autoNextDelay--;
                updateValueDisplay();
                console.log('➖ 减少延迟时间:', autoNextDelay + '秒');
            } else {
                console.log('⚠️ 已是最小延迟时间（1秒）');
            }
        });
        
        mobileStepUp.addEventListener('click', () => {
            if (mobileStepUp.disabled) return;
            
            if (autoNextDelay < 5) {
                autoNextDelay++;
                updateValueDisplay();
                console.log('➕ 增加延迟时间:', autoNextDelay + '秒');
            } else {
                console.log('⚠️ 已是最大延迟时间（5秒）');
            }
        });
        
        // 初始化状态
        const initialState = fixedCheckbox.checked;
        updateValueDisplay(); // 初始化显示和按钮状态
        
        console.log('✅ 移动端自动下一音事件监听和步进功能修复完成', {
            默认延迟: autoNextDelay + '秒',
            范围: '1-5秒',
            初始状态: initialState ? '开启' : '关闭'
        });
    }, 100);
}

    // 同步桌面端统计信息到移动端
    copyDesktopStatsToMobile() {
        // 延迟一点点确保面板已渲染
        setTimeout(() => {
            console.log('🔄 同步桌面端数据到移动端...');
            
            // 复制统计数字
            const mappings = [
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
            
            // 同步历史记录 - 使用统一的历史记录更新函数
            const updateAllHistoryDisplays = AppGlobal.getTool('updateAllHistoryDisplays');
            if (updateAllHistoryDisplays) {
                updateAllHistoryDisplays();
            } else if (window.updateAllHistoryDisplays) {
                window.updateAllHistoryDisplays();
            }
            
        }, 50);
    }
}

// 初始化函数
export function initMobilePanels() {
    try {
        const manager = new MobilePanelManager();
        window.mobilePanelManager = manager;
        
        // ✅ 全局暴露修复方法，方便调试
        window.fixMobileAutoNext = () => manager.fixMobileAutoNextEvents();
        
        console.log('✅ 移动端面板管理器初始化完成');
        return manager;
    } catch (error) {
        console.error('❌ 移动端面板管理器初始化失败:', error);
        return null;
    }
}

export { MobilePanelManager };