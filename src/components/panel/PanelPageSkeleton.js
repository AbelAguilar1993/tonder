const PanelPageSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-2 md:p-4">
    <div className="container max-w-screen-md mx-auto">
      <div className="bg-white shadow-lg p-2 md:p-4">
        {/* Header */}
        <header className="mb-6">
          <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-white/90 backdrop-blur-sm p-4 shadow-lg animate-pulse">
            {/* Top accent stripe */}
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>

            {/* Title */}
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
            </div>

            {/* KPIs */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="relative overflow-hidden rounded-2xl border border-purple-200 bg-white p-3 shadow-sm"
                >
                  <div className="h-3 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-12 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Main content area */}
        <section className="space-y-4">
          <div className="border border-purple-200 rounded-2xl bg-white shadow-sm overflow-hidden animate-pulse">
            <div className="p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-purple-100/50">
              <div className="h-5 bg-gray-200 rounded w-56"></div>
            </div>

            <div className="p-4">
              {/* Search */}
              <div className="mb-4">
                <div className="h-10 bg-gray-200 rounded-xl w-full"></div>
              </div>

              {/* List items */}
              <div className="divide-y divide-purple-100">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="py-3 px-3 rounded-lg flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    {index % 2 === 0 && (
                      <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-4 h-3 bg-gray-200 rounded w-full"></div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
);

export default PanelPageSkeleton;
