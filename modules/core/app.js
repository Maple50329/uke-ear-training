export const AppGlobal = {
  tools: {},
  toolStats: {
    addCount: 0,
    getCount: 0,
    errorCount: 0
  },
  
  addTool(toolName, toolFunction) {
    const existingTool = this.tools[toolName];
    
    // 如果是懒加载代理被实际函数替换，不警告
    if (existingTool) {
      const isLazyProxyReplacement = existingTool._isLazyProxy && !toolFunction._isLazyProxy;
      
      if (!isLazyProxyReplacement) {
        console.warn(`🛠️ 工具 "${toolName}" 已存在，将被覆盖`);
      }
    }
    
    this.tools[toolName] = toolFunction;
    this.toolStats.addCount++;
    
    // 兼容性处理
    if (typeof window !== 'undefined') {
      window[toolName] = toolFunction;
    }
  },
  
  getTool(toolName) {
    this.toolStats.getCount++;
    const tool = this.tools[toolName];
    
    if (!tool) {
      this.toolStats.errorCount++;
      console.warn(`🛠️ 工具 "${toolName}" 未找到`);
    }
    
    return tool;
  },
  
  hasTool(toolName) {
    return !!this.tools[toolName];
  },
  
  removeTool(toolName) {
    if (this.tools[toolName]) {
      delete this.tools[toolName];
      if (typeof window !== 'undefined' && window[toolName]) {
        delete window[toolName];
      }
    }
  },
  
  // 批量操作
  registerTools(toolMap) {
    Object.entries(toolMap).forEach(([name, tool]) => {
      if (tool && typeof tool === 'function') {
        this.addTool(name, tool);
      }
    });
  },
  
  listAllTools() {
    return Object.keys(this.tools).sort();
  },
  
  // 实用方法
  safeCall(toolName, ...args) {
    const tool = this.getTool(toolName);
    if (tool && typeof tool === 'function') {
      try {
        return tool(...args);
      } catch (error) {
        console.error(`🛠️ 工具 "${toolName}" 执行错误:`, error);
        return null;
      }
    }
    return null;
  },
  
  getStats() {
    return {
      ...this.toolStats,
      totalTools: this.listAllTools().length
    };
  },
  
  init() {
    this.tools = {};
    this.toolStats = { addCount: 0, getCount: 0, errorCount: 0 };
  }
};

export default AppGlobal;