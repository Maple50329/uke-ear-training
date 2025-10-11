export const SAMPLER_CONFIG = {
  urls: {
    // C3-B3 小字组
    "C3": "c3.mp3", "C#3": "cs3.mp3", "D3": "d3.mp3", "D#3": "ds3.mp3",
    "E3": "e3.mp3", "F3": "f3.mp3", "F#3": "fs3.mp3", "G3": "g3.mp3",
    "G#3": "gs3.mp3", "A3": "a3.mp3", "A#3": "as3.mp3", "B3": "b3.mp3",
    
    // C4-B4 小字1组
    "C4": "c4.mp3", "C#4": "cs4.mp3", "D4": "d4.mp3", "D#4": "ds4.mp3",
    "E4": "e4.mp3", "F4": "f4.mp3", "F#4": "fs4.mp3", "G4": "g4.mp3",
    "G#4": "gs4.mp3", "A4": "a4.mp3", "A#4": "as4.mp3", "B4": "b4.mp3",
    
    // C5-B5 小字2组 (保留)
    "C5": "c5.mp3", "C#5": "cs5.mp3", "D5": "d5.mp3", "D#5": "ds5.mp3",
    "E5": "e5.mp3", "F5": "f5.mp3", "F#5": "fs5.mp3", "G5": "g5.mp3",
    "G#5": "gs5.mp3", "A5": "a5.mp3", "A#5": "as5.mp3", "B5": "b5.mp3"
  },
  baseUrl: "audio/piano/",
};

export const SFX_FILES = {
  ok: 'audio/sfx/correct.mp3',
  fail: 'audio/sfx/error.mp3'
};
export const INTERVAL_INFO = {
    'P1': { name: '纯一度', semitones: 0, stability: '稳定', tendency: '稳定', nature: '完全协和', color: '纯净' },
    'm2': { name: '小二度', semitones: 1, stability: '不稳定', tendency: '向上解决', nature: '极不协和', color: '紧张' },
    'M2': { name: '大二度', semitones: 2, stability: '不稳定', tendency: '向上解决', nature: '不协和', color: '明亮' },
    'm3': { name: '小三度', semitones: 3, stability: '较稳定', tendency: '相对稳定', nature: '不完全协和', color: '柔和温暖' },
    'M3': { name: '大三度', semitones: 4, stability: '较稳定', tendency: '相对稳定', nature: '不完全协和', color: '明亮欢快' },
    'P4': { name: '纯四度', semitones: 5, stability: '稳定', tendency: '向下解决', nature: '完全协和', color: '空旷' },
    'A4': { name: '增四度', semitones: 6, stability: '不稳定', tendency: '向外解决', nature: '极不协和', color: '紧张尖锐' },
    'd5': { name: '减五度', semitones: 6, stability: '不稳定', tendency: '向内解决', nature: '极不协和', color: '阴暗' },
    'P5': { name: '纯五度', semitones: 7, stability: '稳定', tendency: '相对稳定', nature: '完全协和', color: '空旷明亮' },
    'm6': { name: '小六度', semitones: 8, stability: '较稳定', tendency: '向下解决', nature: '不完全协和', color: '忧郁' },
    'M6': { name: '大六度', semitones: 9, stability: '较稳定', tendency: '向下解决', nature: '不完全协和', color: '明亮' },
    'm7': { name: '小七度', semitones: 10, stability: '不稳定', tendency: '向下解决', nature: '不协和', color: '期待感' },
    'M7': { name: '大七度', semitones: 11, stability: '不稳定', tendency: '向上解决', nature: '极不协和', color: '紧张尖锐' },
    'P8': { name: '纯八度', semitones: 12, stability: '稳定', tendency: '稳定', nature: '完全协和', color: '纯净宽广' }
};

export const UI_TEXT = {
    INITIAL: '播放题目',
    NO_SFX: '无音效模式',
    REPLAY: '再听一遍',
    NEXT: '下一题',
    PLAYING_SCALE: '正在播放音阶',
    PLAYING_REFERENCE: '正在播放基准音',
    PLAYING_TARGET: '正在播放目标音',
    REPLAYING_TARGET: '重新播放目标音'
};

export const NOTE_FREQUENCIES = {
  // C3-B3 小字组
  'C3': 130.81, 'C#3': 138.59, 'D3': 146.83, 'D#3': 155.56,
  'E3': 164.81, 'F3': 174.61, 'F#3': 185.00, 'G3': 196.00,
  'G#3': 207.65, 'A3': 220.00, 'A#3': 233.08, 'B3': 246.94,
  
  // C4-B4 小字1组
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88,
  
  // C5-B5 小字2组
  'C5': 523.25, 'C#5': 554.37, 'D5': 587.33, 'D#5': 622.25,
  'E5': 659.25, 'F5': 698.46, 'F#5': 739.99, 'G5': 783.99,
  'G#5': 830.61, 'A5': 880.00, 'A#5': 932.33, 'B5': 987.77
};

export const NOTE_CHORD_RELATIONS = {
    'C': ['C', 'Cm', 'C7', 'Cmaj7', 'Csus4', 'Cadd9'],
    'C#': ['C#', 'C#m', 'C#7', 'C#maj7'],
    'D': ['D', 'Dm', 'D7', 'Dmaj7', 'Dsus4', 'Dadd9'],
    'D#': ['D#', 'D#m', 'D#7', 'D#maj7'],
    'E': ['E', 'Em', 'E7', 'Emaj7', 'Esus4', 'Eadd9'],
    'F': ['F', 'Fm', 'F7', 'Fmaj7', 'Fsus4'],
    'F#': ['F#', 'F#m', 'F#7', 'F#maj7'],
    'G': ['G', 'Gm', 'G7', 'Gmaj7', 'Gsus4', 'Gadd9'],
    'G#': ['G#', 'G#m', 'G#7', 'G#maj7'],
    'A': ['A', 'Am', 'A7', 'Amaj7', 'Asus4', 'Aadd9'],
    'A#': ['A#', 'A#m', 'A#7', 'A#maj7'],
    'B': ['B', 'Bm', 'B7', 'Bmaj7', 'Bsus4']
};

export const KEY_SCALES = {
  'C': {
    basic: ['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4'], // 基础音阶从C3开始
    extended: ['C3', 'C#3', 'D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3', 'C4']
  },
  'D': {
    basic: ['D3', 'E3', 'F#3', 'G3', 'A3', 'B3', 'C#4', 'D4'],
    extended: ['D3', 'D#3', 'E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4']
  },
  'E': {
    basic: ['E3', 'F#3', 'G#3', 'A3', 'B3', 'C#4', 'D#4', 'E4'],
    extended: ['E3', 'F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4','D4', 'D#4', 'E4']
  },
  'F': {
    basic: ['F3', 'G3', 'A3', 'A#3', 'C4', 'D4', 'E4', 'F4'],
    extended: ['F3', 'F#3', 'G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4']
  },
  'G': {
    basic: ['G3', 'A3', 'B3', 'C4', 'D4', 'E4', 'F#4', 'G4'],
    extended: ['G3', 'G#3', 'A3', 'A#3', 'B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4']
  },
  'A': {
    basic: ['A3', 'B3', 'C#4', 'D4', 'E4', 'F#4', 'G#4', 'A4'],
    extended: ['A3', 'A#3', 'B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4']
  },
  'B': {
    basic: ['B3', 'C#4', 'D#4', 'E4', 'F#4', 'G#4', 'A#4', 'B4'],
    extended: ['B3', 'C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4']
  }
};
