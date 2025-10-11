// Performance Optimizer Module
// This module integrates all performance optimization techniques
// including enhanced caching, canvas optimization, and rendering strategies

import imageProcessor from './ImageProcessor.js';

class PerformanceOptimizer {
  constructor() {
    // Advanced caching system
    this.cache = {
      imageData: new Map(),  // For raw image data
      processed: new Map(),  // For processed results
      operations: new Map(), // For operation sequences
      timestamps: new Map()  // For cache invalidation
    };
    
    // Cache configuration
    this.cacheConfig = {
      maxSize: 5,           // Maximum number of items to cache
      ttl: 5 * 60 * 1000,   // Time to live (5 minutes)
      enabled: true         // Enable/disable caching
    };
    
    // Performance monitoring
    this.performanceStats = {
      operations: 0,
      cachedOperations: 0,
      processingTime: 0,
      renderTime: 0
    };
    
    // Canvas optimization settings
    this.canvasSettings = {
      useOffscreenCanvas: true,
      preserveDrawingBuffer: false,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high' // 'low', 'medium', 'high'
    };
    
    // Progressive rendering settings
    this.progressiveRendering = {
      enabled: true,
      initialQuality: 0.3,  // Initial quality (0.1 to 1.0)
      targetQuality: 1.0,
      qualitySteps: 3,      // Number of quality steps
      batchSize: 10         // Batch size for progressive updates
    };
    
    // Task throttling and debouncing
    this.debounceTimeouts = new Map();
  }
  
  // Generate a unique cache key
  generateCacheKey(data, operations = []) {
    if (!data || !data.width || !data.height) return null;
    
    // Create a base key from image dimensions and a sample of pixel data
    let baseKey = `${data.width}x${data.height}_`;
    
    // Add a simple hash of the image data if available
    if (data.imageData) {
      let hash = 0;
      const sampleSize = Math.min(100, data.imageData.length / 4);
      for (let i = 0; i < sampleSize; i += 4) {
        const pixelIndex = i * 4;
        hash = ((hash << 5) - hash) + 
               (data.imageData[pixelIndex] + 
                data.imageData[pixelIndex + 1] + 
                data.imageData[pixelIndex + 2]);
        hash |= 0; // Convert to 32bit integer
      }
      baseKey += Math.abs(hash).toString(36).substr(0, 8);
    }
    
    // Add operations to the key
    if (operations.length > 0) {
      const operationsKey = operations
        .map(op => `${op.type}_${JSON.stringify(op.params || '')}`)
        .join('|');
      
      // Hash the operations string to keep the key manageable
      let opsHash = 0;
      for (let i = 0; i < operationsKey.length; i++) {
        opsHash = ((opsHash << 5) - opsHash) + operationsKey.charCodeAt(i);
        opsHash |= 0;
      }
      baseKey += '_' + Math.abs(opsHash).toString(36).substr(0, 8);
    }
    
    return baseKey;
  }
  
  // Enhanced caching mechanism
  setCache(key, value, type = 'processed') {
    if (!this.cacheConfig.enabled || !key) return;
    
    // Ensure the cache doesn't exceed max size
    if (this.cache[type].size >= this.cacheConfig.maxSize) {
      // Remove the oldest item
      const oldestKey = this.getOldestCacheKey(type);
      if (oldestKey) {
        this.cache[type].delete(oldestKey);
        this.cache.timestamps.delete(`${type}_${oldestKey}`);
      }
    }
    
    // Store the value and update timestamp
    this.cache[type].set(key, value);
    this.cache.timestamps.set(`${type}_${key}`, Date.now());
  }
  
  // Get cached value
  getCache(key, type = 'processed') {
    if (!this.cacheConfig.enabled || !key || !this.cache[type].has(key)) {
      return null;
    }
    
    // Check if the item has expired
    const timestampKey = `${type}_${key}`;
    const timestamp = this.cache.timestamps.get(timestampKey);
    
    if (timestamp && Date.now() - timestamp > this.cacheConfig.ttl) {
      // Item has expired, remove from cache
      this.cache[type].delete(key);
      this.cache.timestamps.delete(timestampKey);
      return null;
    }
    
    // Update timestamp to extend TTL
    this.cache.timestamps.set(timestampKey, Date.now());
    this.performanceStats.cachedOperations++;
    
    return this.cache[type].get(key);
  }
  
  // Get the oldest cache key
  getOldestCacheKey(type = 'processed') {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    this.cache.timestamps.forEach((timestamp, key) => {
      if (key.startsWith(`${type}_`)) {
        if (timestamp < oldestTime) {
          oldestTime = timestamp;
          oldestKey = key.replace(`${type}_`, '');
        }
      }
    });
    
    return oldestKey;
  }
  
  // Clear cache
  clearCache(type = null) {
    if (type) {
      this.cache[type].clear();
      // Remove all timestamps for this type
      this.cache.timestamps.forEach((_, key) => {
        if (key.startsWith(`${type}_`)) {
          this.cache.timestamps.delete(key);
        }
      });
    } else {
      // Clear all caches
      this.cache.imageData.clear();
      this.cache.processed.clear();
      this.cache.operations.clear();
      this.cache.timestamps.clear();
    }
  }
  
  // Configure cache settings
  configureCache(settings) {
    this.cacheConfig = { ...this.cacheConfig, ...settings };
  }
  
  // Configure progressive rendering
  configureProgressiveRendering(settings) {
    this.progressiveRendering = { ...this.progressiveRendering, ...settings };
  }
  
  // Configure canvas settings
  configureCanvas(settings) {
    this.canvasSettings = { ...this.canvasSettings, ...settings };
  }
  
  // Apply canvas optimization settings
  applyCanvasOptimizations(canvas) {
    if (!canvas || !canvas.getContext) return;
    
    const ctx = canvas.getContext('2d');
    
    // Apply image smoothing settings
    ctx.imageSmoothingEnabled = this.canvasSettings.imageSmoothingEnabled;
    if (ctx.imageSmoothingQuality !== undefined) {
      ctx.imageSmoothingQuality = this.canvasSettings.imageSmoothingQuality;
    }
    
    return ctx;
  }
  
  // Enhanced debounce function
  debounce(func, delay, key) {
    return (...args) => {
      // Clear existing timeout for this key
      if (this.debounceTimeouts.has(key)) {
        clearTimeout(this.debounceTimeouts.get(key));
      }
      
      // Set new timeout
      const timeoutId = setTimeout(() => {
        func(...args);
        this.debounceTimeouts.delete(key);
      }, delay);
      
      this.debounceTimeouts.set(key, timeoutId);
    };
  }
  
  // Throttle function
  throttle(func, limit, key) {
    let inThrottle;
    
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  // Process image with all optimizations
  async processImageWithOptimizations(imageData, width, height, operations = [], options = {}) {
    const startTime = performance.now();
    
    // Check if we should use progressive rendering
    const useProgressive = options.progressive !== false && this.progressiveRendering.enabled;
    
    try {
      // Try to get from cache first
      const cacheKey = this.generateCacheKey({ imageData, width, height }, operations);
      const cachedResult = this.getCache(cacheKey);
      
      if (cachedResult) {
        return cachedResult;
      }
      
      this.performanceStats.operations++;
      
      if (useProgressive) {
        // Progressive rendering approach
        const result = await this.progressiveImageProcessing(
          imageData, width, height, operations, options.onProgress
        );
        
        // Cache the final result
        this.setCache(cacheKey, result);
        
        return result;
      } else {
        // Single pass processing
        const result = await imageProcessor.processImage(imageData, operations, width, height);
        
        // Cache the result
        this.setCache(cacheKey, result);
        
        return result;
      }
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    } finally {
      // Update performance stats
      const endTime = performance.now();
      this.performanceStats.processingTime += (endTime - startTime);
    }
  }
  
  // Progressive image processing implementation
  async progressiveImageProcessing(imageData, width, height, operations, onProgressCallback) {
    const { initialQuality, targetQuality, qualitySteps } = this.progressiveRendering;
    
    return new Promise((resolve) => {
      // Scale factors for progressive rendering
      const scaleFactors = [];
      for (let i = 0; i < qualitySteps; i++) {
        const progress = i / (qualitySteps - 1);
        // Ease in the scaling for better perceived performance
        const scale = initialQuality + (targetQuality - initialQuality) * Math.pow(progress, 2);
        scaleFactors.push(scale);
      }
      
      let currentStep = 0;
      let finalResult = null;
      
      // Process at each quality level
      const processNextStep = async () => {
        if (currentStep >= scaleFactors.length) {
          resolve(finalResult);
          return;
        }
        
        const scale = scaleFactors[currentStep];
        const scaledWidth = Math.floor(width * scale);
        const scaledHeight = Math.floor(height * scale);
        
        // Create a scaled down version of the image data
        const scaledImageData = this.scaleImageData(imageData, width, height, scaledWidth, scaledHeight);
        
        // Process the scaled image
        const processedData = await imageProcessor.processImage(
          scaledImageData, 
          operations, 
          scaledWidth, 
          scaledHeight, 
          Math.max(1, Math.floor(this.progressiveRendering.batchSize * scale))
        );
        
        // If this is the last step, keep the full result
        if (currentStep === scaleFactors.length - 1) {
          finalResult = this.scaleImageData(processedData, scaledWidth, scaledHeight, width, height);
        }
        
        // Call progress callback with the scaled result
        if (onProgressCallback) {
          const progress = Math.floor((currentStep + 1) / scaleFactors.length * 100);
          
          // Scale up the processed data for display
          const displayData = this.scaleImageData(processedData, scaledWidth, scaledHeight, width, height);
          
          onProgressCallback(progress, displayData);
        }
        
        currentStep++;
        
        // Process next step with a small delay to allow UI updates
        setTimeout(processNextStep, 50);
      };
      
      // Start progressive processing
      processNextStep();
    });
  }
  
  // Simple image scaling utility
  scaleImageData(imageData, srcWidth, srcHeight, destWidth, destHeight) {
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcWidth;
    srcCanvas.height = srcHeight;
    
    const srcCtx = srcCanvas.getContext('2d');
    const srcImageData = srcCtx.createImageData(srcWidth, srcHeight);
    srcImageData.data.set(imageData);
    srcCtx.putImageData(srcImageData, 0, 0);
    
    const destCanvas = document.createElement('canvas');
    destCanvas.width = destWidth;
    destCanvas.height = destHeight;
    
    const destCtx = destCanvas.getContext('2d');
    destCtx.imageSmoothingEnabled = this.canvasSettings.imageSmoothingEnabled;
    destCtx.imageSmoothingQuality = this.canvasSettings.imageSmoothingQuality;
    destCtx.drawImage(srcCanvas, 0, 0, destWidth, destHeight);
    
    return destCtx.getImageData(0, 0, destWidth, destHeight).data;
  }
  
  // Draw processed image with Canvas optimizations
  drawProcessedImage(imageData, width, height, canvas, options = {}) {
    const startTime = performance.now();
    
    try {
      // Apply canvas optimizations
      const ctx = this.applyCanvasOptimizations(canvas);
      
      // Use offscreen rendering if enabled
      if (this.canvasSettings.useOffscreenCanvas) {
        // Let imageProcessor handle offscreen rendering
        imageProcessor.drawProcessedImageToCanvas(imageData, width, height, canvas, options.progress);
      } else {
        // Direct rendering
        const imageDataObj = ctx.createImageData(width, height);
        imageDataObj.data.set(imageData);
        ctx.putImageData(imageDataObj, 0, 0);
        
        // Draw progress if provided
        if (options.progress !== undefined && options.progress < 100) {
          imageProcessor.drawProgressIndicator(canvas, options.progress);
        }
      }
    } catch (error) {
      console.error('Error drawing image:', error);
    } finally {
      // Update render time stats
      const endTime = performance.now();
      this.performanceStats.renderTime += (endTime - startTime);
    }
  }
  
  // Get performance statistics
  getPerformanceStats() {
    const { operations, cachedOperations, processingTime, renderTime } = this.performanceStats;
    const cacheHitRate = operations > 0 ? (cachedOperations / (operations + cachedOperations) * 100) : 0;
    
    return {
      operations,
      cachedOperations,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      averageProcessingTime: operations > 0 ? (processingTime / operations) : 0,
      totalProcessingTime: processingTime,
      totalRenderTime: renderTime
    };
  }
  
  // Reset performance statistics
  resetPerformanceStats() {
    this.performanceStats = {
      operations: 0,
      cachedOperations: 0,
      processingTime: 0,
      renderTime: 0
    };
  }
}

// Create and export a singleton instance
const performanceOptimizer = new PerformanceOptimizer();

export default performanceOptimizer;
export { PerformanceOptimizer };