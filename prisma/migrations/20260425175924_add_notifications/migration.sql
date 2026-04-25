-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TIME_OFF_REQUESTED', 'TIME_OFF_APPROVED', 'TIME_OFF_REJECTED', 'TIME_OFF_CANCELLED', 'DOCUMENT_UPLOADED', 'WELCOME');

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recipientEmployeeId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "relatedTimeOffRequestId" TEXT,
    "relatedDocumentId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_recipientEmployeeId_readAt_idx" ON "Notification"("recipientEmployeeId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_recipientEmployeeId_createdAt_idx" ON "Notification"("recipientEmployeeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_organizationId_idx" ON "Notification"("organizationId");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientEmployeeId_fkey" FOREIGN KEY ("recipientEmployeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
