import { useTextTypingEffect } from '@/hooks/useTextTypingEffect';

const Message = ({ text, user }: { text: string, user: string }) => {
  const { text: typingText } = useTextTypingEffect({
    text: text,
    interval: 5,
    enableAiWriter: user !== "user",
  });

  return typingText
}

export default Message