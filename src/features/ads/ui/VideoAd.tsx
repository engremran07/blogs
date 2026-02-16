/**
 * VideoAd — Video ad player with pre-roll / mid-roll / post-roll support.
 * Supports VAST/VPAID tags, direct MP4, and provider-injected video ads.
 *
 * Features:
 * - Autoplay with mute (respects browser policies)
 * - Countdown to skip
 * - Impression/completion tracking
 * - Fallback to display ad if video fails
 */
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Volume2, VolumeX, X } from "lucide-react";
import { AdRenderer, type AdPlacementData } from "./AdRenderer";

interface VideoAdProps {
  placement: AdPlacementData;
  /** Direct video URL (if not using adCode/customHtml for VAST) */
  videoUrl?: string;
  /** Click-through URL */
  clickUrl?: string;
  /** Skip after N seconds (0 = no skip) */
  skipAfterSeconds?: number;
  /** Auto-play the video */
  autoPlay?: boolean;
  closeable?: boolean;
  className?: string;
}

export function VideoAd({
  placement,
  videoUrl,
  clickUrl,
  skipAfterSeconds = 5,
  autoPlay = true,
  closeable = true,
  className = "",
}: VideoAdProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [canSkip, setCanSkip] = useState(skipAfterSeconds <= 0);
  const [elapsed, setElapsed] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Track elapsed time
  useEffect(() => {
    if (!playing || canSkip) return;
    const timer = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= skipAfterSeconds) setCanSkip(true);
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [playing, canSkip, skipAfterSeconds]);

  // Autoplay
  useEffect(() => {
    if (autoPlay && videoRef.current && videoUrl && !videoError) {
      videoRef.current.play().then(() => setPlaying(true)).catch(() => {
        // Autoplay blocked — show play button
        setPlaying(false);
      });
    }
  }, [autoPlay, videoUrl, videoError]);

  const handlePlay = useCallback(() => {
    videoRef.current?.play();
    setPlaying(true);
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(!muted);
    }
  }, [muted]);

  const handleSkip = useCallback(() => {
    setDismissed(true);
    if (placement.id) {
      navigator.sendBeacon?.("/api/ads/events", JSON.stringify({
        placementId: placement.id,
        eventType: "CLOSE",
      }));
    }
  }, [placement.id]);

  const handleVideoEnd = useCallback(() => {
    setPlaying(false);
    if (placement.id) {
      navigator.sendBeacon?.("/api/ads/events", JSON.stringify({
        placementId: placement.id,
        eventType: "VIDEO_COMPLETE",
      }));
    }
  }, [placement.id]);

  const handleVideoStart = useCallback(() => {
    setPlaying(true);
    if (placement.id) {
      navigator.sendBeacon?.("/api/ads/events", JSON.stringify({
        placementId: placement.id,
        eventType: "VIDEO_START",
      }));
    }
  }, [placement.id]);

  if (dismissed) return null;

  // If no video URL, fall back to the standard ad renderer (provider script / customHtml)
  if (!videoUrl || videoError) {
    return (
      <div className={`relative ${className}`} data-ad-type="video-fallback">
        <AdRenderer placement={placement} />
      </div>
    );
  }

  const videoElement = (
    <video
      ref={videoRef}
      src={videoUrl}
      muted={muted}
      playsInline
      onPlay={handleVideoStart}
      onEnded={handleVideoEnd}
      onError={() => setVideoError(true)}
      className="h-full w-full rounded-xl object-cover"
      onClick={() => clickUrl && window.open(clickUrl, "_blank", "noopener")}
      style={clickUrl ? { cursor: "pointer" } : undefined}
    />
  );

  return (
    <div className={`relative overflow-hidden rounded-xl bg-black ${className}`} data-ad-type="video">
      {videoElement}

      {/* Play overlay */}
      {!playing && (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/40"
          aria-label="Play ad"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <Play className="h-7 w-7 text-gray-800" />
          </div>
        </button>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between bg-linear-to-t from-black/60 to-transparent px-4 py-3">
        {/* Mute toggle */}
        <button onClick={toggleMute} className="text-white/80 hover:text-white" aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>

        {/* Sponsored label */}
        <span className="text-xs font-medium text-white/60">Sponsored</span>

        {/* Skip / Close */}
        {closeable && (
          canSkip ? (
            <button
              onClick={handleSkip}
              className="flex items-center gap-1 rounded bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/30"
            >
              <X className="h-3 w-3" /> Skip
            </button>
          ) : (
            <span className="rounded bg-white/10 px-3 py-1 text-xs text-white/80">
              Skip in {skipAfterSeconds - elapsed}s
            </span>
          )
        )}
      </div>
    </div>
  );
}
