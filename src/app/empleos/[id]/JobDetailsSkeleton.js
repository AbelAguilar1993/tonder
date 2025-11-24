const JobDetailsSkeleton = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 px-2 md:px-4 py-2 text-gray-600 text-sm pb-8">
      <div className="container max-w-screen-md mx-auto">
        <div className="bg-white shadow-lg overflow-hidden p-2 md:p-4">
          {/* Hero section skeleton */}
          <header
            className="mb-4 min-h-32 border-b p-4"
            style={{
              borderBottomColor: "#e7e7e7",
              background: `
                linear-gradient(180deg, #e7e7e7 0 20%, transparent 20% 100%),
                radial-gradient(1000px 320px at 90% -80px, rgba(255,255,255,.14), rgba(255,255,255,0) 60%),
                linear-gradient(180deg, #e7e7e7 0 20%, #fff 85%)
              `,
            }}
          >
            <div className="flex gap-4">
              {/* Company Logo */}
              <div
                className="bg-white rounded-lg shadow-md border-1 border-[#e7e7e7] shadow-[0 8px 24px rgba(0, 0, 0, .06)] w-20 h-20 flex-shrink-0 flex justify-center items-center animate-pulse"
                style={{
                  backgroundColor: "#e7e7e7",
                }}
              ></div>

              {/* Job Information */}
              <div className="fflex flex-col w-full gap-2 justify-between relative -top-[0px]">
                <div className="h-6 bg-white/30 rounded-lg animate-pulse mb-1"></div>
                <div className="h-4 bg-white/30 rounded-lg animate-pulse w-1/2 mb-1 relative top-[5px]"></div>
                <div className="h-4 bg-white/30 rounded-lg animate-pulse w-2/3 relative top-[10px]"></div>
              </div>
            </div>

            {/* Job Stats */}
            <div className="flex gap-1 mt-4 justify-center">
              <div className="flex items-center p-2 md:p-2 rounded-lg bg-white border border-gray-300 w-26 md:w-30">
                <div className="flex flex-col text-xs">
                  <div className="h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center p-2 md:p-2 rounded-lg bg-white border border-gray-300 w-26 md:w-30">
                <div className="flex flex-col text-xs">
                  <div className="h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center p-2 md:p-2 rounded-lg bg-white border border-gray-300 w-26 md:w-30">
                <div className="flex flex-col text-xs">
                  <div className="h-3 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          </header>

          {/* HR Contacts section skeleton */}
          <section className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 bg-gray-200 rounded-lg animate-pulse w-1/3"></div>
              <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse"></div>
            </div>

            {/* Guide section skeleton */}
            <div className="border border-gray-200 rounded-xl bg-gray-50 p-2 md:p-4 mb-2">
              <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-1/2"></div>
              <div className="space-y-1 ml-4">
                <div className="h-3 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded-lg animate-pulse w-4/5"></div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl bg-white p-2 md:p-4 shadow-lg mb-2">
              <div className="grid grid-cols-[56px_1fr_auto] gap-2 items-center">
                <div className="flex">
                  <div className="w-14 h-14 rounded-full bg-gray-100 border border-gray-300 animate-pulse"></div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
                  <div className="flex md:flex-row gap-1 mb-1">
                    <div className="h-3 bg-gray-200 rounded-lg animate-pulse w-16"></div>
                    <div className="h-3 bg-gray-200 rounded-lg animate-pulse w-16"></div>
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    <div className="h-3 bg-gray-200 rounded-lg animate-pulse w-12"></div>
                    <div className="h-4 bg-gray-200 rounded-full animate-pulse w-16"></div>
                  </div>
                </div>
                <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="h-10 bg-gray-200 rounded-xl animate-pulse w-full"></div>

            <div className="h-3 bg-gray-200 rounded-lg animate-pulse mt-2 w-3/4"></div>
          </section>

          {/* Offer section skeleton */}
          <section className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 bg-gray-200 rounded-lg animate-pulse w-32"></div>
              <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse"></div>
            </div>

            {/* Guide section skeleton */}
            <div className="border border-gray-200 rounded-xl bg-gray-50 p-2 md:p-4 mb-2">
              <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-1/2"></div>
              <div className="space-y-1 ml-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-3 bg-gray-200 rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl bg-white p-2 md:p-4 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <div className="h-3 bg-gray-200 rounded-lg animate-pulse w-1/2"></div>
                <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-20 bg-gray-200 rounded-full animate-pulse"
                  ></div>
                ))}
              </div>
            </div>
          </section>

          {/* Live listings section skeleton */}
          <section className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <div className="h-6 bg-gray-200 rounded-lg animate-pulse w-24"></div>
                <div className="h-5 w-8 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            </div>

            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="border border-gray-200 rounded-xl bg-white p-2 md:p-4 shadow-lg"
                >
                  <div className="grid grid-cols-[56px_1fr_auto] gap-3 items-center">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 border border-gray-200 animate-pulse"></div>
                    <div className="flex flex-col space-y-1">
                      <div>
                        <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-1"></div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="h-6 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                        <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <div className="h-6 w-16 bg-gray-200 rounded-xl animate-pulse"></div>
                      </div>
                      <div className="h-6 w-24 bg-gray-200 rounded-xl animate-pulse"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI snapshot section skeleton */}
          <section className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-6 bg-gray-200 rounded-lg animate-pulse w-32"></div>
              <div className="h-6 w-12 bg-gray-200 rounded-full animate-pulse"></div>
            </div>

            {/* Guide section skeleton */}
            <div className="border border-gray-200 rounded-xl bg-gray-50 p-2 md:p-4 mb-2">
              <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-1/2"></div>
              <div className="space-y-1 ml-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-3 bg-gray-200 rounded-lg animate-pulse"
                  ></div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl bg-white p-2 md:p-4 shadow-lg">
              <div className="grid md:grid-cols-2 gap-2 md:gap-4 mb-4">
                <div>
                  <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-1/2"></div>
                  <div className="space-y-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-3 bg-gray-200 rounded-lg animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-1/2"></div>
                  <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-3 bg-gray-200 rounded-lg animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-1/2"></div>
                  <div className="space-y-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-3 bg-gray-200 rounded-lg animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-1/2"></div>
                  <div className="space-y-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="h-3 bg-gray-200 rounded-lg animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="h-4 bg-gray-200 rounded-lg animate-pulse mb-2 w-1/2"></div>
                  <div className="space-y-1">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-3 bg-gray-200 rounded-lg animate-pulse"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 border rounded-xl p-2 border-gray-200 bg-white">
                <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex-1 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="w-16 h-10 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded-lg animate-pulse mt-1 w-1/2"></div>

              <div className="h-3 bg-gray-200 rounded-lg animate-pulse mt-1 w-1/2"></div>
            </div>
          </section>

          {/* Ready summary skeleton */}
          <section>
            <div className="h-6 bg-gray-200 rounded-lg animate-pulse mb-2 w-1/4"></div>
            <div className="border border-gray-200 rounded-xl bg-white p-4 shadow-lg">
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-1/4"></div>
                    <div className="h-4 bg-gray-200 rounded-lg animate-pulse w-1/3"></div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsSkeleton;
