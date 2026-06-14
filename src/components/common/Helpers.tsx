import React from 'react';
import { TrendingUp, TrendingDown, Inbox, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface PriceChangeProps {
  value: number | undefined;
  className?: string;
  showIcon?: boolean;
}

export const PriceChange: React.FC<PriceChangeProps> = ({ value = 0, className = '', showIcon = false }) => {
  const isPositive = value >= 0;
  return (
    <span className={`inline-flex items-center gap-1 font-medium select-none ${
      isPositive ? 'text-gain' : 'text-loss'
    } ${className}`}>
      {showIcon && (isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />)}
      <span className="num">
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </span>
    </span>
  );
};

interface StatusBadgeProps {
  status: 'pending' | 'approved' | 'rejected';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  if (status === 'pending') {
    return (
      <span className="badge-pending inline-flex items-center gap-1 select-none">
        <Clock className="w-3 h-3" />
        <span>Pending</span>
      </span>
    );
  }
  if (status === 'approved') {
    return (
      <span className="badge-approved inline-flex items-center gap-1 select-none">
        <CheckCircle className="w-3 h-3" />
        <span>Approved</span>
      </span>
    );
  }
  return (
    <span className="badge-rejected inline-flex items-center gap-1 select-none">
      <AlertCircle className="w-3 h-3" />
      <span>Rejected</span>
    </span>
  );
};

export const EmptyState: React.FC<{ message: string; submessage?: string }> = ({ message, submessage }) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-navy-card/40 border border-white/[0.05] rounded-2xl select-none">
      <Inbox className="w-10 h-10 text-white/20 mb-3" />
      <p className="text-white/60 text-sm font-medium">{message}</p>
      {submessage && <p className="text-white/30 text-xs mt-1">{submessage}</p>}
    </div>
  );
};
