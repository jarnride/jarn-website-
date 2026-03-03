import { CheckCircle, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const VerifiedBadge = ({ size = 'sm', showText = false, className = '' }) => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-flex items-center gap-1 ${className}`}>
            <span className="relative">
              <Shield className={`${sizeClasses[size]} text-blue-500 fill-blue-100`} />
              <CheckCircle className={`${sizeClasses[size]} text-blue-500 absolute top-0 left-0 scale-75`} />
            </span>
            {showText && (
              <span className="text-xs font-medium text-blue-600">Verified</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Verified Seller - Identity confirmed by Jarnnmarket</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const VerifiedSellerBadge = ({ seller, size = 'sm', showName = true }) => {
  if (!seller?.is_verified) return null;
  
  return (
    <span className="inline-flex items-center gap-1.5">
      {showName && <span>{seller.name}</span>}
      <VerifiedBadge size={size} />
    </span>
  );
};

export default VerifiedBadge;
