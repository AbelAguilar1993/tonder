"use client";

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const generatePages = () => {
    const pages = [];

    // Always show first page
    pages.push(1);

    // Show pages around current page
    let startPage = Math.max(2, currentPage - 2);
    let endPage = Math.min(totalPages - 1, currentPage + 2);

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push("...");
    }

    // Add pages around current page
    for (let i = startPage; i <= endPage; i++) {
      if (i !== 1 && i !== totalPages) {
        pages.push(i);
      }
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push("...");
    }

    // Always show last page (if more than 1 page total)
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    // Remove duplicates
    return pages.filter((page, index, array) => array.indexOf(page) === index);
  };

  const pages = generatePages();

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      {pages.map((page, index) => {
        if (page === "...") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="w-10 h-10 flex items-center justify-center text-sm font-medium border-2 transition-colors text-green-400"
            >
              ...
            </span>
          );
        }

        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-10 h-10 flex items-center justify-center text-md font-medium border-2 transition-colors cursor-pointer border-[#6ac79a] bg-[#e1f3eb] ${
              page === currentPage
                ? "text-white font-semibold"
                : "text-green-400 hover:bg-green-50"
            }`}
          >
            {page}
          </button>
        );
      })}
    </div>
  );
}
