import JobCard from "./JobCard";
import JobCardSkeleton from "./JobCardSkeleton";

const JobsList = ({
  jobs = [],
  loadingMore = false,
  location = "",   // brugerens/override-lokation (fx "León, México")
  clickable = false,
}) => (
  <div className="space-y-2 md:space-y-4">
    {jobs.map((job, index) => (
      <JobCard
        key={job?.id ?? job?.slug ?? `job-${index}`}
        job={job}
        location={location}   // sendes til JobCard → normaliseres/accents-fixes der
        clickable={clickable}
      />
    ))}

    {loadingMore &&
      Array.from({ length: 7 }).map((_, i) => (
        <JobCardSkeleton key={`loading-${i}`} />
      ))}
  </div>
);

export default JobsList;
