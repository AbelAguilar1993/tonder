import CompanyCardSkeleton from "./CompanyCardSkeleton";

const PageSkeleton = () => (
  <div className="bg-white shadow-lg p-2 md:p-4">
    <h2 className="text-lg md:text-xl font-black mb-2 mt-2 bg-gradient-to-r from-[#5E3FA5] to-[#B276CA] bg-clip-text text-transparent">
      ⚡ Empresas con oportunidades
    </h2>

    {/* Skeleton for search section */}
    <div className="mb-4">
      <div className="mb-2 flex gap-1 flex-col md:flex-row md:items-center">
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
        <div className="flex flex-wrap gap-1">
          <div className="h-6 bg-gray-200 rounded-full w-32 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded-full w-28 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded-full w-24 animate-pulse"></div>
        </div>
      </div>
    </div>

    {/* Skeleton for positions count */}
    <div className="flex justify-between items-center mb-4">
      <div className="h-5 bg-gray-200 rounded w-40 animate-pulse"></div>
      <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
    </div>

    {/* Skeleton for jobs list */}
    <div className="space-y-4">
      {Array.from({ length: 7 }).map((_, index) => (
        <CompanyCardSkeleton key={index} />
      ))}
    </div>
  </div>
);

export default PageSkeleton;
