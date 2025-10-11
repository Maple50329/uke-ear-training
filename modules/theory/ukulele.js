import { NOTE_CHORD_RELATIONS } from '../core/constants.js';
// 1. 定义常量数据（保持不变）
const C_POSITIONS = {
  'C':  [{string: 3, fret: 0}, {string: 1, fret: 3}, {string: 4, fret: 5}, {string: 2, fret: 8}, {string: 3, fret: 12}, {string: 1, fret: 15}, {string: 4, fret: 17}],
  'C#': [{string: 3, fret: 1}, {string: 1, fret: 4}, {string: 4, fret: 6}, {string: 2, fret: 9}, {string: 3, fret: 13}, {string: 1, fret: 16}, {string: 4, fret: 18}],
  'Db': [{string: 3, fret: 1}, {string: 1, fret: 4}, {string: 4, fret: 6}, {string: 2, fret: 9}, {string: 3, fret: 13}, {string: 1, fret: 16}, {string: 4, fret: 18}],
  'D':  [{string: 3, fret: 2}, {string: 1, fret: 5}, {string: 4, fret: 7}, {string: 2, fret: 10}, {string: 3, fret: 14}, {string: 1, fret: 17}],
  'D#': [{string: 3, fret: 3}, {string: 1, fret: 6}, {string: 4, fret: 8}, {string: 2, fret: 11}, {string: 3, fret: 15}, {string: 1, fret: 18}],
  'Eb': [{string: 3, fret: 3}, {string: 1, fret: 6}, {string: 4, fret: 8}, {string: 2, fret: 11}, {string: 3, fret: 15}, {string: 1, fret: 18}],
  'E':  [{string: 2, fret: 0}, {string: 3, fret: 4}, {string: 1, fret: 7}, {string: 4, fret: 9}, {string: 2, fret: 12}, {string: 3, fret: 16}],
  'F':  [{string: 2, fret: 1}, {string: 3, fret: 5}, {string: 1, fret: 8}, {string: 4, fret: 10}, {string: 2, fret: 13}, {string: 3, fret: 17}],
  'F#': [{string: 2, fret: 2},{string: 3, fret: 6}, {string: 1, fret: 9}, {string: 4, fret: 11}, {string: 2, fret: 14},  {string: 3, fret: 18}],
  'Gb': [{string: 2, fret: 2},{string: 3, fret: 6}, {string: 1, fret: 9}, {string: 4, fret: 11}, {string: 2, fret: 14},  {string: 3, fret: 18}],
  'G':  [{string: 4, fret: 0}, {string: 2, fret: 3}, {string: 3, fret: 7}, {string: 1, fret: 10}, {string: 4, fret: 12}, {string: 2, fret: 15}],
  'G#': [{string: 4, fret: 1}, {string: 2, fret: 4},{string: 3, fret: 8}, {string: 1, fret: 11}, {string: 4, fret: 13}, {string: 2, fret: 16}],
  'Ab': [{string: 4, fret: 1}, {string: 2, fret: 4},{string: 3, fret: 8}, {string: 1, fret: 11}, {string: 4, fret: 13}, {string: 2, fret: 16}],
  'A':  [{string: 1, fret: 0}, {string: 4, fret: 2}, {string: 2, fret: 5}, {string: 3, fret: 9}, {string: 1, fret: 12}, {string: 4, fret: 14}, {string: 2, fret: 17}],
  'A#': [{string: 1, fret: 1}, {string: 4, fret: 3}, {string: 2, fret: 6}, {string: 3, fret: 10}, {string: 1, fret: 13}, {string: 4, fret: 15}, {string: 2, fret: 18}],
  'Bb': [{string: 1, fret: 1}, {string: 4, fret: 3}, {string: 2, fret: 6}, {string: 3, fret: 10}, {string: 1, fret: 13}, {string: 4, fret: 15}, {string: 2, fret: 18}],
  'B':  [{string: 1, fret: 2}, {string: 4, fret: 4}, {string: 2, fret: 7},{string: 3, fret: 11},  {string: 1, fret: 14}, {string: 4, fret: 16}]
};

const KEY_OFFSETS = {
  'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8,
  'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11
};

// 2. 定义内部函数（保持不变）
function calculatePositionsBidirectional(noteName, key) {
  const offset = KEY_OFFSETS[key] || 0;
  
  if (offset === 0) {
    return C_POSITIONS[noteName] || [];
  }
  
  const cPositions = C_POSITIONS[noteName] || [];
  const newPositions = [];
  
  for (const pos of cPositions) {
    const newFret = pos.fret + offset;
    if (newFret <= 18) {
      newPositions.push({ string: pos.string, fret: newFret });
    }
  }
  
  for (const pos of cPositions) {
    const newFret = pos.fret + offset - 12;
    if (newFret >= 0 && newFret <= 18) {
      newPositions.push({ string: pos.string, fret: newFret });
    }
  }
  
  if (offset >= 7) {
    for (const pos of cPositions) {
      const newFret = pos.fret + offset - 24;
      if (newFret >= 0 && newFret <= 18) {
        newPositions.push({ string: pos.string, fret: newFret });
      }
    }
  }
  
  const uniquePositions = [];
  const seen = new Set();
  
  for (const pos of newPositions) {
    const key = `${pos.string}-${pos.fret}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniquePositions.push(pos);
    }
  }
  
  return uniquePositions.sort((a, b) => a.fret - b.fret);
}

function precalculateAllPositions() {
  const cache = {};
  const allKeys = Object.keys(KEY_OFFSETS);
  const allNotes = Object.keys(C_POSITIONS);

  allKeys.forEach(key => {
    cache[key] = {};
    allNotes.forEach(note => {
      cache[key][note] = calculatePositionsBidirectional(note, key);
    });
  });

  return cache;
}

// 3. 预计算缓存
const POSITIONS_CACHE = precalculateAllPositions();

// 4. 直接使用旧名称定义并导出主函数
export function getUkulelePositions(key) {
  const normalizedKey = key.length > 1 ? key.charAt(0).toUpperCase() + key.slice(1) : key.toUpperCase();
  return POSITIONS_CACHE[normalizedKey] || POSITIONS_CACHE['C'];
}

// 更新尤克里里指位信息
export function updateUkulelePosition(noteName, key = 'C') {
  // 提取基本音符名称（移除数字但保留升降号）
  let baseNoteName = noteName.replace(/[0-9]/g, '');
  
  
  // 升降号映射（确保使用正确的符号）
  const sharpToFlatMap = {
    'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb'
  };
  
  const flatToSharpMap = {
    'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#'
  };
  
  // 根据调性决定使用升号还是降号表示
  const selectedKey = document.getElementById('ukeKeySelect')?.value || key;
  const useFlats = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(selectedKey);
  
  let displayNoteName = baseNoteName;
  
  // 统一音符表示法
  if (useFlats && sharpToFlatMap[baseNoteName]) {
    displayNoteName = sharpToFlatMap[baseNoteName];
  } else if (!useFlats && flatToSharpMap[baseNoteName]) {
    displayNoteName = flatToSharpMap[baseNoteName];
  }
  

  
  // 更新音名显示
  const noteNameEl = document.getElementById('ukeNoteName');
  const noteTypeEl = document.getElementById('ukeNoteType');
  if (noteNameEl) noteNameEl.textContent = displayNoteName;
  if (noteTypeEl) {
    noteTypeEl.textContent = displayNoteName.includes('b') || displayNoteName.includes('#') ? '变化音' : '自然音';
  }
  
  // 获取指位数据
  const keyPositions = getUkulelePositions(selectedKey);
  const positions = keyPositions[displayNoteName] || [];
  
  // 分离指位（0-5品为常用，6品以上为高把位）
  const commonPositions = positions.filter(pos => pos.fret <= 5);
  const highPositions = positions.filter(pos => pos.fret > 5);
  // 格式化指位显示
  const formatPosition = (pos) => {
    const stringNames = {1: '一', 2: '二', 3: '三', 4: '四'};
    return `${stringNames[pos.string]}弦${pos.fret}品`;
  };
  
  // 更新显示
  const commonPositionsEl = document.getElementById('ukeCommonPositions');
  const highPositionsEl = document.getElementById('ukeHighPositions');
  
  if (commonPositionsEl) {
    commonPositionsEl.textContent = commonPositions.length > 0 
      ? commonPositions.map(formatPosition).join('、')
      : '无';
  }
  
  if (highPositionsEl) {
    highPositionsEl.textContent = highPositions.length > 0 
      ? highPositions.map(formatPosition).join('、')
      : '无';
  }
  
  // 更新相关和弦
  const chordsEl = document.getElementById('ukeRelatedChords');
  if (chordsEl) {
    const relatedChords = NOTE_CHORD_RELATIONS[displayNoteName] || [];
    chordsEl.textContent = relatedChords.slice(0, 4).join('、') || '无';
  }
}

// 初始化尤克里里调性选择器
export function initUkuleleKeySelector() {
  const keySelect = document.getElementById('ukeKeySelect');
  
  if (keySelect) {
      keySelect.addEventListener('change', function() {
          const selectedKey = this.value;
          
          // 获取当前显示的音符
          const currentNote = document.getElementById('ukeNoteName').textContent;
          
          if (currentNote && currentNote !== '--') {
              updateUkulelePosition(currentNote, selectedKey);
          }
      });
      
      // 初始触发一次以确保状态正确
      setTimeout(() => {
          const currentNote = document.getElementById('ukeNoteName').textContent;
          if (currentNote && currentNote !== '--') {
              updateUkulelePosition(currentNote, keySelect.value);
          }
      }, 100);
  }
}

// 辅助函数：获取弦的中文名称
export function getStringName(stringNumber) {
  const stringNames = {1: '一', 2: '二', 3: '三', 4: '四'};
  return stringNames[stringNumber] || stringNumber;
}

// 可选：指位可视化函数
export function visualizeUkulelePositions(positions, key) {
  const visualContainer = document.getElementById('ukeVisualization');
  if (!visualContainer) return;
  
  // 清空现有内容
  visualContainer.innerHTML = '';
  
  if (positions.length === 0) {
    visualContainer.innerHTML = '<div class="no-positions">无指位信息</div>';
    return;
  }
  
  // 创建指板可视化
  const fretboard = document.createElement('div');
  fretboard.className = 'uke-fretboard';
  
  // 创建4根弦
  for (let string = 1; string <= 4; string++) {
    const stringPositions = positions.filter(pos => pos.string === string);
    const stringEl = document.createElement('div');
    stringEl.className = 'uke-string';
    
    // 创建0-12品
    for (let fret = 0; fret <= 12; fret++) {
      const fretEl = document.createElement('div');
      fretEl.className = 'uke-fret';
      
      // 检查这个位置是否有指位
      const hasPosition = stringPositions.some(pos => pos.fret === fret);
      
      if (hasPosition) {
        fretEl.classList.add('active');
        fretEl.title = `${key}调 ${getStringName(string)}弦${fret}品`;
      }
      
      if (fret === 0) {
        fretEl.classList.add('open-note');
      }
      
      stringEl.appendChild(fretEl);
    }
    
    fretboard.appendChild(stringEl);
  }
  
  visualContainer.appendChild(fretboard);
}

export { C_POSITIONS, KEY_OFFSETS };