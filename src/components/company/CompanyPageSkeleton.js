const CompanyPageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
      <div className="container max-w-screen-md mx-auto">
        <div className="bg-white shadow-lg overflow-hidden p-2 md:p-4 animate-pulse">
          {/* Hero Section Skeleton */}
          <header className="text-gray-600 mb-4 min-h-32 border-b p-4 bg-gray-200">
            <div className="flex gap-4">
              {/* Company Logo Skeleton */}
              <div className="bg-gray-300 shadow-md border-1 border-gray-300 w-20 h-20 flex-shrink-0"></div>

              {/* Company Information Skeleton */}
              <div className="flex flex-col w-full gap-2 justify-between">
                <div className="h-6 w-48 bg-gray-300 rounded"></div>

                <div className="h-6 w-48 bg-gray-300 rounded"></div>

                {/* Location Skeleton */}
                <div className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <div className="h-4 w-32 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>

            {/* Company Stats Skeleton */}
            <div className="flex gap-1 mt-4 justify-center">
              <div className="flex items-center p-2 md:p-2 rounded-lg bg-white border border-gray-300 w-26 md:w-30">
                <div className="flex flex-col text-xs gap-1">
                  <div className="h-3 w-16 bg-gray-300 rounded"></div>
                  <div className="h-3 w-20 bg-gray-300 rounded"></div>
                </div>
              </div>
              <div className="flex items-center p-2 md:p-2 rounded-lg bg-white border border-gray-300 w-26 md:w-30">
                <div className="flex flex-col text-xs gap-1">
                  <div className="h-3 w-12 bg-gray-300 rounded"></div>
                  <div className="h-3 w-8 bg-gray-300 rounded"></div>
                </div>
              </div>
              <div className="flex items-center p-2 md:p-2 rounded-lg bg-white border border-gray-300 w-26 md:w-30">
                <div className="flex flex-col text-xs gap-1">
                  <div className="h-3 w-10 bg-gray-300 rounded"></div>
                  <div className="h-3 w-12 bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
          </header>

          {/* Jobs Section Skeleton */}
          <div className="">
            <div className="flex justify-between items-center mb-4">
              <div className="h-6 w-32 bg-gray-300 rounded"></div>
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 bg-gray-300 rounded"></div>
                <div className="h-3 w-16 bg-gray-300 rounded"></div>
              </div>
            </div>

            {/* Job Cards Skeleton */}
            <div className="space-y-2 md:space-y-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <div
                  key={index}
                  className="flex gap-2 items-center p-2 border-1 border-[#0001] shadow-lg rounded-lg"
                >
                  <div className="min-w-[75px] h-[75px] bg-gray-300 rounded-lg"></div>
                  <div className="flex flex-col gap-2 w-full">
                    <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyPageSkeleton;
