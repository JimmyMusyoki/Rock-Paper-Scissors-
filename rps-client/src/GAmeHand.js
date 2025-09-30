import React, { useState, useEffect } from 'react';

export default function GameHand({ type, disabled=false, onSelect, reveal=false }) {
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    if (reveal) setShaking(false);
  }, [reveal]);

  function handleClick() {
    if (disabled) return;
    setShaking(true);
    setTimeout(() => {
      setShaking(false);
      onSelect && onSelect(type);
    }, 720); // match CSS shake duration
  }

  return (
    <div
      className={`choice-btn ${shaking ? 'shake' : ''} ${reveal ? 'reveal' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={handleClick}
      role="button"
      aria-label={type}
    >
      <img src={`/images/${type}.png`} alt={type} className="hand-img" />
      <div className="choice-label">{type}</div>
    </div>
  );
}
