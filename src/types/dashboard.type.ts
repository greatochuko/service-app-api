import { Job } from "../generated/prisma/client";

/**
 * Dashboard response tailored for the ArtisanDashboard view.
 * Matches the logic for stats, active tasks, and user status.
 */
export interface DashboardResponse {
  stats: {
    totalEarnings: number;
    totalJobs: number;
    averageRating: number;
  };
  // The UI handles the "hasService" state based on whether
  // the user has services or if activeJob exists.
  activeJob: Job | null;

  // To handle the "You have X new requests" sub-greeting
  metadata: {
    pendingRequestsCount: number;
  };
}
