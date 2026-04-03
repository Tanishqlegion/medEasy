import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';

const LightMedicalBackground = () => {
  // Light mode features an EKG/Neural Pulse and Chemical Hexagon lattice
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[0] bg-slate-50">
      
      {/* Soft Premium Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      {/* Corner Radiance for lighting effect */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-sky-200/40 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-teal-100/40 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />

      {/* Scrolling ECG / Heartbeat Ribbon */}
      <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-64 opacity-20">
        <motion.div 
          className="flex w-[200vw]"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ ease: 'linear', duration: 15, repeat: Infinity }}
        >
          {/* Repeat SVG to create infinite loop */}
          {[1, 2].map((i) => (
            <svg key={i} className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
              <path 
                d="M 0 100 L 200 100 L 220 50 L 240 180 L 270 20 L 300 150 L 320 100 L 700 100 L 720 50 L 740 180 L 770 20 L 800 150 L 820 100 L 1000 100" 
                fill="none" 
                stroke="#0ea5e9" 
                strokeWidth="4" 
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-lg"
              />
            </svg>
          ))}
        </motion.div>
      </div>

      {/* Floating Molecular / Hexagon Chain (Medical/Bio theme) */}
      <div className="absolute inset-x-0 h-full flex items-center justify-center opacity-40">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`hex-${i}`}
            className="absolute rounded-2xl border-4 border-sky-400/20 backdrop-blur-sm shadow-xl"
            style={{
              width: 80 + (i % 3) * 30,
              height: 80 + (i % 3) * 30,
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)'
            }}
            initial={{
              x: Math.random() * 3000 - 1500,
              y: Math.random() * 2000 - 1000,
              rotate: Math.random() * 360,
              scale: Math.random() * 0.5 + 0.5
            }}
            animate={{
              y: [null, -1000],
              rotate: [null, 360],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 10 + Math.random() * 10,
              repeat: Infinity,
              ease: "linear",
              delay: Math.random() * 5
            }}
          />
        ))}
      </div>

      {/* Floating Medical Crosses */}
      {[...Array(8)].map((_, i) => (
        <motion.div
            key={`cross-${i}`}
            initial={{ 
              x: Math.random() * 2000 - 1000, 
              y: Math.random() * 1500,
              scale: Math.random() * 0.4 + 0.2
            }}
            animate={{
              y: [null, -300],
              rotate: [0, 90]
            }}
            transition={{
              duration: 8 + Math.random() * 5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute opacity-20 text-teal-500 font-extrabold text-5xl flex items-center justify-center"
        >
          +
        </motion.div>
      ))}
    </div>
  );
};

const DarkDNABackground = () => {
  // Ultra-Dynamic "Neural Helix" - Diagonal revolving double-helix
  // High density of pairs for a tight, detailed, curved strand
  const pairs = Array.from({ length: 200 }); // More pairs for longer coverage
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[0] bg-[#020617]">
      {/* Dynamic Mesh Glimmer */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_20%,#0e749022,transparent_70%)]" />
      <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_80%_80%,#4338ca22,transparent_70%)]" />
      
      {/* High-Velocity Diagonal Helix */}
      <div className="absolute inset-x-[-50%] inset-y-[-50%] flex items-center justify-center rotate-[35deg] scale-[1.3]">
        <div className="relative w-80 flex flex-col items-center">
          {pairs.map((_, i) => (
            <div
              key={i}
              className="relative w-full h-5 flex items-center justify-center"
              style={{
                perspective: '1500px',
                marginTop: '-10px', // Reduced negative margin to increase spacing between bases
                transformStyle: 'preserve-3d'
              }}
            >
              {/* Helix Core Rotation */}
              <motion.div
                animate={{ rotateY: [0, 360] }}
                transition={{
                  duration: 1.0, // Hyper-fast rotation speed
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.05 // Increased phase delay to make the helix twists much tighter (more compact)
                }}
                className="relative w-full h-full flex items-center justify-between px-20"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Nucleotide Node A */}
                <div 
                  className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_20px_#22d3ee] ring-1 ring-cyan-200/40" 
                  style={{ transform: 'translateZ(70px)' }} // Reduced amplitude for a thinner strand
                />
                
                {/* Hydrogen Bond Connection */}
                <div 
                  className="h-[1px] flex-grow mx-2 bg-gradient-to-r from-cyan-400/60 via-indigo-500/40 to-pink-500/60" 
                  style={{ transform: 'translateZ(35px)' }}
                />
                
                {/* Nucleotide Node B */}
                <div 
                  className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-[0_0_20px_#ec4899] ring-1 ring-pink-300/40" 
                  style={{ transform: 'translateZ(-70px)' }} // Reduced amplitude
                />
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Atmospheric Overlays */}
      <div className="absolute inset-0 bg-dashboard-grid opacity-20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-[#020617] opacity-80" />
      
      {/* Rapid Neural Pulse Particles */}
      {[...Array(60)].map((_, i) => (
        <motion.div
            key={`p-${i}`}
            initial={{ 
              x: Math.random() * 3000 - 1500, 
              y: Math.random() * 2000 + 500,
              opacity: Math.random() * 0.8
            }}
            animate={{
              y: [null, -1000],
              opacity: [null, 0]
            }}
            transition={{
              duration: 0.8 + Math.random() * 1.5,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute w-2 h-2 bg-cyan-500/40 rounded-full blur-[2px]"
        />
      ))}
    </div>
  );
};

const DNABackground = () => {
  const { theme } = useTheme();
  
  if (theme === 'light') {
    return <LightMedicalBackground />;
  }

  return <DarkDNABackground />;
};

export default DNABackground;
