import { useEffect, useState } from 'react';

export function useStreamableText(stream: ReadableStream<Uint8Array> | null) {
  const [text, setText] = useState('');
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    if (!stream) {
      setIsStreaming(false);
      return;
    }

    let cancelled = false;

    async function readStream() {
      try {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) {
            setIsStreaming(false);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          setText((prev) => prev + chunk);
        }
      } catch (error) {
        console.error('Error reading stream:', error);
        setIsStreaming(false);
      }
    }

    readStream();

    return () => {
      cancelled = true;
    };
  }, [stream]);

  return { text, isStreaming };
}

