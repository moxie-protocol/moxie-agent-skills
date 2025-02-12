import { useCallback, useEffect, useRef, useState } from 'react';

const INTERVAL = 100;

type HookProps = {
  text: string;
  interval?: number;
  onComplete?: () => void;
  enableAiWriter?: boolean;
};

export function useTextTypingEffect({
  text: completeText,
  interval = INTERVAL,
  onComplete,
  enableAiWriter = true,
}: HookProps) {
  const currentIndexRef = useRef(1);
  const enableAnimation = useRef(enableAiWriter);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const textRef = useRef(completeText);
  const [displayText, setDisplayText] = useState('');

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setDisplayText('');
    currentIndexRef.current = 1;
    stop();
  }, [stop]);

  const animate = useCallback(() => {
    intervalRef.current = setInterval(() => {
      if (currentIndexRef?.current > textRef.current?.length) {
        stop();
        onComplete?.();
        return;
      }
      setDisplayText(textRef.current.substring(0, currentIndexRef.current));
      currentIndexRef.current++;
    }, interval);
  }, [interval, onComplete, stop]);

  useEffect(() => {
    stop();
    textRef.current = completeText;
    if (textRef.current && enableAnimation.current) {
      animate();
    }
  }, [stop, animate, completeText]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  return {
    text:
      completeText === displayText || !enableAnimation.current
        ? completeText
        : displayText + '...',
    stop,
    reset,
  };
}
