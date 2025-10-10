/**
 * 滑块管理器模块
 * 统一管理所有滑块事件监听器，避免重复绑定，优化性能
 */

// 引入防抖函数
import { debounce } from './Basic.js';

// 存储已注册的滑块和它们的事件监听器
let registeredSliders = new Map();

// 默认防抖延迟时间（毫秒）
const DEFAULT_DEBOUNCE_DELAY = 16; // 约60fps

/**
 * 初始化滑块管理器
 */
export function initSliderManager() {
    // 清空已注册的滑块列表，防止内存泄漏
    registeredSliders.clear();
}

/**
 * 添加滑块事件监听器（带防抖处理）
 * @param {HTMLElement} sliderElement - 滑块DOM元素
 * @param {Function} callback - 回调函数
 * @param {string} eventType - 事件类型，默认为'input'
 * @param {number} debounceDelay - 防抖延迟时间（毫秒）
 * @returns {boolean} 是否成功添加监听器
 */
export function addSliderEventListener(sliderElement, callback, eventType = 'input', debounceDelay = DEFAULT_DEBOUNCE_DELAY) {
    if (!sliderElement || !(sliderElement instanceof HTMLElement) || typeof callback !== 'function') {
        console.warn('Invalid slider element or callback function');
        return false;
    }

    const sliderId = sliderElement.id;
    if (!sliderId) {
        console.warn('Slider element must have an ID');
        return false;
    }

    // 检查滑块是否已经注册了相同类型的事件监听器
    if (registeredSliders.has(sliderId) && registeredSliders.get(sliderId).has(eventType)) {
        console.warn(`Event listener for type '${eventType}' already registered for slider '${sliderId}'`);
        return false;
    }

    // 创建防抖处理的回调函数
    const debouncedCallback = debounce(callback, debounceDelay);

    // 添加事件监听器
    sliderElement.addEventListener(eventType, debouncedCallback);

    // 存储注册信息以便后续管理
    if (!registeredSliders.has(sliderId)) {
        registeredSliders.set(sliderId, new Map());
    }
    registeredSliders.get(sliderId).set(eventType, {
        originalCallback: callback,
        debouncedCallback: debouncedCallback,
        eventType: eventType
    });

    return true;
}

/**
 * 移除滑块事件监听器
 * @param {HTMLElement|string} slider - 滑块DOM元素或滑块ID
 * @param {string} eventType - 事件类型，默认为'input'
 * @returns {boolean} 是否成功移除监听器
 */
export function removeSliderEventListener(slider, eventType = 'input') {
    let sliderId;
    let sliderElement;

    if (typeof slider === 'string') {
        sliderId = slider;
        sliderElement = document.getElementById(sliderId);
    } else if (slider instanceof HTMLElement) {
        sliderId = slider.id;
        sliderElement = slider;
    } else {
        console.warn('Invalid slider parameter');
        return false;
    }

    if (!sliderId || !registeredSliders.has(sliderId) || !registeredSliders.get(sliderId).has(eventType)) {
        console.warn(`No event listener registered for slider '${sliderId}' and type '${eventType}'`);
        return false;
    }

    // 获取注册的监听器信息
    const listenerInfo = registeredSliders.get(sliderId).get(eventType);

    // 移除事件监听器
    sliderElement.removeEventListener(eventType, listenerInfo.debouncedCallback);

    // 从注册列表中移除
    registeredSliders.get(sliderId).delete(eventType);
    if (registeredSliders.get(sliderId).size === 0) {
        registeredSliders.delete(sliderId);
    }

    return true;
}

/**
 * 批量添加滑块事件监听器
 * @param {Array<{element: HTMLElement, callback: Function, eventType?: string, debounceDelay?: number}>} slidersConfig - 滑块配置数组
 * @returns {Array<boolean>} 每个滑块添加结果的数组
 */
export function addSliderEventListenersBatch(slidersConfig) {
    if (!Array.isArray(slidersConfig)) {
        console.warn('Sliders config must be an array');
        return [];
    }

    return slidersConfig.map(config => {
        if (!config.element || typeof config.callback !== 'function') {
            return false;
        }
        return addSliderEventListener(
            config.element,
            config.callback,
            config.eventType || 'input',
            config.debounceDelay || DEFAULT_DEBOUNCE_DELAY
        );
    });
}

/**
 * 清除所有滑块事件监听器
 */
export function clearAllSliderEventListeners() {
    registeredSliders.forEach((eventListeners, sliderId) => {
        const sliderElement = document.getElementById(sliderId);
        if (sliderElement) {
            eventListeners.forEach((listenerInfo, eventType) => {
                sliderElement.removeEventListener(eventType, listenerInfo.debouncedCallback);
            });
        }
    });
    registeredSliders.clear();
}

/**
 * 获取已注册滑块的数量
 * @returns {number} 已注册滑块的数量
 */
export function getRegisteredSlidersCount() {
    return registeredSliders.size;
}

/**
 * 检查滑块是否已注册事件监听器
 * @param {HTMLElement|string} slider - 滑块DOM元素或滑块ID
 * @param {string} eventType - 事件类型，默认为'input'
 * @returns {boolean} 是否已注册
 */
export function isSliderEventListenerRegistered(slider, eventType = 'input') {
    let sliderId;
    if (typeof slider === 'string') {
        sliderId = slider;
    } else if (slider instanceof HTMLElement) {
        sliderId = slider.id;
    } else {
        return false;
    }

    return registeredSliders.has(sliderId) && registeredSliders.get(sliderId).has(eventType);
}