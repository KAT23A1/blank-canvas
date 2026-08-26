import { useEffect, useState } from "react";

const PHRASES = [
  "Paste the mess",
  "Paste a document",
  "Paste a school assignment",
  "Paste a business plan",
  "Paste a contract",
  "Paste your screenshots",
];

const INTERVAL = 4000;
const FADE = 400;

export function RotatingTagline({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      const swap = setTimeout(() => {
        setIndex((i) => (i + 1) % PHRASES.length);
        setVisible(true);
      }, FADE);
      return () => clearTimeout(swap);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return (
    <p className={className}>
      <span
        aria-live="polite"
        className="font-medium text-primary transition-opacity duration-[400ms] ease-in-out"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {PHRASES[index]}
      </span>
      <span>. Get the plan.</span>
    </p>
  );
}
