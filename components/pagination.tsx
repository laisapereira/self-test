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
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
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