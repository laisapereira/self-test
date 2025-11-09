'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PaginationProps = {
  totalPages: number
  currentPage: number
}


const Pagination = ({ totalPages, currentPage}: PaginationProps) => {
  const router = useRouter();

    const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    router.push(`?page=${page}`);
  };
  return (
    <div className='flex gap-2'>
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className='cursor-pointer hover:text-gray-400'
      >
        Previous
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => handlePageChange(page)}
          //className={`cursor-pointer hover:text-gray-400 ${currentPage === page ? styles.active : ''}`}
          className='cursor-pointer hover:text-gray-400'
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
       className='cursor-pointer hover:text-gray-400'
      >
        Next
      </button>
    </div>
  );
};

export default Pagination;