import { useState, useEffect } from 'react';

export const CountdownTimer = ({ endsAt, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const endTime = new Date(endsAt).getTime();
      const now = Date.now();
      const diff = endTime - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        if (onExpire) onExpire();
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setIsUrgent(days === 0 && hours < 2);
      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [endsAt, onExpire]);

  if (isExpired) {
    return (
      <div className="timer-display text-accent" data-testid="timer-expired">
        Auction Ended
      </div>
    );
  }

  return (
    <div className={`flex gap-2 ${isUrgent ? 'timer-urgent' : ''}`} data-testid="countdown-timer">
      {timeLeft.days > 0 && (
        <div className="timer-segment">
          <span className="timer-value font-mono">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="timer-label">Days</span>
        </div>
      )}
      <div className="timer-segment">
        <span className="timer-value font-mono">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span className="timer-label">Hours</span>
      </div>
      <div className="timer-segment">
        <span className="timer-value font-mono">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span className="timer-label">Mins</span>
      </div>
      <div className="timer-segment">
        <span className={`timer-value font-mono ${isUrgent ? 'animate-countdown' : ''}`}>
          {String(timeLeft.seconds).padStart(2, '0')}
        </span>
        <span className="timer-label">Secs</span>
      </div>
    </div>
  );
};

export default CountdownTimer;
