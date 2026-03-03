import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Star, ThumbsUp, MessageSquare, User } from 'lucide-react';

// Star Rating Component
export const StarRating = ({ rating, onRatingChange, size = 'md', readonly = false }) => {
  const [hoverRating, setHoverRating] = useState(0);
  
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  const sizeClass = sizes[size];
  
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer'} transition-transform hover:scale-110`}
          onClick={() => !readonly && onRatingChange?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => !readonly && setHoverRating(0)}
        >
          <Star 
            className={`${sizeClass} ${
              star <= (hoverRating || rating) 
                ? 'fill-yellow-400 text-yellow-400' 
                : 'fill-muted text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

// Review Form Modal
export const ReviewModal = ({ 
  open, 
  onOpenChange, 
  escrowId,
  sellerName,
  auctionTitle,
  onSubmit,
  loading
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = () => {
    if (rating === 0) return;
    onSubmit({
      escrow_id: escrowId,
      rating,
      review_comment: comment
    });
  };

  const ratingLabels = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Very Good',
    5: 'Excellent'
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="review-modal">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>
            Rate Your Experience
          </DialogTitle>
          <DialogDescription>
            Leave a review for <strong>{sellerName}</strong> for your purchase of &quot;{auctionTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating */}
          <div className="space-y-3 text-center">
            <Label className="text-sm font-medium">How would you rate this seller?</Label>
            <div className="flex justify-center">
              <StarRating 
                rating={rating} 
                onRatingChange={setRating}
                size="lg"
              />
            </div>
            {rating > 0 && (
              <p className="text-sm text-primary font-medium">
                {ratingLabels[rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div className="space-y-2">
            <Label htmlFor="review-comment" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Your Review (Optional)
            </Label>
            <Textarea
              id="review-comment"
              placeholder="Share your experience with this seller..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
              maxLength={1000}
              data-testid="review-comment-input"
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/1000
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Skip
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={rating === 0 || loading}
            data-testid="submit-review-btn"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Display a single review
export const ReviewCard = ({ review }) => {
  return (
    <Card className="border-l-4 border-l-primary/30">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">{review.reviewer_name}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(review.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          <StarRating rating={review.rating} size="sm" readonly />
        </div>
        {review.comment && (
          <p className="mt-3 text-sm text-muted-foreground">
            "{review.comment}"
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Reviews List Component
export const ReviewsList = ({ reviews = [], showAll = false }) => {
  const displayedReviews = showAll ? reviews : reviews.slice(0, 3);
  
  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ThumbsUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No reviews yet</p>
      </div>
    );
  }

  // Calculate average
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
        <div className="text-center">
          <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
          <StarRating rating={Math.round(avgRating)} size="sm" readonly />
          <p className="text-xs text-muted-foreground mt-1">
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex-1 space-y-1">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = reviews.filter(r => r.rating === stars).length;
            const percentage = (count / reviews.length) * 100;
            return (
              <div key={stars} className="flex items-center gap-2 text-xs">
                <span className="w-3">{stars}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews */}
      <div className="space-y-3">
        {displayedReviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
};

export default ReviewModal;
