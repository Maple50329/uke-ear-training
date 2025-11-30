两个工具类文件的逻辑简要说明：
一、displayHelpers.js - 显示反馈助手
1.showKeyChangeToast()
·显示设置更改提示（2秒自动消失）：
·立即生效：常规绿色样式
·下一题生效：强调型深色样式
2.showAudioError()
·音频错误提示：在消息栏显示错误文本，3秒后自动恢复原内容
二、helpers.js - 音乐理论核心算法
1.calculateIntervalType()
·计算音程类型：返回P1/m2/M2...等音程代号，特殊处理增四度/减五度判断
2.getNoteDegree()
·获取调式级数：根据当前调性（支持12个大小调）返回I-VII级罗马数字，自动处理升降号转换逻辑
3.calculateSemitones()
·计算半音距离：精确计算两个音符（含八度）之间的半音数
4.getBaseNote()
·动态基准音生成：根据"固定C/固定A"模式+当前调性+音域（小字组/小字一组）智能生成基准音
5.isAccidentalNote()
·变化音检测：判断音符是否含#或b
6.辅助函数：防抖(debounce)、稳定性CSS类映射、唱名转换、A音标准获取、八度调整
定位：helpers.js是音乐理论计算引擎，displayHelpers.js是轻量级UI反馈层，两者均为纯函数，无状态副作用。