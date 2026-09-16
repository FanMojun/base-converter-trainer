import { useCallback, useEffect, useRef, useState } from 'react';

const isBrowser = typeof window !== 'undefined';

/**
 * 取初始值。initialValue 允许传惰性工厂函数，这样每次需要「干净的初始值」时
 * 拿到的都是新对象，而不是同一个被改过的引用。
 */
function resolveInitial(ref) {
  return typeof ref.current === 'function' ? ref.current() : ref.current;
}

/**
 * 读取 → 反序列化 → 结构校验。
 *
 * JSON.parse 成功不代表数据可用：用户可能手改过 localStorage，
 * 也可能是上一个版本遗留的结构（键名带着 :v1 就是为了这种时候能识别出来）。
 * sanitize 负责把「语法合法但结构不对」的数据收敛成当前版本期望的形状，
 * 收敛不了就回退到初始值 —— 宁可丢掉一份坏数据，也不要让整页白屏。
 */
function readValue(key, fallback, sanitize) {
  if (!isBrowser) return fallback;

  let parsed;

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`[useStorage] 读取 ${key} 失败，已回退到默认值`, error);
    return fallback;
  }

  if (parsed === null || parsed === undefined) return fallback;

  return sanitize ? sanitize(parsed) : parsed;
}

/**
 * 把 state 同步到 localStorage。
 * 相比每次调用时手写 getItem/setItem，这里额外处理了四件事：
 *   1. 写入失败（隐私模式、配额满）不会让组件崩溃；
 *   2. 读取时做结构校验，坏数据不会污染下游组件；
 *   3. 监听 storage 事件，多标签页之间保持一致；
 *   4. 提供 reset() 用于恢复初始值。
 *
 * @param {string} key localStorage 键名，建议带版本后缀（如 bct:stats:v1）
 * @param {any | (() => any)} initialValue 初始值，可以是惰性工厂函数
 * @param {(value: any) => any} [sanitize] 结构校验/迁移函数，返回值即最终使用的数据
 * @returns {[any, Function, Function]} [值, 设置值, 重置]
 */
export default function useStorage(key, initialValue, sanitize) {
  const initialRef = useRef(initialValue);
  const [value, setValue] = useState(() => readValue(key, resolveInitial(initialRef), sanitize));

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
        if (event.newValue === null) {
          // 别的标签页把这个 key 删掉了：回到初始值，而不是把 null 写回去
          setValue(resolveInitial(initialRef));
          return;
        }

        const parsed = JSON.parse(event.newValue);
        setValue(sanitize ? sanitize(parsed) : parsed);
      } catch (error) {
        console.warn(`[useStorage] 同步 ${key} 失败`, error);
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [key, sanitize]);

  const reset = useCallback(() => setValue(resolveInitial(initialRef)), []);

  return [value, setValue, reset];
}
