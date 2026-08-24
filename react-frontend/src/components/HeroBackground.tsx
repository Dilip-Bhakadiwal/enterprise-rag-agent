import React, { useRef, useEffect, useState } from "react";
import { motion } from "motion/react";

interface HeroBackgroundProps {
  onVideoLoaded?: () => void;
}

export const HeroBackground: React.FC<HeroBackgroundProps> = ({ onVideoLoaded }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const setVideoRef = (video: HTMLVideoElement | null) => {
    if (!video) return;
    videoRef.current = video;
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsLoaded(true);
        })
        .catch((err) => {
          console.warn("Mobile autoplay policy deferred initial play:", err);
        });
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const attemptPlay = () => {
      if (!video) return;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsLoaded(true))
          .catch(() => {});
      }
    };

    video.addEventListener("loadedmetadata", attemptPlay);
    video.addEventListener("loadeddata", attemptPlay);
    video.addEventListener("canplay", attemptPlay);
    video.addEventListener("playing", () => setIsLoaded(true));

    const handleInteraction = () => {
      attemptPlay();
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
    };

    window.addEventListener("touchstart", handleInteraction, { passive: true });
    window.addEventListener("click", handleInteraction, { passive: true });
    window.addEventListener("scroll", handleInteraction, { passive: true });

    const fallbackTimer = setTimeout(() => {
      setIsLoaded(true);
    }, 1200);

    return () => {
      clearTimeout(fallbackTimer);
      if (video) {
        video.removeEventListener("loadedmetadata", attemptPlay);
        video.removeEventListener("loadeddata", attemptPlay);
        video.removeEventListener("canplay", attemptPlay);
      }
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("scroll", handleInteraction);
    };
  }, []);

  const handleAnimationComplete = () => {
    if (isLoaded && onVideoLoaded) {
      onVideoLoaded();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isLoaded ? 1 : 0 }}
      transition={{ duration: 1.2, ease: "easeInOut" }}
      onAnimationComplete={handleAnimationComplete}
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
    >
      {/* Background Animated Video Layer */}
      <video
        ref={setVideoRef}
        src="/i_want_to_animted_this_video_b.mp4"
        autoPlay
        loop
        muted
        playsInline
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/95" />

      {/* Atmospheric Aurora Light Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-amber-500/10 via-sky-500/10 to-orange-500/10 blur-3xl rounded-full opacity-60 pointer-events-none" />

      {/* Ultra-Smooth Bottom Horizon Fade into Pure Black */}
      <div className="absolute bottom-0 inset-x-0 h-[45%] bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none z-10" />

      {/* Top Edge Ambient Rim Light */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </motion.div>
  );
};
