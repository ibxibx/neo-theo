"use client";

import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Optional Dynamic Island label, shown live during calls */
  islandLabel?: string;
};

/**
 * iPhone-shaped device frame with notch, Dynamic Island, status bar,
 * and home indicator. Children render inside the screen.
 */
export function IPhoneFrame({ children, islandLabel }: Props) {
  return (
    <div className="iphone-frame">
      <div className="iphone-screen">
        {/* Dynamic Island */}
        <div className="dynamic-island">
          {islandLabel ? (
            <span className="px-3 truncate">{islandLabel}</span>
          ) : (
            <span className="opacity-0">·</span>
          )}
        </div>

        {/* iOS status bar */}
        <div className="ios-statusbar">
          <span className="ios-statusbar-time">9:41</span>
          <span className="ios-statusbar-icons">
            {/* signal */}
            <SignalIcon />
            <WifiIcon />
            <BatteryIcon />
          </span>
        </div>

        {/* Screen content */}
        <div className="relative h-[calc(100%-54px-24px)] overflow-hidden">
          {children}
        </div>

        {/* Home indicator */}
        <div className="home-indicator" />
      </div>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="18" height="11" viewBox="0 0 18 11" fill="none">
      <rect x="0" y="7" width="3" height="4" rx="0.5" fill="currentColor" />
      <rect x="5" y="5" width="3" height="6" rx="0.5" fill="currentColor" />
      <rect x="10" y="3" width="3" height="8" rx="0.5" fill="currentColor" />
      <rect x="15" y="0" width="3" height="11" rx="0.5" fill="currentColor" />
    </svg>
  );
}
function WifiIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
      <path d="M8 11a1.5 1.5 0 100-3 1.5 1.5 0 000 3zm-3.6-2.7a1 1 0 011.4 0 3.2 3.2 0 014.4 0 1 1 0 101.4-1.4 5.2 5.2 0 00-7.2 0 1 1 0 000 1.4zm-3-3a1 1 0 011.4 0 7.4 7.4 0 0110.4 0 1 1 0 101.4-1.4 9.4 9.4 0 00-13.2 0 1 1 0 000 1.4z" />
    </svg>
  );
}
function BatteryIcon() {
  return (
    <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="22"
        height="12"
        rx="3"
        stroke="currentColor"
        opacity="0.4"
      />
      <rect x="2" y="2" width="19" height="9" rx="1.5" fill="currentColor" />
      <rect
        x="24"
        y="4"
        width="2"
        height="5"
        rx="1"
        fill="currentColor"
        opacity="0.4"
      />
    </svg>
  );
}
