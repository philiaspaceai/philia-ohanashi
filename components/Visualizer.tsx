import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  outputAnalyser: AnalyserNode | null;
  inputAnalyser: AnalyserNode | null;
  isActive: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ outputAnalyser, inputAnalyser, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 128;
    const aiData = new Uint8Array(bufferLength);
    const micData = new Uint8Array(bufferLength);
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      
      if (outputAnalyser) outputAnalyser.getByteFrequencyData(aiData);
      if (inputAnalyser) inputAnalyser.getByteFrequencyData(micData);

      // Clear with very slight trail for fluid motion
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      const centerY = canvas.height / 2;

      for (let i = 0; i < bufferLength; i++) {
        // 1. MIC VOICE (User) - Blue Electric
        // Render behind AI voice for depth
        const micHeight = (micData[i] / 255) * centerY * 1.1; // Make user voice slightly taller
        if (micHeight > 2) {
          ctx.fillStyle = `rgba(59, 130, 246, ${0.4 + micHeight / 100})`;
          ctx.fillRect(i * barWidth, centerY - micHeight, barWidth - 1, micHeight * 2);
        }

        // 2. AI VOICE - Solid White
        const aiHeight = (aiData[i] / 255) * centerY * 0.9;
        if (aiHeight > 2) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.6 + aiHeight / 100})`;
          ctx.fillRect(i * barWidth, centerY - aiHeight, barWidth - 1, aiHeight * 2);
        }
      }
      
      // Decorative horizon line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(canvas.width, centerY);
      ctx.stroke();
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [outputAnalyser, inputAnalyser, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={200} 
      className="w-full h-full rounded-2xl border border-white/5 bg-black/40 backdrop-blur-md shadow-inner"
    />
  );
};