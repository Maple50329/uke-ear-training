export const AppState = {
  // 当前设置面板状态
  currentSettingsPanel: 'general',
  
  // DOM 元素引用
  dom: {
    mainBtn: null,
    ansArea: null, 
    msgDisplay: null
  },
  
  // 音频系统状态
  audio: {
    ctx: null,
    sfxReady: false,
    SFX: {},
    isPlaying: false,
    volume: 0.7,
    isMuted: false,
    lastVolume: 0.7,
    shouldStop: false,
    sampler: null,
    samplerReady: false,
    sfxSampler: null,
    sfxSamplerReady: false,
    masterVolume: null,
    firstInteractionHandled: false,
    contextResumed: false,
    resumeAttempted: false,
    nodesReconnected: false,
    autoNextDelay: localStorage.getItem('autoNextDelay') || 3,
    autoNextEnabled: localStorage.getItem('autoNextEnabled') === 'true' || false
  },
  
  // 答题系统状态
  quiz: {
    currentNoteIdx: -1,
    currentTargetNote: null,
    currentScale: [],
    locked: false,
    answered: false,
    hasStarted: false,
    isReplayMode: false,
    currentKey: 'C',
    canReset: false,
    originalTargetNote: null,
    autoNextTimer: null,
    shouldUpdateDegree: true,
    questionBaseMode: 'c',
    fromReset: false,
    currentDifficulty: 'basic',
    hasAnsweredCurrent: false,
    recentTargetNotes: [],
    pendingKeyChange: null,
    pendingDifficultyChange: null,
    pendingBaseModeChange: null,
    pendingRangeChange: null,
    currentRange: 'low',
    originalKey: 'C',
    errorLimitEnabled: false,
    allowedErrorCount: 1, 
    currentErrorCount: 0,
    maxAttempts: null,
    answerRevealed: false
  },
  
  // UI 状态
  ui: {
    firstPlay: true
  },
  
  // 统计信息 - 完全更新为新的数据结构
  stats: {
// 基础统计
totalPlays: 0,          // 所有点击次数
correctAnswers: 0,      // 所有正确次数
accuracyRate: 0,        // 基础正确率

// 今日统计（核心）
todayQuestions: 0,      // 今日练习次数（出题数量）
todayMastered: 0,       // 今日正确次数（一次答对）

// 连胜统计
currentStreak: 0,
maxStreak: 0,
    // 分类统计
    baseNoteStats: {
      'C': { plays: 0, correct: 0, accuracy: 0 },
      'A': { plays: 0, correct: 0, accuracy: 0 }
    },
    noteTypeStats: {
      'natural': { plays: 0, correct: 0, accuracy: 0 },
      'accidental': { plays: 0, correct: 0, accuracy: 0 }
    },
    rangeStats: {
      'low': { plays: 0, correct: 0, accuracy: 0 },
      'mid': { plays: 0, correct: 0, accuracy: 0 }
    },
    keyStats: {
      'C': { plays: 0, correct: 0, accuracy: 0 },
      'G': { plays: 0, correct: 0, accuracy: 0 },
      'D': { plays: 0, correct: 0, accuracy: 0 },
      'A': { plays: 0, correct: 0, accuracy: 0 },
      'E': { plays: 0, correct: 0, accuracy: 0 },
      'F': { plays: 0, correct: 0, accuracy: 0 }
    },
    
    // 时间统计（用于筛选）
    timeStats: {
      '7': { plays: 0, correct: 0, accuracy: 0 },
      '30': { plays: 0, correct: 0, accuracy: 0 },
      '90': { plays: 0, correct: 0, accuracy: 0 },
      'all': { plays: 0, correct: 0, accuracy: 0 }
    },
    
    // 历史记录
    history: []
  }
};