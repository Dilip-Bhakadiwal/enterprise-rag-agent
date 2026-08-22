import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";

interface HeroBackgroundProps {
  onVideoLoaded?: () => void;
}

export const HeroBackground: React.FC<HeroBackgroundProps> = ({ onVideoLoaded }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const playVideo = () => {
      if (videoRef.current) {
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {
          // Autoplay policy fallback
        });
      }
    };

    playVideo();

    // iOS Low Power Mode interaction recovery
    const handleFirstTouch = () => {
      playVideo();
      window.removeEventListener("touchstart", handleFirstTouch);
      window.removeEventListener("click", handleFirstTouch);
    };

    window.addEventListener("touchstart", handleFirstTouch, { passive: true });
    window.addEventListener("click", handleFirstTouch, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleFirstTouch);
      window.removeEventListener("click", handleFirstTouch);
    };
  }, []);

  const handleVideoLoaded = () => {
    if (!isLoaded) {
      setIsLoaded(true);
    }
  };

  const handleAnimationComplete = () => {
    if (isLoaded && onVideoLoaded) {
      onVideoLoaded();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 2.0, ease: "easeInOut" }}
      onAnimationComplete={handleAnimationComplete}
      className="fixed inset-0 overflow-hidden pointer-events-none select-none z-0"
    >
      {/* Background Animated Video Layer */}
      <video
        ref={videoRef}
        onLoadedData={handleVideoLoaded}
        onCanPlay={handleVideoLoaded}
        autoPlay
        loop
        muted
        playsInline
        webkit-playsinline="true"
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        className="absolute inset-0 w-full h-full object-cover scale-[1.02] transform"
        style={{
          filter: "brightness(0.65) contrast(1.15) saturate(1.1)",
        }}
      >
        <source src="/i_want_to_animted_this_video_b.mp4" type="video/mp4" />
      </video>

      {/* Cinematic Deep Dark Gradient Overlay for Maximum Text Legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a111c]/75 via-[#0d1624]/40 to-[#080d16]/90" />

      {/* Atmospheric Aurora Light Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-orange-500/10 blur-3xl rounded-full opacity-60 pointer-events-none" />

      {/* Bottom Mist / Horizon Fade to blend into page footer */}
      <div className="absolute bottom-0 inset-x-0 h-[35%] bg-gradient-to-t from-[#080d16] via-[#080d16]/70 to-transparent" />

      {/* Top Edge Ambient Rim Light */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  );
};
