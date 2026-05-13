/**
 * 全局滚动事件订阅回调。
 */
export type GlobalScrollListener = () => void;

/**
 * 全局尺寸变化事件订阅回调。
 */
export type GlobalResizeListener = () => void;

// 当前全局滚动订阅者集合。
const globalScrollListeners = new Set<GlobalScrollListener>();
// 当前全局尺寸变化订阅者集合。
const globalResizeListeners = new Set<GlobalResizeListener>();
// 当前是否已绑定全局 scroll 监听。
let isGlobalScrollListening = false;
// 当前是否已绑定全局 resize 监听。
let isGlobalResizeListening = false;

/**
 * 判断当前环境是否可访问 document。
 */
const canUseDocument = (): boolean => {
  return typeof document !== "undefined";
};

/**
 * 判断当前环境是否可访问 window。
 */
const canUseWindow = (): boolean => {
  return typeof window !== "undefined";
};

/**
 * 分发当前全局滚动事件给所有订阅者。
 */
const emitGlobalScroll = (): void => {
  const listeners = Array.from(globalScrollListeners);
  listeners.forEach((listener) => listener());
};

/**
 * 分发当前全局尺寸变化事件给所有订阅者。
 */
const emitGlobalResize = (): void => {
  const listeners = Array.from(globalResizeListeners);
  listeners.forEach((listener) => listener());
};

/**
 * 绑定全局滚动监听（单例）。
 */
const bindGlobalScroll = (): void => {
  if (isGlobalScrollListening || !canUseDocument()) {
    return;
  }

  document.addEventListener("scroll", emitGlobalScroll, {
    capture: true,
    passive: true,
  });
  isGlobalScrollListening = true;
};

/**
 * 解绑全局滚动监听（单例）。
 */
const unbindGlobalScroll = (): void => {
  if (!isGlobalScrollListening || !canUseDocument()) {
    return;
  }

  document.removeEventListener("scroll", emitGlobalScroll, true);
  isGlobalScrollListening = false;
};

/**
 * 绑定全局尺寸变化监听（单例）。
 */
const bindGlobalResize = (): void => {
  if (isGlobalResizeListening || !canUseWindow()) {
    return;
  }

  window.addEventListener("resize", emitGlobalResize);
  isGlobalResizeListening = true;
};

/**
 * 解绑全局尺寸变化监听（单例）。
 */
const unbindGlobalResize = (): void => {
  if (!isGlobalResizeListening || !canUseWindow()) {
    return;
  }

  window.removeEventListener("resize", emitGlobalResize);
  isGlobalResizeListening = false;
};

/**
 * 订阅全局滚动事件，并返回取消订阅函数。
 */
export const subscribeGlobalScroll = (
  listener: GlobalScrollListener,
): (() => void) => {
  if (!canUseDocument()) {
    return () => undefined;
  }

  let isSubscribed = true;
  globalScrollListeners.add(listener);
  bindGlobalScroll();

  return () => {
    if (!isSubscribed) {
      return;
    }

    isSubscribed = false;
    globalScrollListeners.delete(listener);
    if (globalScrollListeners.size === 0) {
      unbindGlobalScroll();
    }
  };
};

/**
 * 订阅全局尺寸变化事件，并返回取消订阅函数。
 */
export const subscribeGlobalResize = (
  listener: GlobalResizeListener,
): (() => void) => {
  if (!canUseWindow()) {
    return () => undefined;
  }

  let isSubscribed = true;
  globalResizeListeners.add(listener);
  bindGlobalResize();

  return () => {
    if (!isSubscribed) {
      return;
    }

    isSubscribed = false;
    globalResizeListeners.delete(listener);
    if (globalResizeListeners.size === 0) {
      unbindGlobalResize();
    }
  };
};
