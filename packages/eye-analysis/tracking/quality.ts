// Eye tracking quality metrics and analysis

import type { GazePoint } from "../recorder/types"

interface QualityMetrics {
  averageSamplingRate: number
  dataLossRate: number
  averageConfidence: number
  totalDataPoints: number
  confidenceDistribution: {
    high: number // > 0.8
    medium: number // 0.5 - 0.8
    low: number // < 0.5
  }
}

interface QualityState {
  dataPoints: GazePoint[]
  startTime: number
  lastUpdateTime: number
  samplingRateWindow: number[] // sliding window for sampling rate
  windowSize: number
}

let qualityState: QualityState = {
  dataPoints: [],
  startTime: 0,
  lastUpdateTime: 0,
  samplingRateWindow: [],
  windowSize: 10, // 10 second window
}

/**
 * Start quality tracking
 */
export const startQualityTracking = (): void => {
  qualityState.startTime = Date.now()
  qualityState.lastUpdateTime = qualityState.startTime
  qualityState.dataPoints = []
  qualityState.samplingRateWindow = []
}

/**
 * Stop quality tracking
 */
export const stopQualityTracking = (): void => {
  qualityState.dataPoints = []
  qualityState.samplingRateWindow = []
}

/**
 * Add gaze point for quality analysis
 */
export const addGazePointForQuality = (gazePoint: GazePoint): void => {
  qualityState.dataPoints.push(gazePoint)

  // Update sampling rate window
  const currentTime = Date.now()
  const timeDiff = currentTime - qualityState.lastUpdateTime

  if (timeDiff > 0) {
    const currentSamplingRate = 1000 / timeDiff // Hz
    qualityState.samplingRateWindow.push(currentSamplingRate)

    // Keep only recent samples (sliding window)
    if (qualityState.samplingRateWindow.length > qualityState.windowSize) {
      qualityState.samplingRateWindow.shift()
    }
  }

  qualityState.lastUpdateTime = currentTime
}

/**
 * Calculate current quality metrics
 */
export const getTrackingQuality = (): QualityMetrics => {
  const totalPoints = qualityState.dataPoints.length

  if (totalPoints === 0) {
    return {
      averageSamplingRate: 0,
      dataLossRate: 0,
      averageConfidence: 0,
      totalDataPoints: 0,
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
    }
  }

  // Calculate average sampling rate
  const averageSamplingRate =
    qualityState.samplingRateWindow.length > 0
      ? qualityState.samplingRateWindow.reduce((sum, rate) => sum + rate, 0) /
        qualityState.samplingRateWindow.length
      : 0

  // Calculate confidence metrics
  const confidenceValues = qualityState.dataPoints
    .map((point) => point.confidence)
    .filter((conf) => conf !== undefined) as number[]

  const averageConfidence =
    confidenceValues.length > 0
      ? confidenceValues.reduce((sum, conf) => sum + conf, 0) /
        confidenceValues.length
      : 0

  // Calculate confidence distribution
  const confidenceDistribution = {
    high: confidenceValues.filter((conf) => conf > 0.8).length,
    medium: confidenceValues.filter((conf) => conf >= 0.5 && conf <= 0.8)
      .length,
    low: confidenceValues.filter((conf) => conf < 0.5).length,
  }

  // Calculate data loss rate (simple heuristic based on expected vs actual sampling rate)
  const elapsedTime = (Date.now() - qualityState.startTime) / 1000 // seconds
  const expectedDataPoints = elapsedTime * (averageSamplingRate || 60) // assume 60Hz if no data
  const dataLossRate =
    expectedDataPoints > 0
      ? Math.max(0, 1 - totalPoints / expectedDataPoints)
      : 0

  return {
    averageSamplingRate,
    dataLossRate,
    averageConfidence,
    totalDataPoints: totalPoints,
    confidenceDistribution,
  }
}

/**
 * Get quality assessment as human-readable string
 */
export const getQualityAssessment = (): {
  overall: "excellent" | "good" | "fair" | "poor"
  details: string[]
} => {
  const metrics = getTrackingQuality()
  const details: string[] = []

  // Assess sampling rate
  if (metrics.averageSamplingRate > 50) {
    details.push("Sampling rate: Excellent")
  } else if (metrics.averageSamplingRate > 30) {
    details.push("Sampling rate: Good")
  } else if (metrics.averageSamplingRate > 15) {
    details.push("Sampling rate: Fair")
  } else {
    details.push("Sampling rate: Poor")
  }

  // Assess confidence
  if (metrics.averageConfidence > 0.8) {
    details.push("Confidence: Excellent")
  } else if (metrics.averageConfidence > 0.6) {
    details.push("Confidence: Good")
  } else if (metrics.averageConfidence > 0.4) {
    details.push("Confidence: Fair")
  } else {
    details.push("Confidence: Poor")
  }

  // Assess data loss
  if (metrics.dataLossRate < 0.1) {
    details.push("Data loss: Minimal")
  } else if (metrics.dataLossRate < 0.3) {
    details.push("Data loss: Moderate")
  } else {
    details.push("Data loss: High")
  }

  // Overall assessment
  const scores = [
    metrics.averageSamplingRate > 50
      ? 4
      : metrics.averageSamplingRate > 30
        ? 3
        : metrics.averageSamplingRate > 15
          ? 2
          : 1,
    metrics.averageConfidence > 0.8
      ? 4
      : metrics.averageConfidence > 0.6
        ? 3
        : metrics.averageConfidence > 0.4
          ? 2
          : 1,
    metrics.dataLossRate < 0.1 ? 4 : metrics.dataLossRate < 0.3 ? 3 : 2,
  ]

  const averageScore =
    scores.reduce((sum, score) => sum + score, 0) / scores.length
  const overall =
    averageScore >= 3.5
      ? "excellent"
      : averageScore >= 2.5
        ? "good"
        : averageScore >= 1.5
          ? "fair"
          : "poor"

  return { overall, details }
}

/**
 * Reset quality state
 */
export const resetQualityState = (): void => {
  qualityState = {
    dataPoints: [],
    startTime: 0,
    lastUpdateTime: 0,
    samplingRateWindow: [],
    windowSize: 10,
  }
}
