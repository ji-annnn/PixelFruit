// Web Worker for image processing
// This worker handles computationally intensive tasks like color adjustments, sharpening, and noise reduction

// Initialize message handler
self.onmessage = function(e) {
  const { task, data } = e.data;
  
  try {
    switch(task) {
      case 'processImage':
        processImage(data);
        break;
      case 'applyMedianFilter':
        applyMedianFilterOptimized(data);
        break;
      case 'applyGaussianFilter':
        applyGaussianFilterOptimized(data);
        break;
      case 'computeHistogram':
        computeHistogram(data);
        break;
      case 'applyColorAdjustments':
        applyColorAdjustments(data);
        break;
      default:
        self.postMessage({ success: false, error: `Unknown task: ${task}` });
    }
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};

// Process image with progressive rendering
function processImage(data) {
  const { imageData, operations, width, height, batchSize = 10 } = data;
  const totalPixels = width * height;
  const batchCount = Math.ceil(totalPixels / (batchSize * batchSize));
  let processedPixels = 0;
  let processedImageData = new Uint8ClampedArray(imageData);
  
  // Process in batches for progressive rendering
  function processBatch(batchIndex) {
    if (batchIndex >= batchCount) {
      // Final result
      self.postMessage({
        success: true,
        task: 'processImage',
        result: processedImageData,
        complete: true
      }, [processedImageData.buffer]);
      return;
    }
    
    const batchStartX = Math.floor((batchIndex * batchSize * width) / (batchCount * width / batchSize)) % (width - batchSize + 1);
    const batchStartY = Math.floor((batchIndex * batchSize) / (batchCount / (height / batchSize))) % (height - batchSize + 1);
    
    // Process this batch
    for (let y = batchStartY; y < Math.min(batchStartY + batchSize, height); y++) {
      for (let x = batchStartX; x < Math.min(batchStartX + batchSize, width); x++) {
        const index = (y * width + x) * 4;
        
        // Apply all operations to this pixel
        operations.forEach(op => {
          if (op.type === 'colorAdjustments') {
            adjustPixelColor(processedImageData, index, op.params);
          }
        });
      }
    }
    
    processedPixels += batchSize * batchSize;
    
    // Send progress update
    self.postMessage({
      success: true,
      task: 'processImage',
      result: processedImageData,
      complete: false,
      progress: Math.min(100, Math.round((processedPixels / totalPixels) * 100))
    }, [processedImageData.buffer]);
    
    // Schedule next batch
    setTimeout(() => processBatch(batchIndex + 1), 0);
  }
  
  // Start processing batches
  processBatch(0);
}

// Optimized median filter with faster sorting
function applyMedianFilterOptimized(data) {
  const { imageData, width, height, radius = 1 } = data;
  const result = new Uint8ClampedArray(imageData);
  const size = 2 * radius + 1;
  
  // Process each pixel
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      // Collect neighborhood pixels for each channel
      const rValues = [];
      const gValues = [];
      const bValues = [];
      
      // Collect pixel values in the neighborhood
      for (let ky = -radius; ky <= radius; ky++) {
        for (let kx = -radius; kx <= radius; kx++) {
          const neighborIndex = ((y + ky) * width + (x + kx)) * 4;
          rValues.push(imageData[neighborIndex]);
          gValues.push(imageData[neighborIndex + 1]);
          bValues.push(imageData[neighborIndex + 2]);
        }
      }
      
      // Use faster selection algorithm instead of full sort
      const midIndex = Math.floor(rValues.length / 2);
      
      // Apply median value to the pixel
      const index = (y * width + x) * 4;
      result[index] = findKthSmallest(rValues, midIndex);
      result[index + 1] = findKthSmallest(gValues, midIndex);
      result[index + 2] = findKthSmallest(bValues, midIndex);
      // Preserve alpha channel
      result[index + 3] = imageData[index + 3];
    }
  }
  
  self.postMessage({
    success: true,
    task: 'applyMedianFilter',
    result: result
  }, [result.buffer]);
}

// Quickselect algorithm for finding median without full sort
function findKthSmallest(arr, k) {
  const clonedArr = [...arr];
  return quickselect(clonedArr, 0, clonedArr.length - 1, k);
}

function quickselect(arr, left, right, k) {
  if (left === right) return arr[left];
  
  const pivotIndex = partition(arr, left, right);
  
  if (k === pivotIndex) {
    return arr[k];
  } else if (k < pivotIndex) {
    return quickselect(arr, left, pivotIndex - 1, k);
  } else {
    return quickselect(arr, pivotIndex + 1, right, k);
  }
}

function partition(arr, left, right) {
  const pivot = arr[right];
  let i = left;
  
  for (let j = left; j < right; j++) {
    if (arr[j] <= pivot) {
      [arr[i], arr[j]] = [arr[j], arr[i]];
      i++;
    }
  }
  
  [arr[i], arr[right]] = [arr[right], arr[i]];
  return i;
}

// Optimized Gaussian filter with precomputed kernel
function applyGaussianFilterOptimized(data) {
  const { imageData, width, height, sigma = 1.0 } = data;
  const result = new Uint8ClampedArray(imageData);
  
  // Precompute Gaussian kernel
  const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
  const kernel = createGaussianKernel(kernelSize, sigma);
  const radius = Math.floor(kernelSize / 2);
  
  // Apply horizontal blur
  const tempBuffer = new Uint8ClampedArray(imageData.length);
  
  // Horizontal pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, weightSum = 0;
      
      for (let kx = -radius; kx <= radius; kx++) {
        const nx = Math.min(Math.max(x + kx, 0), width - 1);
        const weight = kernel[kx + radius];
        const index = (y * width + nx) * 4;
        
        r += imageData[index] * weight;
        g += imageData[index + 1] * weight;
        b += imageData[index + 2] * weight;
        weightSum += weight;
      }
      
      const index = (y * width + x) * 4;
      tempBuffer[index] = Math.min(255, Math.max(0, Math.round(r / weightSum)));
      tempBuffer[index + 1] = Math.min(255, Math.max(0, Math.round(g / weightSum)));
      tempBuffer[index + 2] = Math.min(255, Math.max(0, Math.round(b / weightSum)));
      tempBuffer[index + 3] = imageData[index + 3];
    }
  }
  
  // Vertical pass
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, weightSum = 0;
      
      for (let ky = -radius; ky <= radius; ky++) {
        const ny = Math.min(Math.max(y + ky, 0), height - 1);
        const weight = kernel[ky + radius];
        const index = (ny * width + x) * 4;
        
        r += tempBuffer[index] * weight;
        g += tempBuffer[index + 1] * weight;
        b += tempBuffer[index + 2] * weight;
        weightSum += weight;
      }
      
      const index = (y * width + x) * 4;
      result[index] = Math.min(255, Math.max(0, Math.round(r / weightSum)));
      result[index + 1] = Math.min(255, Math.max(0, Math.round(g / weightSum)));
      result[index + 2] = Math.min(255, Math.max(0, Math.round(b / weightSum)));
      result[index + 3] = tempBuffer[index + 3];
    }
  }
  
  self.postMessage({
    success: true,
    task: 'applyGaussianFilter',
    result: result
  }, [result.buffer]);
}

// Create Gaussian kernel
function createGaussianKernel(size, sigma) {
  const kernel = new Float32Array(size);
  const radius = Math.floor(size / 2);
  const sigmaSq = sigma * sigma;
  let sum = 0;
  
  for (let i = -radius; i <= radius; i++) {
    const index = i + radius;
    kernel[index] = Math.exp(-(i * i) / (2 * sigmaSq));
    sum += kernel[index];
  }
  
  // Normalize the kernel
  for (let i = 0; i < size; i++) {
    kernel[i] /= sum;
  }
  
  return kernel;
}

// Compute histogram with caching potential
function computeHistogram(data) {
  const { imageData, width, height } = data;
  const histogram = {
    red: new Uint32Array(256),
    green: new Uint32Array(256),
    blue: new Uint32Array(256),
    luminance: new Uint32Array(256)
  };
  
  // Process pixels
  for (let i = 0; i < imageData.length; i += 4) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];
    
    // Skip transparent pixels
    if (a < 128) continue;
    
    // Increment histogram counts
    histogram.red[r]++;
    histogram.green[g]++;
    histogram.blue[b]++;
    
    // Calculate luminance (using ITU-R BT.709 formula)
    const luminance = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    histogram.luminance[luminance]++;
  }
  
  // Convert to regular arrays for transfer
  self.postMessage({
    success: true,
    task: 'computeHistogram',
    result: {
      red: Array.from(histogram.red),
      green: Array.from(histogram.green),
      blue: Array.from(histogram.blue),
      luminance: Array.from(histogram.luminance)
    }
  });
}

// Apply color adjustments
function applyColorAdjustments(data) {
  const { imageData, width, height, params } = data;
  const result = new Uint8ClampedArray(imageData);
  
  for (let i = 0; i < imageData.length; i += 4) {
    adjustPixelColor(result, i, params);
  }
  
  self.postMessage({
    success: true,
    task: 'applyColorAdjustments',
    result: result
  }, [result.buffer]);
}

// Adjust individual pixel color
function adjustPixelColor(imageData, index, params) {
  let r = imageData[index];
  let g = imageData[index + 1];
  let b = imageData[index + 2];
  const a = imageData[index + 3];
  
  // Apply brightness
  if (params.brightness) {
    const brightnessFactor = 1 + params.brightness / 100;
    r = Math.min(255, Math.max(0, r * brightnessFactor));
    g = Math.min(255, Math.max(0, g * brightnessFactor));
    b = Math.min(255, Math.max(0, b * brightnessFactor));
  }
  
  // Apply contrast
  if (params.contrast) {
    const contrastFactor = 1 + params.contrast / 100;
    r = Math.min(255, Math.max(0, 128 + (r - 128) * contrastFactor));
    g = Math.min(255, Math.max(0, 128 + (g - 128) * contrastFactor));
    b = Math.min(255, Math.max(0, 128 + (b - 128) * contrastFactor));
  }
  
  // Apply saturation
  if (params.saturation) {
    // Convert to HSL and adjust saturation
    const hsl = rgbToHsl(r, g, b);
    hsl.s = Math.min(1, Math.max(0, hsl.s * (1 + params.saturation / 100)));
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    r = rgb.r;
    g = rgb.g;
    b = rgb.b;
  }
  
  // Apply temperature
  if (params.temperature) {
    // Simple temperature adjustment
    const tempFactor = params.temperature / 100;
    if (tempFactor > 0) {
      // Warmer (more red/yellow)
      r = Math.min(255, r + tempFactor * 20);
      g = Math.min(255, g + tempFactor * 10);
    } else {
      // Cooler (more blue)
      b = Math.min(255, b - tempFactor * 20);
    }
  }
  
  // Apply exposure compensation
  if (params.exposure) {
    const exposureFactor = Math.pow(2, params.exposure / 3);
    r = Math.min(255, Math.max(0, r * exposureFactor));
    g = Math.min(255, Math.max(0, g * exposureFactor));
    b = Math.min(255, Math.max(0, b * exposureFactor));
  }
  
  // Apply shadows and highlights
  if (params.shadows !== undefined) {
    const shadowFactor = 1 + params.shadows / 100;
    if (r < 128) r = Math.min(128, r * shadowFactor);
    if (g < 128) g = Math.min(128, g * shadowFactor);
    if (b < 128) b = Math.min(128, b * shadowFactor);
  }
  
  if (params.highlights !== undefined) {
    const highlightFactor = 1 - params.highlights / 100;
    if (r > 128) r = Math.max(128, 255 - (255 - r) * highlightFactor);
    if (g > 128) g = Math.max(128, 255 - (255 - g) * highlightFactor);
    if (b > 128) b = Math.max(128, 255 - (255 - b) * highlightFactor);
  }
  
  // Update pixel data
  imageData[index] = Math.round(r);
  imageData[index + 1] = Math.round(g);
  imageData[index + 2] = Math.round(b);
  imageData[index + 3] = a;
}

// Helper functions for color space conversion
function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h /= 6;
  }
  
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}