import React, { useEffect, useRef, useState } from 'react';

interface LiquidGaugeProps {
    value: number; // 0 to 100
    size?: number;
}

const LiquidGauge: React.FC<LiquidGaugeProps> = ({ value, size = 120 }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    
    // Parallax & Mouse State
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [currentRotation, setCurrentRotation] = useState({ x: 0, y: 0 });

    // Wave Physics State
    const wavePoints = useRef<any[]>([]);
    const numPoints = 50;

    // Radius derived from size
    const potRadius = size / 2;

    const [displayValue, setDisplayValue] = useState(0);

    // Initial fill animation
    useEffect(() => {
        let animationFrame: number;
        const startTime = Date.now();
        const startValue = 0; // Always start fill from 0 on mount/change for effect, or use a ref to track previous
        const endValue = value;
        const duration = 2000; // 2 seconds fill time

        const step = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const ease = 1 - Math.pow(1 - progress, 3);
            
            const current = startValue + (endValue - startValue) * ease;
            setDisplayValue(current);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(step);
            }
        };

        step();

        return () => {
            if (animationFrame) cancelAnimationFrame(animationFrame);
        };
    }, [value]);



    // Initialize wave points
    useEffect(() => {
        wavePoints.current = [];
        for (let i = 0; i < numPoints; i++) {
            wavePoints.current.push({
                x: (i / (numPoints - 1)) * (potRadius * 2),
                y: 0,
                velocity: 0,
                force: 0
            });
        }
    }, [size]);

    // Handle Rotation Smoothing
    useEffect(() => {
        const targetRotX = (mousePos.y / 100) * 15;
        const targetRotY = (mousePos.x / 100) * 15;

        const interval = setInterval(() => {
            setCurrentRotation(prev => ({
                x: prev.x + (targetRotX - prev.x) * 0.1,
                y: prev.y + (targetRotY - prev.y) * 0.1
            }));
        }, 16);

        return () => clearInterval(interval);
    }, [mousePos]);

    // Main Animation Loop
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = size / 2;
        const centerY = size / 2;

        let time = 0;

        const animate = () => {
            ctx.clearRect(0, 0, size, size);

            // Draw Pot Outline
            ctx.strokeStyle = '#22c55e'; // green-500 equivalent
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, potRadius - 2, 0, Math.PI * 2); // -2 for stroke width padding
            ctx.stroke();

            // Calculate Water Level
            const targetWaterLevel = Math.max(0, Math.min(1, displayValue / 100));
            // We can animate the fill here if we want, but for now let's map directly or use simple lerp if needed.
            // The reference used a fill animation on mount. Let's stick to the value passed.
            
            if (targetWaterLevel > 0) {
                const waterHeight = (potRadius * 2) * targetWaterLevel;
                const waterTop = centerY + potRadius - waterHeight;

                // Wave Physics
                const k = 0.025;
                const damping = 0.025;
                const spread = 0.25;

                for (let i = 0; i < numPoints; i++) {
                    const point = wavePoints.current[i];
                    
                    // Ambient wave
                    const ambientWave = Math.sin(time * 2 + i * 0.3) * 2 + 
                                      Math.sin(time * 3 + i * 0.5) * 1.5;

                    point.force = -k * point.y + ambientWave * 0.1;
                    point.velocity += point.force;
                    point.y += point.velocity;
                    point.velocity *= (1 - damping);
                }

                // Propagate
                for (let i = 0; i < numPoints; i++) {
                    if (i > 0) {
                        const leftDelta = spread * (wavePoints.current[i].y - wavePoints.current[i - 1].y);
                        wavePoints.current[i - 1].velocity += leftDelta;
                    }
                    if (i < numPoints - 1) {
                        const rightDelta = spread * (wavePoints.current[i].y - wavePoints.current[i + 1].y);
                        wavePoints.current[i + 1].velocity += rightDelta;
                    }
                }

                // Draw Water with Clip
                ctx.save();
                ctx.beginPath();
                ctx.arc(centerX, centerY, potRadius - 2, 0, Math.PI * 2);
                ctx.clip();

                ctx.fillStyle = '#47f425'; // green-500
                ctx.beginPath();
                ctx.moveTo(centerX - potRadius, size); // Bottom left

                for (let i = 0; i < numPoints; i++) {
                    const point = wavePoints.current[i];
                    const x = centerX - potRadius + point.x;
                    const y = waterTop + point.y;
                    ctx.lineTo(x, y);
                }

                ctx.lineTo(centerX + potRadius, size); // Bottom right
                ctx.lineTo(centerX - potRadius, size); // Close
                ctx.fill();
                ctx.restore();
            }

            time += 0.016;
            animationRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [displayValue, size, potRadius]);

    // Mouse Handlers
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        // Check if inside circle
        const distanceFromCenter = Math.sqrt(x*x + y*y);
        const inside = distanceFromCenter <= potRadius;

        if (inside) {
             // Scale mouse pos for rotation effect intensity
             // Reference used x/100 * 15. Here x is roughly -60 to 60 for size 120.
            setMousePos({ x, y });
        } else {
            setMousePos({ x: x * 0.5, y: y * 0.5 }); // Dampen effect outside
        }
    };

    // Mobile Touch Handlers
    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        // Prevent scroll while interacting with the gauge
        if (e.cancelable) e.preventDefault();

        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left - rect.width / 2;
        const y = touch.clientY - rect.top - rect.height / 2;
        
        // Touch interaction always considered 'inside' for easier mobile usage
        // Boost rotation intensity significantly for visibility
        setMousePos({ x, y });
    };

    const handleMouseLeave = () => {
        setMousePos({ x: 0, y: 0 });
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
        e.stopPropagation(); // Prevent parent modal opening
        
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        let clientX, clientY;
        if ('touches' in e) {
             clientX = e.changedTouches[0].clientX;
             clientY = e.changedTouches[0].clientY;
        } else {
             clientX = (e as React.MouseEvent).clientX;
             clientY = (e as React.MouseEvent).clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        // Calculate water top relative to canvas
        // Note: The canvas is centered in the container with padding now.
        // We need to account for padding if we add it on the container div
        
        // Let's keep calculation relative to the size passsed, assuming canvas fills the defined size area
        // If we add padding to wrapper, we must ensure click coordinates map correctly to canvas space.
        // Actually, let's keep the wrapper tight but rely on the TRANSFORM to throw it around.
        // The user asked for "canva ao redor deve ser um pouco maior".
        // Instead of padding, let's just make the hitbox bigger or visually scale down the pot inside the frame.
        // Easiest is to add padding to the style below.

        const targetWaterLevel = Math.max(0, Math.min(1, value / 100));
        const waterHeight = (potRadius * 2) * targetWaterLevel;
        const waterTop = (size / 2) + potRadius - waterHeight; // This assumes canvas coordinate system

        // Find closest point
        if (Math.abs(y - waterTop) < 60) { // Slight increase in splash hit area
            for (let i = 0; i < numPoints; i++) {
                const point = wavePoints.current[i];
                const pointScreenX = point.x; 
                // Adjust x if we had padding? 
                // If canvas is absolute centered, 'x' click relative to container should match canvas X if container is paddingbox.
                // Let's check container.
                
                // If we add padding: 20px.
                // x relative to container = 20 + canvasX. 
                // adjusting:
                const effectiveX = x - 20; // Assuming 20px padding

                const distance = Math.abs(pointScreenX - effectiveX);

                if (distance < (size / 3)) { 
                     const force = (1 - distance / (size/3)) * -5; // Stronger splash
                     point.velocity += force;
                }
            }
        }
    };

    return (
        <div 
            ref={containerRef}
            className="relative cursor-pointer"
            style={{ 
                width: size + 40, // Increased container size for more parallax room
                height: size + 40,
                perspective: '1000px',
                padding: '20px' // Padding to center the actual gauge
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseLeave}
            onClick={handleClick}
        >
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    transformStyle: 'preserve-3d',
                    transform: `rotateX(${-currentRotation.x * 2.5}deg) rotateY(${currentRotation.y * 2.5}deg)`, // Increased Parallax Intensity
                    transition: 'transform 0.1s ease-out'
                }}
            >
                <div 
                    className="absolute inset-0 flex items-center justify-center" // Center canvas in padded container
                    style={{
                        transformStyle: 'preserve-3d',
                    }}
                >
                     <canvas
                        ref={canvasRef}
                        width={size}
                        height={size}
                        className="block"
                    />
                </div>

                {/* Percentage Text */}
                <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-20"
                    style={{
                        transform: 'translateZ(60px)', // Increased depth
                    }}
                >
                    <span 
                        className="font-bold text-white drop-shadow-md"
                        style={{
                            fontSize: `${size * 0.25}px`, 
                            textShadow: '0 4px 15px rgba(0,0,0,0.9), 0 0 30px rgba(34, 197, 94, 0.6)'
                        }}
                    >
                        {Math.round(Math.max(0, Math.min(100, displayValue)))}%
                    </span>
                </div>
            </div>
        </div>
    );
};

export default LiquidGauge;
