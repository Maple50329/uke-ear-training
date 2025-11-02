import { debounce } from '../utils/helpers.js';
import AppGlobal from '../core/app.js';
let currentPanelPage = 0;
const totalPanelPages = 3;
let panelStartX = 0;
let panelCurrentX = 0;
let isPanelDragging = false;
let isDragging = false;
let startX, startY, startLeft, startTop;

// 初始化所有面板功能
function initAllPanelFeatures() {
  initPanelDragging();
  initPanelSwipe();
  initPanelSmartPositioning();
}

// 初始化面板拖拽功能
function initPanelDragging() {
    const panel = document.getElementById('simplePanel');
    const header = panel.querySelector('.panel-header');
    const closeBtn = panel.querySelector('.panel-close');
    const showBtn = document.getElementById('showSimplePanel');
    if (!panel || !header) return;  
  
  
    // 拖拽功能
    header.addEventListener('mousedown', startDrag);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', stopDrag);
    
    header.addEventListener('touchstart', startDragTouch, { passive: true });
    document.addEventListener('touchmove', dragTouch, { passive: false });
    document.addEventListener('touchend', stopDrag);
    
    // 关闭按钮
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.style.display = 'none';
        if (showBtn) showBtn.style.display = 'block';  
      });
    }
    // 显示按钮
    if (showBtn) {
      showBtn.addEventListener('click', () => {
        panel.style.display = 'block';
        showBtn.style.display = 'none'; 
      });
    }
  
    function startDrag(e) {
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      panel.classList.add('dragging');
      header.classList.add('grabbing');
      e.preventDefault();
    }
  
    function startDragTouch(e) {
      if (e.touches.length !== 1) return;
      isDragging = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      const rect = panel.getBoundingClientRect();
      startLeft = rect.left;
      startTop = rect.top;
      panel.classList.add('dragging');
      header.classList.add('grabbing');
    }
  
    function drag(e) {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      updatePanelPosition(dx, dy);
      e.preventDefault();
    }
  
    function dragTouch(e) {
      if (!isDragging || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      updatePanelPosition(dx, dy);
      if (isDragging) e.preventDefault();
    }
  
    function updatePanelPosition(dx, dy) {
      let newLeft = startLeft + dx;
      let newTop = startTop + dy;
      
      const panelRect = panel.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      newLeft = Math.max(0, Math.min(newLeft, viewportWidth - panelRect.width));
      newTop = Math.max(0, Math.min(newTop, viewportHeight - panelRect.height));
      
      panel.style.left = newLeft + 'px';
      panel.style.top = newTop + 'px';
      panel.style.right = 'auto';
    }
  
    function stopDrag() {
      if (!isDragging) return;
      isDragging = false;
      panel.classList.remove('dragging');
      header.classList.remove('grabbing');
    }
  }

  // 初始化面板滑动功能
function initPanelSwipe() {
    const swipeContainer = document.querySelector('.simple-panel .swipe-container');
    if (!swipeContainer) return;
    
    // 触摸事件
    swipeContainer.addEventListener('touchstart', handlePanelStart, { passive: true });
    swipeContainer.addEventListener('touchmove', handlePanelMove, { passive: false });
    swipeContainer.addEventListener('touchend', handlePanelEnd);
    
    // 鼠标事件
    swipeContainer.addEventListener('mousedown', handlePanelStart);
    swipeContainer.addEventListener('mousemove', handlePanelMove);
    swipeContainer.addEventListener('mouseup', handlePanelEnd);
    swipeContainer.addEventListener('mouseleave', handlePanelEnd);
    
    // 点击指示器切换页面
    document.querySelectorAll('.simple-panel .indicator-dot').forEach(dot => {
        dot.addEventListener('click', () => {
            const pageIndex = parseInt(dot.dataset.page);
            goToPanelPage(pageIndex);
        });
    });
}

// 面板触摸开始
function handlePanelStart(e) {
    isPanelDragging = true;
    panelStartX = e.clientX || e.touches[0].clientX;
    panelCurrentX = panelStartX;
    
    if (e.type === 'touchstart') {
        e.stopPropagation(); // 防止触发面板拖拽
    }
}

// 面板触摸移动
function handlePanelMove(e) {
    if (!isPanelDragging) return;
    
    panelCurrentX = e.clientX || e.touches[0].clientX;
    
    if (e.type === 'touchmove') {
        e.preventDefault(); // 防止页面滚动
        e.stopPropagation();
    }
}

// 面板触摸结束
function handlePanelEnd(e) {
    if (!isPanelDragging) return;
    
    isPanelDragging = false;
    const diff = panelCurrentX - panelStartX;
    
    // 判断滑动方向（向右滑显示上一页，向左滑显示下一页）
    if (Math.abs(diff) > 30) { // 滑动超过30px才切换
        if (diff > 0) {
            goToPanelPage(currentPanelPage - 1); // 向右滑，上一页
        } else {
            goToPanelPage(currentPanelPage + 1); // 向左滑，下一页
        }
    }
}

// 跳转到指定面板页面
function goToPanelPage(pageIndex) {
    if (pageIndex < 0) pageIndex = 0;
    if (pageIndex >= totalPanelPages) pageIndex = totalPanelPages - 1;
    if (pageIndex === currentPanelPage) return;
    
    const pages = document.querySelectorAll('.simple-panel .swipe-page');
    const dots = document.querySelectorAll('.simple-panel .indicator-dot');
    const panelTitle = document.querySelector('.simple-panel .panel-title');
  
    // 设置面板标题
    const titles = ['音高信息', '音程分析', '尤克里里指位'];
    if (panelTitle) {
      panelTitle.textContent = titles[pageIndex];
    }
    pages.forEach((page, index) => {
        page.classList.remove('active', 'prev', 'next');
        if (index === pageIndex) {
            page.classList.add('active');
        } else if (index < pageIndex) {
            page.classList.add('prev');
        } else {
            page.classList.add('next');
        }
    });
    
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === pageIndex);
    });
    
    currentPanelPage = pageIndex;
}

// 初始化悬浮窗贴边功能
function initPanelSmartPositioning() {
    const panel = document.getElementById('simplePanel');
    if (!panel) return;
    
    // 保存原始位置
    const originalPosition = {
      left: panel.style.left,
      top: panel.style.top,
      right: panel.style.right
    };
    
    // 监听窗口大小变化
    window.addEventListener('resize', debounce(() => {
      adjustPanelPosition(panel);
    }, 250));
    
    // 初始调整位置
    setTimeout(() => adjustPanelPosition(panel), 100);
    
    // 添加贴边吸附功能
    panel.addEventListener('mouseup', () => {
      setTimeout(() => adjustPanelPosition(panel), 50);
    });
    
    panel.addEventListener('touchend', () => {
      setTimeout(() => adjustPanelPosition(panel), 50);
    });
  }

  // 智能调整悬浮窗位置
function adjustPanelPosition(panel) {
    if (!panel) return;
    
    const rect = panel.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 获取当前面板位置
    const currentLeft = parseInt(panel.style.left) || (viewportWidth - rect.width - 20);
    const currentTop = parseInt(panel.style.top) || 100;
    
    // 边缘吸附阈值
    const threshold = 50;
    
    // 检查是否靠近边缘
    const nearTop = currentTop < threshold;
    const nearRight = (currentLeft + rect.width) > (viewportWidth - threshold);
    const nearBottom = (currentTop + rect.height) > (viewportHeight - threshold);
    const nearLeft = currentLeft < threshold;
    
    // 根据靠近的边缘调整位置
    let newLeft = currentLeft;
    let newTop = currentTop;
    
    if (nearTop && !nearBottom) {
      newTop = 20; // 吸附到顶部
    } else if (nearBottom && !nearTop) {
      newTop = viewportHeight - rect.height - 20; // 吸附到底部
    }
    
    if (nearLeft && !nearRight) {
      newLeft = 20; // 吸附到左侧
    } else if (nearRight && !nearLeft) {
      newLeft = viewportWidth - rect.width - 20; // 吸附到右侧
    }
    
    // 确保面板不会超出可视区域
    newLeft = Math.max(10, Math.min(newLeft, viewportWidth - rect.width - 10));
    newTop = Math.max(10, Math.min(newTop, viewportHeight - rect.height - 10));
    
    // 应用新位置
    panel.style.left = newLeft + 'px';
    panel.style.top = newTop + 'px';
    panel.style.right = 'auto';
  }

  // 重置信息为" -- "
function resetAnswerInfo() {
  const elementsToReset = {
    // 音高
    'simplePitch': '--',
    'simpleFrequency': '-- Hz',
    'currentPitch': '--',
    'currentFrequency': '-- Hz',

    // 音程
    'intervalName': '--',
    'intervalDetail': '--',
    'intervalStability': '--',
    'intervalTendency': '--',
    'intervalNature': '--',
    'intervalColor': '--',

    // 尤克里里
    'ukeNoteName': '--',
    'ukeNoteType': '--',
    'ukeCommonPositions': '--',
    'ukeHighPositions': '--',
    'ukeRelatedChords': '--'
  };

  Object.entries(elementsToReset).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) {
      element.textContent = value;
      // 清除稳定性颜色类
      if (id === 'intervalStability') {
        element.className = 'property-value';
      }
    }
  });
  
  // 重置下拉菜单到C调
  const keySelect = document.getElementById('ukeKeySelect');
  if (keySelect) {
    keySelect.value = 'C';
  }
}

  // 隐藏信息卡片
function hideInfoCards() {
    const cards = document.querySelectorAll('.info-card');
    cards.forEach(card => card.classList.remove('visible'));
    // 使用工具箱重置答案信息
    const resetInfo = AppGlobal.getTool('resetAnswerInfo') || resetAnswerInfo;
    resetInfo();
}

  // 显示信息卡片
function showInfoCards() {
  const cards = document.querySelectorAll('.info-card');
  cards.forEach(card => card.classList.add('visible'));
  
  // 只有在开启自动下一题时才设置自动隐藏
  const autoNextEnabled = document.getElementById('autoNextCheckbox')?.checked;
  if (autoNextEnabled) {
    const displayTime = parseInt(document.getElementById('infoDisplayTime')?.value || '6');
     // 使用工具箱获取隐藏函数
     const hideCards = AppGlobal.getTool('hideInfoCards') || hideInfoCards;
    setTimeout(hideInfoCards, displayTime * 1000);
    console.log('设置自动隐藏:', displayTime + '秒');
  }
}
  export {
    initAllPanelFeatures,
    initPanelDragging,
    initPanelSwipe,
    initPanelSmartPositioning,
    goToPanelPage,
    adjustPanelPosition,
    resetAnswerInfo,
    hideInfoCards,
    showInfoCards
};