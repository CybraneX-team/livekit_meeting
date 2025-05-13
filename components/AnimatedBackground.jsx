'use client';

import React, { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width, height;
    
    // Set canvas dimensions to match window
    const setCanvasDimensions = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      
      // Reinitialize particles when resizing
      initParticles();
    };
    
    // Create particles
    let particlesArray = [];
    let particleCount = 0;
    
    // Adjust particle count based on screen size
    const calculateParticleCount = () => {
      // Fewer particles on smaller screens
      if (width < 768) {
        return Math.floor(width * height / 20000);
      } else {
        return Math.floor(width * height / 15000);
      }
    };
    
    class Particle {
      constructor() {
        // Randomize starting position
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        
        // Smaller particle size on mobile
        const sizeMultiplier = width < 768 ? 0.7 : 1;
        this.size = (Math.random() * 2 + 1) * sizeMultiplier;
        
        // Slower movement on smaller screens
        const speedMultiplier = width < 768 ? 0.7 : 1;
        this.speedX = (Math.random() * 0.5 - 0.25) * speedMultiplier;
        this.speedY = (Math.random() * 0.5 - 0.25) * speedMultiplier;
        
        // Use semi-transparent colors
        this.color = this.getRandomColor();
      }
      
      getRandomColor() {
        const colors = [
          'rgba(99, 102, 241, 0.3)',   // indigo
          'rgba(139, 92, 246, 0.3)',    // purple
          'rgba(217, 70, 239, 0.3)',    // pink
          'rgba(79, 70, 229, 0.3)'      // blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
      }
      
      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Wrap around screen edges
        if (this.x > width) this.x = 0;
        else if (this.x < 0) this.x = width;
        
        if (this.y > height) this.y = 0;
        else if (this.y < 0) this.y = height;
      }
      
      draw() {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    const initParticles = () => {
      particlesArray = [];
      particleCount = calculateParticleCount();
      
      for (let i = 0; i < particleCount; i++) {
        particlesArray.push(new Particle());
      }
    };
    
    // Connect particles with lines if they are close enough
    const connect = () => {
      // Adjust connection distance based on screen size
      const maxDistance = width < 768 ? 100 : 150;
      
      // Only check a subset of particles on smaller screens for performance
      const checkEvery = width < 768 ? 2 : 1;
      
      for (let a = 0; a < particlesArray.length; a += checkEvery) {
        for (let b = a; b < particlesArray.length; b += checkEvery) {
          const dx = particlesArray[a].x - particlesArray[b].x;
          const dy = particlesArray[a].y - particlesArray[b].y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance < maxDistance) {
            const opacity = 1 - (distance / maxDistance);
            ctx.strokeStyle = `rgba(139, 92, 246, ${opacity * 0.15})`; // More subtle connections
            ctx.lineWidth = width < 768 ? 0.5 : 1; // Thinner lines on mobile
            ctx.beginPath();
            ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
            ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
            ctx.stroke();
          }
        }
      }
    };
    
    // Animation loop
    const animate = () => {
      // Use a transparent clear for trailing effect on desktop, full clear on mobile
      if (width < 768) {
        ctx.clearRect(0, 0, width, height);
      } else {
        ctx.fillStyle = 'rgba(10, 10, 15, 0.05)';
        ctx.fillRect(0, 0, width, height);
      }
      
      // Update and draw particles
      for (let i = 0; i < particlesArray.length; i++) {
        particlesArray[i].update();
        particlesArray[i].draw();
      }
      
      // Connect particles
      connect();
      
      // Request next frame
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Initialize
    setCanvasDimensions();
    animate();
    
    // Cleanup on component unmount
    return () => {
      window.removeEventListener('resize', setCanvasDimensions);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef}
      className="background-canvas"
      aria-hidden="true"
    />
  );
};

export default AnimatedBackground;