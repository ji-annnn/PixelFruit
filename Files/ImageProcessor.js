// Image Processor Module
// This module serves as the interface between the main thread and the Web Worker
// It handles image processing tasks with performance optimizations

class ImageProcessor {
  constructor() {
    // Initialize Web Worker
    this.worker = new Worker('../works.js');

    // Task queue for managing concurrent operations
    this.taskQueue = [];
    this.isProcessing = false;

    // Cache for storing processed results
    this.resultCache = new Map();

    // Callbacks storage
    this.callbacks = new Map();
    this.taskIdCounter = 0;

    // Initialize message handler
    this.worker.onmessage = this.handleWorkerMessage.bind(this);
    this.worker.onerror = this.handleWorkerError.bind(this);

    // Create offscreen canvas for rendering
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenContext = this.offscreenCanvas.getContext('2d');
  }

  // Handle messages from the Web Worker
  handleWorkerMessage(e) {
    const { taskId, success, result, error, progress, complete } = e.data;

    if (taskId && this.callbacks.has(taskId)) {
      const callback = this.callbacks.get(taskId);

      if (error) {
        callback({ success: Boolean, error });
        this.callbacks.delete(taskId);
      } else if (progress !== undefined) {
        callback({ success: Boolean, progress, partialResult: result });
      } else if (complete) {
        callback({ success: Boolean, result });
        this.callbacks.delete(taskId);
      }
    }

    // Process next task in queue
    if (complete || error) {
      this.isProcessing = false;
      this.processNextTask();
    }
  }

  // Handle worker errors
  handleWorkerError(error) {
    console.error('Web Worker error:', error);
    // Process next task even if there's an error
    this.isProcessing = false;
    this.processNextTask();
  }

  // Add task to queue
  addTask(taskType, data, callback) {
    const taskId = ++this.taskIdCounter;

    this.taskQueue.push({
      taskId,
      taskType,
      data,
      callback
    });

    this.callbacks.set(taskId, callback);

    // Start processing if not already
    if (!this.isProcessing) {
      this.processNextTask();
    }

    return taskId;
  }

  // Process next task in queue
  processNextTask() {
    if (this.taskQueue.length === 0) {
      return;
    }

    const task = this.taskQueue.shift();
    const { taskId, taskType, data } = task;

    // Check cache first if applicable
    const cacheKey = this.generateCacheKey(taskType, data);
    if (taskType !== 'processImage' && this.resultCache.has(cacheKey)) {
      const cachedResult = this.resultCache.get(cacheKey);
      setTimeout(() => {
        task.callback({ success: true, result: cachedResult });
        this.callbacks.delete(taskId);
        this.processNextTask();
      }, 0);
      return;
    }

    // Send task to worker
    this.isProcessing = true;
    this.worker.postMessage({
      task: taskType,
      data,
      taskId
    }, data.imageData ? [data.imageData.buffer] : []);
  }

  // Generate cache key for results
  generateCacheKey(taskType, data) {
    if (taskType === 'computeHistogram') {
      // For histogram, create a hash based on image data
      const { imageData } = data;
      if (imageData) {
        // Simple hash for demonstration (not collision-proof)
        let hash = 0;
        for (let i = 0; i < Math.min(1000, imageData.length); i += 4) {
          hash = ((hash << 5) - hash) + imageData[i];
          hash |= 0; // Convert to 32bit integer
        }
        return `${taskType}_${hash}`;
      }
    }
    return null;
  }

  // Process image with progressive rendering
  processImage(imageData, operations, width, height, batchSize = 10, onProgress) {
    return new Promise((resolve, reject) => {
      const taskId = this.addTask('processImage', {
        imageData,
        operations,
        width,
        height,
        batchSize
      }, (response) => {
        if (!response.success) {
          reject(new Error(response.error));
          return;
        }

        if (response.progress !== undefined && onProgress) {
          onProgress(response.progress, response.partialResult);
        }

        if (response.result && response.complete !== false) {
          resolve(response.result);
        }
      });
    });
  }

  // Apply optimized median filter
  applyMedianFilter(imageData, width, height, radius = 1) {
    return new Promise((resolve, reject) => {
      this.addTask('applyMedianFilter', {
        imageData,
        width,
        height,
        radius
      }, (response) => {
        if (response.success) {
          // Cache the result
          const cacheKey = this.generateCacheKey('applyMedianFilter', {
            imageData,
            width,
            height,
            radius
          });
          if (cacheKey) {
            this.resultCache.set(cacheKey, response.result);
          }
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Apply optimized Gaussian filter
  applyGaussianFilter(imageData, width, height, sigma = 1.0) {
    return new Promise((resolve, reject) => {
      this.addTask('applyGaussianFilter', {
        imageData,
        width,
        height,
        sigma
      }, (response) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Compute histogram
  computeHistogram(imageData, width, height) {
    return new Promise((resolve, reject) => {
      this.addTask('computeHistogram', {
        imageData,
        width,
        height
      }, (response) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Apply color adjustments
  applyColorAdjustments(imageData, width, height, params) {
    return new Promise((resolve, reject) => {
      this.addTask('applyColorAdjustments', {
        imageData,
        width,
        height,
        params
      }, (response) => {
        if (response.success) {
          resolve(response.result);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  // Offscreen rendering helper with color space consistency
  renderToOffscreenCanvas(imageData, width, height) {
    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;

    // 重新创建context以确保色彩空间一致性
    this.offscreenContext = this.offscreenCanvas.getContext('2d', {
      colorSpace: 'srgb',
      alpha: true
    });

    // 设置图像平滑参数
    this.offscreenContext.imageSmoothingEnabled = true;
    this.offscreenContext.imageSmoothingQuality = 'high';

    // Create ImageData from array
    const canvasImageData = this.offscreenContext.createImageData(width, height);
    canvasImageData.data.set(imageData);

    // Draw to offscreen canvas
    this.offscreenContext.putImageData(canvasImageData, 0, 0);

    return this.offscreenCanvas;
  }

  // Draw processed image to main canvas with optional progress
  drawProcessedImageToCanvas(processedData, width, height, targetCanvas, progress = null) {
    const tempCanvas = this.renderToOffscreenCanvas(processedData, width, height);
    const targetContext = targetCanvas.getContext('2d', {
      colorSpace: 'srgb',
      alpha: true
    });

    // 确保目标canvas的色彩空间设置
    targetContext.imageSmoothingEnabled = true;
    targetContext.imageSmoothingQuality = 'high';

    // Clear canvas
    targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);

    // Draw the processed image
    targetContext.drawImage(tempCanvas, 0, 0, targetCanvas.width, targetCanvas.height);

    // If progress is provided, draw a progress indicator
    if (progress !== null && progress < 100) {
      this.drawProgressIndicator(targetCanvas, progress);
    }
  }

  // Draw progress indicator
  drawProgressIndicator(canvas, progress) {
    const context = canvas.getContext('2d');
    const progressBarHeight = 8;
    const progressBarWidth = canvas.width * 0.8;
    const progressBarX = (canvas.width - progressBarWidth) / 2;
    const progressBarY = canvas.height - 30;

    // Draw background
    context.fillStyle = 'rgba(0, 0, 0, 0.3)';
    context.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

    // Draw progress
    context.fillStyle = '#4CAF50';
    context.fillRect(progressBarX, progressBarY, progressBarWidth * (progress / 100), progressBarHeight);

    // Draw border
    context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    context.lineWidth = 1;
    context.strokeRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);

    // Draw text
    context.fillStyle = 'white';
    context.font = '12px Arial';
    context.textAlign = 'center';
    context.fillText(`${Math.round(progress)}%`, canvas.width / 2, progressBarY - 5);
  }

  // Cancel a specific task
  cancelTask(taskId) {
    if (this.callbacks.has(taskId)) {
      this.callbacks.delete(taskId);
      // Remove from queue if not started
      this.taskQueue = this.taskQueue.filter(task => task.taskId !== taskId);
    }
  }

  // Clear result cache
  clearCache() {
    this.resultCache.clear();
  }

  // Terminate the worker when done
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.taskQueue = [];
    this.callbacks.clear();
    this.resultCache.clear();
  }
}

// Create and export a singleton instance
const imageProcessor = new ImageProcessor();

export default imageProcessor;
export { ImageProcessor };