-- Mirror the Syracuse Google Calendar / Meet interview workspace in NYC.
CREATE TABLE "GoogleCalendarConnection" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "googleEmail" TEXT,
  "calendarId" TEXT NOT NULL DEFAULT 'primary',
  "encryptedRefreshToken" TEXT NOT NULL,
  "scope" TEXT,
  "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GoogleCalendarConnection_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Meeting"
  ADD COLUMN "meetingProvider" TEXT NOT NULL DEFAULT 'zoom',
  ADD COLUMN "durationMinutes" INTEGER NOT NULL DEFAULT 20,
  ADD COLUMN "googleEventId" TEXT,
  ADD COLUMN "googleMeetLink" TEXT,
  ADD COLUMN "googleCalendarHtmlLink" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "invitedAt" TIMESTAMP(3),
  ADD COLUMN "candidateConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "linkSentAt" TIMESTAMP(3),
  ADD COLUMN "decision" TEXT;

CREATE UNIQUE INDEX "Meeting_googleEventId_key" ON "Meeting"("googleEventId");
