import { useContext } from 'react';

import { StatsContext } from '../context/StatsContext';

/**
 * 读取学习数据与操作方法。
 * 与 Context 分开放在 hooks 目录，方便组件只 import 需要的东西。
 */
export default function useStats() {
  const context = useContext(StatsContext);

  if (!context) {
    throw new Error('useStats 必须在 <StatsProvider> 内部使用');
  }

  return context;
}
