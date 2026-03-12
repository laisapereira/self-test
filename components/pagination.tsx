'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type PaginationProps = {
  totalPages: number
  currentPage: number
}

const Pagination = ({ totalPages, currentPage }: PaginationProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    
   
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("page", page.toString());
    
    router.push(`?${current.toString()}`);
  };

  const PAGE_WINDOW = 10; // number of page buttons shown per window

  // compute window start and end so currentPage is always visible
  const windowStart = Math.floor((Math.max(currentPage, 1) - 1) / PAGE_WINDOW) * PAGE_WINDOW + 1;
  const windowEnd = Math.min(windowStart + PAGE_WINDOW - 1, totalPages);

  const pagesInWindow = Array.from({ length: Math.max(0, windowEnd - windowStart + 1) }, (_, i) => windowStart + i);

  return (
    <div className="flex items-center justify-center gap-2 mt-6">

      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex items-center cursor-pointer gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
      >
   
        <ChevronLeft size={16} />
        <span>Anterior</span>
      </button>

      <div className="flex items-center gap-1">
      
        {windowStart > 1 && (
          <button
            onClick={() => handlePageChange(Math.max(1, windowStart - PAGE_WINDOW))}
            className="w-10 h-10 flex items-center justify-center text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="previous pages"
          >
            ...
          </button>
        )}

        {pagesInWindow.map((page) => {
          const isActive = currentPage === page;
          
          return (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`
                w-10 h-10 cursor-pointer flex items-center justify-center text-sm font-medium rounded-md transition-colors
                ${isActive 
                  ? 'bg-slate-900 text-white shadow-md' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900' 
                }
              `}
            >
              {page}
            </button>
          );
        })}

    
        {windowEnd < totalPages && (
          <button
            onClick={() => handlePageChange(Math.min(totalPages, windowEnd + 1))}
            className="w-10 h-10 flex items-center justify-center text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="next pages"
          >
            ...
          </button>
        )}
      </div>


      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex cursor-pointer items-center gap-1 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        <span>Próximo</span>
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default Pagination;