/*
  Warnings:

  - A unique constraint covering the columns `[authorId,jobId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Review_authorId_jobId_key" ON "Review"("authorId", "jobId");
