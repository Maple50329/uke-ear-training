import { AppState } from '../core/state.js';

class StatsManager {
  constructor() {

    this.stats = {
      // 今日统计
      today: {
        questions: 0,
        firstTryCorrect: 0,
        retryCorrect: 0,
        wrongAnswers: 0
      },
      // 历史统计
      history: {
        totalQuestions: 0,
        totalCorrect: 0
      },
      // 连胜记录
      streaks: {
        current: 0,
        max: 0
      },
      // 分类统计结构
      categories: {
        baseNotes: {
          'C': { questions: 0, correct: 0, accuracy: 0 },
          'A': { questions: 0, correct: 0, accuracy: 0 }
        },
        keys: {
          'C': { questions: 0, correct: 0, accuracy: 0 },
          'D': { questions: 0, correct: 0, accuracy: 0 },
          'E': { questions: 0, correct: 0, accuracy: 0 },
          'F': { questions: 0, correct: 0, accuracy: 0 },
          'G': { questions: 0, correct: 0, accuracy: 0 },
          'A': { questions: 0, correct: 0, accuracy: 0 },
          'B': { questions: 0, correct: 0, accuracy: 0 }
        },
        difficulties: {
          'basic': { questions: 0, correct: 0, accuracy: 0 },
          'extended': { questions: 0, correct: 0, accuracy: 0 }
        },
        noteTypes: {
          'natural': { questions: 0, correct: 0, accuracy: 0 },
          'accidental': { questions: 0, correct: 0, accuracy: 0 }
        }
      },
      // 临时状态
      currentQuestion: {
        started: false,
        answered: false,
        firstTry: true
      }
    };
    
    this.loadStats();
    this.checkNewDay();
    this.initializeStreakSystem();

  }

/**
 * 检查是否是新的一天
 */
 checkNewDay() {
  const today = new Date().toDateString();
  const lastRecordedDay = localStorage.getItem('lastRecordedDay');

  if (lastRecordedDay !== today) {
      console.log('🔄 新的一天，重置今日统计');
      
      // 重置今日统计
      this.stats.today = {
          questions: 0,
          firstTryCorrect: 0,
          retryCorrect: 0,
          wrongAnswers: 0
      };
      
      // 更新最后记录日期
      localStorage.setItem('lastRecordedDay', today);
      
      // 重新计算连续天数
      this.calculateStreakDays();
      
      this.saveStats();
  }
}

/**
 * 初始化连续天数系统
 */
 initializeStreakSystem() {
  const lastPracticeDay = localStorage.getItem('lastPracticeDay');
  if (!lastPracticeDay) {
      // 第一次使用，检查今天是否已经练习过
      const hasPracticedToday = this.checkTodayPractice();
      if (hasPracticedToday) {
          localStorage.setItem('lastPracticeDay', new Date().toDateString());
          localStorage.setItem('streakDays', '1');
      } else {
          localStorage.setItem('lastPracticeDay', '');
          localStorage.setItem('streakDays', '0');
      }
  }
}

  /**
   * 重置当前题目状态
   */
  resetCurrentQuestion() {
    this.stats.currentQuestion = {
      started: false,
      answered: false,
      firstTry: true
    };
  }

  /**
   * 记录新题目开始
   */
  recordNewQuestion() {
    this.checkNewDay();
    
    // 只有在真正开始新题目时（不是重放）才记录
    if (!AppState.quiz.hasStarted || AppState.quiz.fromReset) {
      // 只标记题目开始，不增加计数
      this.stats.currentQuestion.started = true;
      this.stats.currentQuestion.answered = false;
      this.stats.currentQuestion.firstTry = true;
    }
    
    return this.getStats();
  }

  /**
   * 记录题目回答 - 修复版本
   */
   recordAnswer(isCorrect, isFirstAttempt, userAnswerNote = null, baseMode = 'c', currentKey = 'C', difficulty = 'basic') {
    if (!this.stats.currentQuestion.started) return this.getStats();
    if (this.stats.currentQuestion.answered) return this.getStats();
    
    // 完成题目计数
    this.stats.today.questions++;
    this.stats.history.totalQuestions++;
    this.stats.currentQuestion.answered = true;
    
    // 所有题目都更新分类统计，但区分正确/错误
    this.updateCategories(baseMode, currentKey, difficulty, userAnswerNote, isCorrect);
    
    if (isCorrect) {
        if (isFirstAttempt && this.stats.currentQuestion.firstTry) {
            // 一次性答对
            this.stats.today.firstTryCorrect++;
            this.stats.history.totalCorrect++;
            this.stats.streaks.current++;
            this.stats.streaks.max = Math.max(this.stats.streaks.max, this.stats.streaks.current);
        } else {
            // 重试答对
            this.stats.today.retryCorrect++;
            this.stats.streaks.current = 0;
        }
    } else {
        // 答错
        this.stats.today.wrongAnswers++;
        this.stats.streaks.current = 0;
    }
    
    this.stats.currentQuestion.firstTry = false;
    
    // 记录练习日期（只要有答题就记录）
    localStorage.setItem('lastPracticeDay', new Date().toDateString());
    
    this.saveStats();
    this.updateDisplay();
    this.updateBestAccuracy();
    
    return this.getStats();
}

/**
 * 🆕 新增：更新最佳准确率
 */
updateBestAccuracy() {
    try {
        const stats = this.getStats();
        const currentAccuracy = stats.totalAccuracyRate || 0;
        const savedBestAccuracy = localStorage.getItem('bestAccuracy');
        
        // 如果没有保存的最佳准确率，或者当前准确率更高，则更新
        if (!savedBestAccuracy || currentAccuracy > parseInt(savedBestAccuracy)) {
            localStorage.setItem('bestAccuracy', currentAccuracy.toString());
            console.log(`🎯 更新最佳准确率: ${currentAccuracy}%`);
        }
    } catch (error) {
        console.warn('更新最佳准确率失败');
    }
}

  /**
   * 获取统计数据
   */
   getStats() {
    const today = this.stats.today;
    const totalAttempted = today.questions;
    const totalCorrect = today.firstTryCorrect;
    
    // 今日正确率 = (一次性答对次数 / 完成的题目数量) × 100%
    const todayAccuracyRate = totalAttempted > 0 
      ? Math.round((totalCorrect / totalAttempted) * 100) 
      : 0;
    
    // 总正确率 = (历史总正确次数 / 历史总题目数) × 100%
    const totalAccuracyRate = this.stats.history.totalQuestions > 0
      ? Math.round((this.stats.history.totalCorrect / this.stats.history.totalQuestions) * 100)
      : 0;
    
    return {
        // 今日统计
        completed: totalAttempted,           // 今日练习 = 完成的题目数量
        mastered: totalCorrect,              // 正确次数 = 一次性答对次数
        masteryRate: todayAccuracyRate,      // 今日正确率
        
        // 历史统计
        totalQuestions: this.stats.history.totalQuestions,
        totalCorrect: this.stats.history.totalCorrect,
        totalAccuracyRate: totalAccuracyRate, // 新增：总正确率
        
        // 连胜记录
        currentStreak: this.stats.streaks.current,
        maxStreak: this.stats.streaks.max,
        
        // 其他字段
        retryCorrect: today.retryCorrect,
        wrongAnswers: today.wrongAnswers,
        categories: this.stats.categories || {},
        
        // 为了兼容性添加的字段
        totalPlays: this.stats.history.totalQuestions,
        correctAnswers: this.stats.history.totalCorrect,
        accuracyRate: todayAccuracyRate  // 保持今日正确率用于兼容
    };
}

  /**
   * 兼容性方法：获取今日统计数据
   */
  getTodayStats() {
    return this.getStats();
  }
  
  /**
   * 更新统计显示
   */
   updateDisplay() {
    const stats = this.getStats();

    // 更新总练习数量
    this.updateStatElement('totalExercises', `${stats.totalQuestions}题`);
    
    // 更新今日统计
    this.updateStatElement('totalPlays', `${stats.completed}题`);
    this.updateStatElement('correctCount', `${stats.mastered}题`);
    this.updateStatElement('accuracyRate', `${stats.masteryRate}%`);
    
    // ✅ 关键修复：确保更新总正确率
    this.updateStatElement('totalAccuracyRate', `${stats.totalAccuracyRate}%`);
    
    // 更新进度条
    const accuracyProgress = document.getElementById('accuracyProgress');
    if (accuracyProgress) {
      accuracyProgress.style.width = `${stats.masteryRate}%`;
    }
    
    // 更新连胜显示
    this.updateStatElement('currentStreak-label', `${stats.currentStreak}连胜`);
    this.updateStatElement('maxStreak-label', `${stats.maxStreak}连胜`);
  }
  
  /**
   * 更新统计元素显示
   */
  updateStatElement(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  }
  
  /**
   * 重置所有统计数据
   */
  resetStats() {
    this.stats = {
      today: {
        questions: 0,
        firstTryCorrect: 0,
        retryCorrect: 0,
        wrongAnswers: 0
      },
      history: {
        totalQuestions: 0,
        totalCorrect: 0
      },
      streaks: {
        current: 0,
        max: 0
      },
      categories: {
        baseNotes: {
          'C': { questions: 0, correct: 0, accuracy: 0 },
          'A': { questions: 0, correct: 0, accuracy: 0 }
        },
        keys: {
          'C': { questions: 0, correct: 0, accuracy: 0 },
          'D': { questions: 0, correct: 0, accuracy: 0 },
          'E': { questions: 0, correct: 0, accuracy: 0 },
          'F': { questions: 0, correct: 0, accuracy: 0 },
          'G': { questions: 0, correct: 0, accuracy: 0 },
          'A': { questions: 0, correct: 0, accuracy: 0 },
          'B': { questions: 0, correct: 0, accuracy: 0 }
        },
        difficulties: {
          'basic': { questions: 0, correct: 0, accuracy: 0 },
          'extended': { questions: 0, correct: 0, accuracy: 0 }
        },
        noteTypes: {
          'natural': { questions: 0, correct: 0, accuracy: 0 },
          'accidental': { questions: 0, correct: 0, accuracy: 0 }
        }
      },
      currentQuestion: {
        started: false,
        answered: false,
        firstTry: true
      }
    };
    
    localStorage.setItem('lastRecordedDay', new Date().toDateString());
    this.saveStats();
    this.updateDisplay();
    
    return this.getStats();
  }
  
  /**
   * 当用户放弃当前题目时调用（比如点击复位）
   */
  cancelCurrentQuestion() {
    this.resetCurrentQuestion();
  }

  loadStats() {
    try {
      const saved = localStorage.getItem('earTrainingStats');
      if (saved) {
        const parsed = JSON.parse(saved);
  
        // 先加载基础数据
        if (parsed.today) {
          this.stats.today = { 
            questions: parsed.today.questions || 0,
            firstTryCorrect: parsed.today.firstTryCorrect || 0,
            retryCorrect: parsed.today.retryCorrect || 0,
            wrongAnswers: parsed.today.wrongAnswers || 0
          };
        }
        
        if (parsed.history) {
          this.stats.history = {
            totalQuestions: parsed.history.totalQuestions || 0,
            totalCorrect: parsed.history.totalCorrect || 0
          };
        }
        
        if (parsed.streaks) {
          this.stats.streaks = {
            current: parsed.streaks.current || 0,
            max: parsed.streaks.max || 0
          };
        }
        
        // 合并分类统计，确保结构不丢失
        if (parsed.categories) {
          this.mergeCategories(parsed.categories);
        }
        
        // 确保连胜数据正确
        if (parsed.streaks) {
          this.stats.streaks = {
            current: parsed.streaks.current || 0,
            max: Math.max(parsed.streaks.max || 0, this.stats.streaks.current || 0)
          };
        }
      }
    } catch (error) {
      console.warn('加载统计数据失败:', error);
    }
    
    // 重置当前题目状态
    this.resetCurrentQuestion();
    
    // ✅ 关键修改：确保在数据完全加载后再更新显示
    setTimeout(() => {
      this.updateDisplay();
      
      // ✅ 通知外部：数据已加载完成
      window.dispatchEvent(new CustomEvent('statsLoaded'));
    }, 100);
  }

// 确保正确计算总正确率
getStats() {
  const today = this.stats.today;
  const totalAttempted = today.questions;
  const totalCorrect = today.firstTryCorrect;
  
  // 今日正确率 = (一次性答对次数 / 完成的题目数量) × 100%
  const todayAccuracyRate = totalAttempted > 0 
    ? Math.round((totalCorrect / totalAttempted) * 100) 
    : 0;
  
  // 总正确率 = (历史总正确次数 / 历史总题目数) × 100%
  const totalAccuracyRate = this.stats.history.totalQuestions > 0
    ? Math.round((this.stats.history.totalCorrect / this.stats.history.totalQuestions) * 100)
    : 0;
  
  return {
      // 今日统计
      completed: totalAttempted,
      mastered: totalCorrect,
      masteryRate: todayAccuracyRate,
      
      // 历史统计
      totalQuestions: this.stats.history.totalQuestions,
      totalCorrect: this.stats.history.totalCorrect,
      totalAccuracyRate: totalAccuracyRate,
      
      // 连胜记录
      currentStreak: this.stats.streaks.current,
      maxStreak: this.stats.streaks.max,
      
      // 其他字段
      retryCorrect: today.retryCorrect,
      wrongAnswers: today.wrongAnswers,
      categories: this.stats.categories || {},
      
      // 为了兼容性添加的字段
      totalPlays: this.stats.history.totalQuestions,
      correctAnswers: this.stats.history.totalCorrect,
      accuracyRate: todayAccuracyRate
  };
}


  /**
   * 合并分类统计数据
   */
  mergeCategories(savedCategories) {
    Object.keys(savedCategories).forEach(category => {
      if (this.stats.categories[category]) {
        Object.keys(savedCategories[category]).forEach(subCategory => {
          if (this.stats.categories[category][subCategory] && savedCategories[category][subCategory]) {
            const saved = savedCategories[category][subCategory];
            // 只合并数值，保持结构
            this.stats.categories[category][subCategory] = {
              questions: saved.questions || 0,
              correct: saved.correct || 0,
              accuracy: saved.accuracy || 0
            };
          }
        });
      }
    });
  }

  saveStats() {
    try {
      localStorage.setItem('earTrainingStats', JSON.stringify(this.stats));
    } catch (error) {
      console.warn('保存统计数据失败:', error);
    }
  }

  /**
   * 更新分类统计
   */
updateCategories(baseMode, key, difficulty, noteName, isCorrect) {
    
    // 1. 基准音统计 - 所有题目都记录
    const baseNoteKey = baseMode === 'c' ? 'C' : 'A';
    if (this.stats.categories.baseNotes && this.stats.categories.baseNotes[baseNoteKey]) {
        this.stats.categories.baseNotes[baseNoteKey].questions++; // 总题目数+1
        
        if (isCorrect) {
            this.stats.categories.baseNotes[baseNoteKey].correct++; // 只有正确时才+1
        }
        
        this.stats.categories.baseNotes[baseNoteKey].accuracy = this.calculateAccuracy(
            this.stats.categories.baseNotes[baseNoteKey].correct,
            this.stats.categories.baseNotes[baseNoteKey].questions
        );
    }
    
    // 2. 调性统计 - 所有题目都记录
    if (this.stats.categories.keys && this.stats.categories.keys[key]) {
        this.stats.categories.keys[key].questions++; // 总题目数+1
        
        if (isCorrect) {
            this.stats.categories.keys[key].correct++; // 只有正确时才+1
        }
        
        this.stats.categories.keys[key].accuracy = this.calculateAccuracy(
            this.stats.categories.keys[key].correct,
            this.stats.categories.keys[key].questions
        );
    }
    
    // 3. 难度统计 - 所有题目都记录
    if (this.stats.categories.difficulties && this.stats.categories.difficulties[difficulty]) {
        this.stats.categories.difficulties[difficulty].questions++; // 总题目数+1
        
        if (isCorrect) {
            this.stats.categories.difficulties[difficulty].correct++; // 只有正确时才+1
        }
        
        this.stats.categories.difficulties[difficulty].accuracy = this.calculateAccuracy(
            this.stats.categories.difficulties[difficulty].correct,
            this.stats.categories.difficulties[difficulty].questions
        );
    }
    
    // 4. 音级类型统计 - 所有题目都记录
    if (noteName && this.stats.categories.noteTypes) {
        const noteType = this.isAccidentalNote(noteName) ? 'accidental' : 'natural';
        if (this.stats.categories.noteTypes[noteType]) {
            this.stats.categories.noteTypes[noteType].questions++; // 总题目数+1
            
            if (isCorrect) {
                this.stats.categories.noteTypes[noteType].correct++; // 只有正确时才+1
            }
            
            this.stats.categories.noteTypes[noteType].accuracy = this.calculateAccuracy(
                this.stats.categories.noteTypes[noteType].correct,
                this.stats.categories.noteTypes[noteType].questions
            );
        }
    }
}

  /**
   * 判断是否是变化音级
   */
  isAccidentalNote(noteName) {
    const baseNote = noteName.replace(/\d/g, '');
    return baseNote.includes('#') || baseNote.includes('b');
  }

  /**
   * 计算正确率
   */
  calculateAccuracy(correct, total) {
    return total > 0 ? Math.round((correct / total) * 100) : 0;
  }

  /**
 * 获取开始屏幕的快速统计
 */
getQuickStats() {
  return {
      totalSessions: this.getTotalSessions(),      // 总练习次数
      currentStreak: this.calculateStreakDays(),   // 连续练习天数
      bestAccuracy: this.getBestAccuracy()         // 最佳准确率
  };
}

/**
* 计算总练习次数（历史总题目数）
*/
getTotalSessions() {
  return this.stats.history.totalQuestions || 0;
}

/**
 * 计算连续练习天数
 */
calculateStreakDays() {
    try {
        const lastPracticeDay = localStorage.getItem('lastPracticeDay');  // 最后练习日期
        const savedStreakDays = localStorage.getItem('streakDays');       // 保存的连续天数
        
        // 如果没有练习记录，检查今天是否练习过
        if (!lastPracticeDay) {
            const today = new Date().toDateString();
            const hasPracticedToday = this.checkTodayPractice();
            
            if (hasPracticedToday) {
                // 今天练习过，设置为第1天
                localStorage.setItem('streakDays', '1');
                localStorage.setItem('lastPracticeDay', today);
                return 1;
            } else {
                // 没有练习过，返回0
                return 0;
            }
        }
        
        const today = new Date().toDateString();
        const lastDate = new Date(lastPracticeDay);
        const currentDate = new Date();
        
        // 重置时间为午夜
        lastDate.setHours(0, 0, 0, 0);
        currentDate.setHours(0, 0, 0, 0);
        
        const timeDiff = currentDate.getTime() - lastDate.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        let currentStreak = parseInt(savedStreakDays) || 0;
        
        if (dayDiff === 0) {
            // 今天已经练习过，保持天数
            return currentStreak > 0 ? currentStreak : 1;
        } else if (dayDiff === 1) {
            // 连续练习，天数+1
            currentStreak = currentStreak > 0 ? currentStreak + 1 : 1;
            localStorage.setItem('streakDays', currentStreak.toString());
            localStorage.setItem('lastPracticeDay', today);
            return currentStreak;
        } else {
            // 中断，重置为1（从今天开始）
            localStorage.setItem('streakDays', '1');
            localStorage.setItem('lastPracticeDay', today);
            return 1;
        }
    } catch (error) {
        console.warn('计算连续练习天数失败');
        return 0;
    }
}

/**
 * 检查今天是否练习过
 */
checkTodayPractice() {
    const stats = this.getStats();
    return stats.completed > 0;  // 如果今天有完成的题目，说明练习过
}

/**
* 获取开始屏幕的最佳准确率
*/
getBestAccuracy() {
  try {
      const savedBestAccuracy = localStorage.getItem('bestAccuracy');
      const currentStats = this.getStats();
      const currentAccuracy = currentStats.totalAccuracyRate || 0;
      
      if (savedBestAccuracy) {
          const bestAccuracy = Math.max(parseInt(savedBestAccuracy), currentAccuracy);
          localStorage.setItem('bestAccuracy', bestAccuracy.toString());
          return `${bestAccuracy}%`;
      } else {
          localStorage.setItem('bestAccuracy', currentAccuracy.toString());
          return `${currentAccuracy}%`;
      }
  } catch (error) {
      console.warn('计算最佳准确率失败');
      return '0%';
  }
}

  /**
   * 导出数据（暂存功能）
   */
  exportData() {
    console.log('导出统计数据:', this.stats);
    return this.stats;
  }
}


const statsManager = new StatsManager();
export default statsManager;