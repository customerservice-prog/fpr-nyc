CREATE TABLE IF NOT EXISTS "GeneralDocument" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "fileUrl" TEXT,
  "category" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneralDocument_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "SourceCodeSnippet" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "location" TEXT NOT NULL DEFAULT 'head',
  "code" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SourceCodeSnippet_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "SetupSurvey" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "questions" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SetupSurvey_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "AutomaticTextMessage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "daysToSend" INTEGER NOT NULL DEFAULT 0,
  "sendOption" TEXT NOT NULL DEFAULT 'Before Order Starts',
  "message" TEXT NOT NULL,
  "filter" TEXT NOT NULL DEFAULT 'Active Only',
  "sendOnlyTo" TEXT,
  "sendBccTo" TEXT,
  "disableMessage" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomaticTextMessage_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "TextMessageTemplate" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TextMessageTemplate_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "EmailTemplateOrder" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailTemplateOrder_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "EmailTemplateMarketing" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailTemplateMarketing_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "ErsMailMessage" (
  "id" TEXT NOT NULL,
  "toAddress" TEXT NOT NULL,
  "fromAddress" TEXT,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Sent',
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErsMailMessage_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "ContractOption" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "requireSignature" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContractOption_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "WebsitePage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT,
  "isPublished" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsitePage_pkey" PRIMARY KEY ("id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "WebsitePage_slug_key" ON "WebsitePage"("slug");

CREATE TABLE IF NOT EXISTS "GeneralImage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "category" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneralImage_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "NavigationItem" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NavigationItem_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "PremiumFeature" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PremiumFeature_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "ResponsiveSetting" (
  "id" TEXT NOT NULL,
  "device" TEXT NOT NULL,
  "cssOverrides" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ResponsiveSetting_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "ConversionBooster" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'popup',
  "content" TEXT,
  "triggerRule" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConversionBooster_pkey" PRIMARY KEY ("id")
  );

INSERT INTO "AutomaticTextMessage" ("id","name","daysToSend","sendOption","message","filter","disableMessage","createdAt","updatedAt")
SELECT 'atm_prepay_text','Pre-Pay Text Reminder',-3,'Before Order Starts','Hi, your event is coming up in 3 days. Please review your order balance.','Active Only',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "AutomaticTextMessage" WHERE "id"='atm_prepay_text');

INSERT INTO "AutomaticTextMessage" ("id","name","daysToSend","sendOption","message","filter","disableMessage","createdAt","updatedAt")
SELECT 'atm_prerental_text','Pre-Rental Text Reminder',-1,'Before Order Starts','Hi, your rental delivery is scheduled for tomorrow.','Active Only',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "AutomaticTextMessage" WHERE "id"='atm_prerental_text');

INSERT INTO "ContractOption" ("id","name","content","requireSignature","isActive","sortOrder","createdAt","updatedAt")
SELECT 'contract_standard','Standard Rental Agreement','By signing below you agree to the terms and conditions of this rental agreement.',true,true,0,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "ContractOption" WHERE "id"='contract_standard');

INSERT INTO "PremiumFeature" ("id","name","description","isEnabled","updatedAt")
SELECT 'feature_online_signing','Online Contract Signing','Allow customers to sign contracts online',false,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PremiumFeature" WHERE "id"='feature_online_signing');

INSERT INTO "PremiumFeature" ("id","name","description","isEnabled","updatedAt")
SELECT 'feature_sms_reminders','SMS Reminders','Enable automatic SMS reminders to customers',false,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PremiumFeature" WHERE "id"='feature_sms_reminders');

INSERT INTO "TextMessageTemplate" ("id","name","content","isActive","createdAt")
SELECT 'tmpl_thankyou','Thank You','Thank you for choosing Friendly Party Rental! We hope your event was a success.',true,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "TextMessageTemplate" WHERE "id"='tmpl_thankyou');
