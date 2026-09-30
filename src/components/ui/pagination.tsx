'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderTop: '1px solid var(--border-color)',
      fontSize: '13px',
      color: 'var(--text-secondary)',
      background: 'var(--bg-card)',
      borderBottomLeftRadius: '12px',
      borderBottomRightRadius: '12px',
    }}>
      <div>
        Showing <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{startItem}</span> to{' '}
        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{endItem}</span> of{' '}
        <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{totalItems}</span> entries
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="btn btn-secondary"
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            opacity: currentPage === 1 ? 0.5 : 1,
            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronLeft size={14} />
          Previous
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className="btn btn-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: currentPage === page ? '700' : '400',
              borderColor: currentPage === page ? 'var(--accent-primary)' : 'var(--border-color)',
              background: currentPage === page ? 'var(--accent-primary)' : 'var(--bg-card)',
              color: currentPage === page ? '#ffffff' : 'var(--text-primary)',
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className="btn btn-secondary"
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            opacity: currentPage === totalPages || totalPages === 0 ? 0.5 : 1,
            cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
