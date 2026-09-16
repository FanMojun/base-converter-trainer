import { useCallback, useEffect, useRef, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

/**
 * 从 localStorage 读取并反序列化。
 * 数据损坏（手改过、旧版本结构不兼容）时不抛异常，直接回退到默认值。
 */
function readFromStorage(key, fallback) {
  if (!isBrowser) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;

    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (error) {
    console.warn(`[useStorage] 读取 ${key} 失败，已回退到默认值`, error);
    return fallback;
  }
}

/**
 * 把 state 同步到 localStorage。
 * 相比每次调用时手写 getItem/setItem，这里额外处理了三件事：
 *   1. 写入失败（隐私模式、配额满）不会让组件崩溃；
 *   2. 监听 storage 事件，多标签页之间保持一致；
 *   3. 提供 reset() 用于恢复初始值。
 *
 * @param {string} key localStorage 键名
 * @param {any | (() => any)} initialValue 初始值，可以是惰性工厂函数
 * @returns {[any, Function, Function]} [值, 设置值, 重置]
 */
export default function useStorage(key, initialValue) {
  const initialRef = useRef(initialValue);
  const [value, setValue] = useState(() =>
    readFromStorage(key, typeof initialRef.current === 'function' ? initialRef.current() : initialRef.current),
  );

  useEffect(() => {
    if (!isBrowser) return;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`[useStorage] 写入 ${key} 失败，本次数据不会被持久化`, error);
    }
  }, [key, value]);

  // 多标签页同步：其它标签页改写同一个 key 时，本页跟着更新
  useEffect(() => {
    if (!isBrowser) return undefined;

    const handleStorage = (event) => {
      if (event.key !== key || event.storageArea !== window.localStorage) return;

      try {
        setValue(event.newValue === null ? null : JSON.parse(event.newValue));
      } catch (error) {
        console.warn(`[useStorage] 同步 ${key} 失败`, error);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key]);

  const reset = useCallback(() => {
    const next = typeof initialRef.current === 'function' ? initialRef.current() : initialRef.current;
    setValue(next);
  }, []);

  return [value, setValue, reset];
}
