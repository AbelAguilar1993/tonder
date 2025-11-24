const LoadMoreButton = ({ onLoadMore, hasMore, isLoading }) => {
  if (!hasMore || isLoading) return null;

  return (
    <div className="flex justify-center mt-4">
      <button
        onClick={onLoadMore}
        className="bg-[#f0f0f0] text-sm text-black px-4 py-2 rounded-md border-none transition-all duration-200 cursor-pointer hover:bg-[#e0e0e0]"
      >
        Ver más oportunidades
      </button>
    </div>
  );
};

export default LoadMoreButton;
