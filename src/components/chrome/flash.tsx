import { useEffect, useRef } from "react";

export function Flash({ text, onDone }: { text: string; onDone: () => void }) {
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    const id = window.setTimeout(() => done.current(), 2400);
    return () => window.clearTimeout(id);
  }, [text]);

  return (
    <button type="button" className="zs-toast" onClick={() => done.current()}>
      {text}
    </button>
  );
}
