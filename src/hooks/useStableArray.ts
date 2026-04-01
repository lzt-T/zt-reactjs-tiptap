/* eslint-disable react-hooks/refs -- 本 Hook 需要在 render 阶段比较并复用引用，以提供浅稳定语义 */
import { useRef } from "react";

/**
 * 返回一个“语义稳定”的数组引用：
 * - 长度一致且每个元素 `Object.is` 相等时，复用上一轮引用；
 * - 否则返回新数组引用。
 */
export function useStableArray<T>(value?: readonly T[]): readonly T[] | undefined {
  /** 记录上一轮稳定数组引用。 */
  const previousRef = useRef<readonly T[] | undefined>(value);

  if (!value) {
    previousRef.current = value;
    return value;
  }

  const previous = previousRef.current;
  if (
    previous &&
    previous.length === value.length &&
    previous.every((item, index) => Object.is(item, value[index]))
  ) {
    return previous;
  }

  previousRef.current = value;
  return value;
}
