/**
 * 展示层格式化工具。
 * 收在这里是为了让「列表里的时间怎么写」只有一处定义，
 * 错题本与转换历史不会各写一份、慢慢跑偏。
 */

/** 把时间戳格式化成「月-日 时:分」，列表里够用且不占宽度。 */
export function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
