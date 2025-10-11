import { AppState } from '../core/state.js';
import AppGlobal from '../core/app.js';
import { KEY_SCALES } from '../core/constants.js';
import { getCurrentRange } from '../ui/range-manager.js';
export function calculateIntervalType(baseNote, targetNote, key = 'C') {
  const semitones = calculateSemitones(baseNote, targetNote);
  // 基于当前调性判断音程性质
  if (semitones !== 6) {
    const map = {
      0: 'P1', 1: 'm2', 2: 'M2', 3: 'm3', 4: 'M3',
      5: 'P4', 7: 'P5', 8: 'm6', 9: 'M6',
      10: 'm7', 11: 'M7', 12: 'P8'
    };
    return map[semitones] || 'P1';
  }

  // 特殊处理增四度和减五度
  const baseLetter = baseNote.replace(/\d/g, '').charAt(0);
  const targetLetter = targetNote.replace(/\d/g, '').charAt(0);
  const letters = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const step = (letters.indexOf(targetLetter) + 7 - letters.indexOf(baseLetter)) % 7 + 1;
  
  return step === 4 ? 'A4' : 'd5';
}

export function getNoteDegree(noteName, key = 'C') {
  if (!noteName || noteName === '--') return '--';
  
  // 提取音符基本名称（去除数字）
  const noteBase = noteName.replace(/\d/g, '');
  
  // 定义各调性的音级映射
  const keyDegrees = {
    'C': { 'C': 'I', 'D': 'II', 'E': 'III', 'F': 'IV', 'G': 'V', 'A': 'VI', 'B': 'VII' },
    'G': { 'G': 'I', 'A': 'II', 'B': 'III', 'C': 'IV', 'D': 'V', 'E': 'VI', 'F#': 'VII' },
    'D': { 'D': 'I', 'E': 'II', 'F#': 'III', 'G': 'IV', 'A': 'V', 'B': 'VI', 'C#': 'VII' },
    'A': { 'A': 'I', 'B': 'II', 'C#': 'III', 'D': 'IV', 'E': 'V', 'F#': 'VI', 'G#': 'VII' },
    'E': { 'E': 'I', 'F#': 'II', 'G#': 'III', 'A': 'IV', 'B': 'V', 'C#': 'VI', 'D#': 'VII' },
    'B': { 'B': 'I', 'C#': 'II', 'D#': 'III', 'E': 'IV', 'F#': 'V', 'G#': 'VI', 'A#': 'VII' },
    'F': { 'F': 'I', 'G': 'II', 'A': 'III', 'Bb': 'IV', 'C': 'V', 'D': 'VI', 'E': 'VII' },
    'Bb': { 'Bb': 'I', 'C': 'II', 'D': 'III', 'Eb': 'IV', 'F': 'V', 'G': 'VI', 'A': 'VII' },
    'Eb': { 'Eb': 'I', 'F': 'II', 'G': 'III', 'Ab': 'IV', 'Bb': 'V', 'C': 'VI', 'D': 'VII' },
    'Ab': { 'Ab': 'I', 'Bb': 'II', 'C': 'III', 'Db': 'IV', 'Eb': 'V', 'F': 'VI', 'G': 'VII' },
    'Db': { 'Db': 'I', 'Eb': 'II', 'F': 'III', 'Gb': 'IV', 'Ab': 'V', 'Bb': 'VI', 'C': 'VII' },
    'Gb': { 'Gb': 'I', 'Ab': 'II', 'Bb': 'III', 'Cb': 'IV', 'Db': 'V', 'Eb': 'VI', 'F': 'VII' },
    'F#': { 'F#': 'I', 'G#': 'II', 'A#': 'III', 'B': 'IV', 'C#': 'V', 'D#': 'VI', 'E#': 'VII' }
  };
  
  // 升号到降号的转换映射
  const sharpToFlat = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb',
    'E#': 'F', 'B#': 'C'
  };
  
  // 降号到升号的转换映射
  const flatToSharp = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    'Cb': 'B', 'Fb': 'E'
  };
  
  let displayNote = noteBase;
  
  // 如果当前调性使用降号表示，尝试将升号转换为降号
  if (['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(key)) {
    if (sharpToFlat[noteBase]) {
      displayNote = sharpToFlat[noteBase];
    }
  } 
  // 如果当前调性使用升号表示，尝试将降号转换为升号
  else if (['G', 'D', 'A', 'E', 'B', 'F#'].includes(key)) {
    if (flatToSharp[noteBase]) {
      displayNote = flatToSharp[noteBase];
    }
  }
  
  // 查找音级
  const degree = keyDegrees[key]?.[displayNote];
  
  // 如果找不到，尝试使用原始音符名称
  if (!degree) {
    return keyDegrees[key]?.[noteBase] || '--';
  }
  
  return degree;
}


export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function calculateSemitones(note1, note2) {
  // 音符到半音数的映射（C=0, C#=1, D=2, ...）
  const noteToSemitone = {
    'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
    'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
    'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
  };
  
  // 提取音符名称和八度
  const note1Name = note1.replace(/\d/g, '');
  const note2Name = note2.replace(/\d/g, '');
  const note1Octave = parseInt(note1.match(/\d+/)) || 4;
  const note2Octave = parseInt(note2.match(/\d+/)) || 4;
  
  // 计算总半音数
  const semitone1 = noteToSemitone[note1Name] + (note1Octave * 12);
  const semitone2 = noteToSemitone[note2Name] + (note2Octave * 12);
  const totalSemitones = Math.abs(semitone2 - semitone1);
  return totalSemitones;
}

export function getStabilityClass(stabilityText) {
  const stabilityMap = {
    '稳定': 'stable',
    '较稳定': 'medium',
    '不稳定': 'unstable'
  };
  return stabilityMap[stabilityText] || 'stable';
}
export function getANoteForKey(key) {
  // 不同调性对应的A音（基于A4=440Hz标准）
  const keyToANote = {
    'C': 'A4', 'D': 'B4', 'E': 'C#5', 'F': 'D5', 
    'G': 'E5', 'A': 'F#5', 'B': 'G#5'
  };
  return keyToANote[key] || 'A4';
}

// 获取基准音
export function getBaseNote() {
    const baseMode = document.querySelector('.mode-btn.active')?.dataset.mode || 'c';
    const currentKey = document.getElementById('keySelect')?.value || 'C';
    
    // 使用工具箱获取当前音域
    const getCurrentRange = AppGlobal.getTool('getCurrentRange');
    const currentRange = getCurrentRange ? getCurrentRange() : ['C3','C#3','D3','D#3','E3','F3','F#3','G3','G#3','A3','A#3','B3'];
    const isLowRange = currentRange[0] === 'C3';

    if (baseMode === 'c') {
        // 固定C模式：使用当前调性的主音，根据音域调整八度
        const cNote = KEY_SCALES[currentKey]?.basic[0] || 'C3';
        return isLowRange ? cNote : adjustOctave(cNote, 1);
    } else {
        // 固定A模式：根据音域调整八度
        const aNote = getANoteForKey(currentKey); // 例如 A4
        return isLowRange ? adjustOctave(aNote, -1) : aNote; // A3 或 A4
    }
}
export function getSolfegeName(degree) {
  const solfegeMap = {
    'I': 'Do', 'II': 'Re', 'III': 'Mi', 'IV': 'Fa',
    'V': 'Sol', 'VI': 'La', 'VII': 'Si',
    'i': 'Do', 'ii': 'Re', 'iii': 'Mi', 'iv': 'Fa',
    'v': 'Sol', 'vi': 'La', 'vii': 'Si'
  };
  return solfegeMap[degree] || degree;
  
}

// 判断是否是变化音级
export function isAccidentalNote(noteName) {
  const baseNote = noteName.replace(/\d/g, '');
  return baseNote.includes('#') || baseNote.includes('b');
}
// 调整音符的八度
function adjustOctave(noteName, octaveShift) {
  const noteBase = noteName.replace(/\d/g, '');
  const octave = parseInt(noteName.match(/\d+/)) || 4;
  const newOctave = octave + octaveShift;
  return noteBase + newOctave;
}