import React, { useRef, useEffect } from "react";

export const HeroBackground: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const attemptPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.defaultMuted = true;
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  };

  const setVideoRef = (video: HTMLVideoElement | null) => {
    if (!video) return;
    videoRef.current = video;
    video.defaultMuted = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.setAttribute("autoplay", "");
    video.setAttribute("loop", "");

    attemptPlay();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    attemptPlay();

    const handleResume = () => {
      attemptPlay();
    };

    window.addEventListener("touchstart", handleResume, { passive: true });
    window.addEventListener("touchend", handleResume, { passive: true });
    window.addEventListener("click", handleResume, { passive: true });
    window.addEventListener("scroll", handleResume, { passive: true });
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.removeEventListener("touchstart", handleResume);
      window.removeEventListener("touchend", handleResume);
      window.removeEventListener("click", handleResume);
      window.removeEventListener("scroll", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Background Animated Video Layer */}
      <video
        ref={setVideoRef}
        src="/i_want_to_animted_this_video_b.mp4"
        autoPlay
        loop
        muted
        playsInline
        webkit-playsinline="true"
        x5-playsinline="true"
        preload="auto"
        controls={false}
        disablePictureInPicture
        disableRemotePlayback
        className="absolute inset-0 w-full h-full object-cover scale-[1.02] transform pointer-events-none"
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
    </div>
  );
};
