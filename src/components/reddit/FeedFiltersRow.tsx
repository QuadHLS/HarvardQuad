import { Rocket, ChevronDown, MessageSquare, Clock } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export type FeedSortBy = 'hearts' | 'replies' | 'earliest';

const SORT_LABELS: Record<FeedSortBy, string> = {
  hearts: 'Best posts',
  replies: 'Most replied',
  earliest: 'Earliest',
};

interface FeedFiltersRowProps {
  sortBy: FeedSortBy;
  onSortChange: (sort: FeedSortBy) => void;
  className?: string;
}

export function FeedFiltersRow({ sortBy, onSortChange, className = '' }: FeedFiltersRowProps) {
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 bg-[#f5f5f5] w-screen ml-[calc(-50vw+50%)] mr-[calc(-50vw+50%)] ${className}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-bold text-[#1c1c1c] bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <Rocket className="w-4 h-4 text-[#ff4500]" />
            {SORT_LABELS[sortBy].toUpperCase()}
            <ChevronDown className="w-4 h-4 text-[#7c7c7c]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[10rem] bg-white border border-[#e4e4e4]">
          <DropdownMenuItem onClick={() => onSortChange('hearts')} className="gap-2">
            <Rocket className="w-4 h-4" />
            Best posts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange('replies')} className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Most replied
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onSortChange('earliest')} className="gap-2">
            <Clock className="w-4 h-4" />
            Earliest
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
