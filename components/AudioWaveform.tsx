"use client";

import { useEffect, useRef } from "react";

interface AudioWaveformProps {
  audioLevel: number; // 0-1
  isRecording: boolean;
  isPaused: boolean;
}

export function AudioWaveform({
  audioLevel,
  isRecording,
  isPaused,
}: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Clear canvas
      ctx.fillStyle = "#f9fafb";
      ctx.fillRect(0, 0, width, height);

      if (!isRecording || isPaused) {
        // Draw flat line when not recording
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.strokeStyle = "#d1d5db";
        ctx.lineWidth = 2;
        ctx.stroke();

        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      // Add current level to history
      historyRef.current.push(audioLevel);

      // Keep only last 100 values
      if (historyRef.current.length > 100) {
        historyRef.current.shift();
      }

      // Draw waveform
      const barWidth = width / 100;
      const centerY = height / 2;

      ctx.beginPath();

      historyRef.current.forEach((level, index) => {
        const x = index * barWidth;
        const barHeight = level * height * 0.8;

        // Draw symmetric bars
        ctx.fillStyle = isPaused ? "#9ca3af" : "#3b82f6";
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
      });

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isRecording, isPaused]);

  // Clear history when recording stops
  useEffect(() => {
    if (!isRecording) {
      historyRef.current = [];
    }
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={100}
      className="w-full max-w-md rounded-lg border border-gray-200"
    />
  );
}
