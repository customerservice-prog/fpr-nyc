CREATE TABLE IF NOT EXISTS "SystemSetting" (
  "id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "SystemSetting_category_key_key" ON "SystemSetting"("category", "key");

CREATE TABLE IF NOT EXISTS "TextLog" (
  "id" TEXT NOT NULL,
  "toPhone" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Not Sent',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TextLog_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "apiKey" TEXT,
  "apiSecret" TEXT,
  "accountId" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
  );

CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationConnection_provider_key" ON "IntegrationConnection"("provider");

CREATE TABLE IF NOT EXISTS "Location" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "address" TEXT,
  "city" TEXT,
  "state" TEXT,
  "zip" TEXT,
  "phone" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "CompanyType" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyType_pkey" PRIMARY KEY ("id")
  );

CREATE TABLE IF NOT EXISTS "CompanyRole" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyRole_pkey" PRIMARY KEY ("id")
  );

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_timezone','general','timeZone','America/New_York',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='general' AND "key"='timeZone');

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_maxstops','routing','maxStopsPerRoute','20',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='routing' AND "key"='maxStopsPerRoute');

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_routeopt','routing','routeOptimization','false',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='routing' AND "key"='routeOptimization');

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_reqsig','misc','requireSignature','false',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='misc' AND "key"='requireSignature');

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_showprices','misc','showPricesToCustomers','true',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='misc' AND "key"='showPricesToCustomers');

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_sesstimeout','system','sessionTimeoutMinutes','60',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='system' AND "key"='sessionTimeoutMinutes');

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_maintmode','system','maintenanceMode','false',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='system' AND "key"='maintenanceMode');

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_dateformat','setup','dateFormat','MM/DD/YYYY',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='setup' AND "key"='dateFormat');

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_deflang','setup','defaultLanguage','English',CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='setup' AND "key"='defaultLanguage');

INSERT INTO "SystemSetting" ("id","category","key","value","updatedAt")
SELECT 'sysset_apikey','api','apiKey','ers_live_' || substr(md5(random()::text),1,24),CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "SystemSetting" WHERE "category"='api' AND "key"='apiKey');

INSERT INTO "IntegrationConnection" ("id","provider","isEnabled","updatedAt")
SELECT 'integ_google','google',false,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "IntegrationConnection" WHERE "provider"='google');

INSERT INTO "IntegrationConnection" ("id","provider","isEnabled","updatedAt")
SELECT 'integ_quickbooks','quickbooks',false,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "IntegrationConnection" WHERE "provider"='quickbooks');

INSERT INTO "IntegrationConnection" ("id","provider","isEnabled","updatedAt")
SELECT 'integ_mailchimp','mailchimp',false,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "IntegrationConnection" WHERE "provider"='mailchimp');

INSERT INTO "IntegrationConnection" ("id","provider","isEnabled","updatedAt")
SELECT 'integ_aweber','aweber',false,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "IntegrationConnection" WHERE "provider"='aweber');

INSERT INTO "IntegrationConnection" ("id","provider","isEnabled","updatedAt")
SELECT 'integ_constantcontact','constantcontact',false,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "IntegrationConnection" WHERE "provider"='constantcontact');

INSERT INTO "IntegrationConnection" ("id","provider","isEnabled","updatedAt")
SELECT 'integ_textmessaging','textmessaging',false,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "IntegrationConnection" WHERE "provider"='textmessaging');

INSERT INTO "Location" ("id","name","isActive","isDefault","updatedAt")
SELECT 'loc_main','Main Location',true,true,CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Location" WHERE "id"='loc_main');

INSERT INTO "CompanyType" ("id","name","sortOrder")
SELECT 'ctype_residential','Residential',1
WHERE NOT EXISTS (SELECT 1 FROM "CompanyType" WHERE "name"='Residential');

INSERT INTO "CompanyType" ("id","name","sortOrder")
SELECT 'ctype_corporate','Corporate',2
WHERE NOT EXISTS (SELECT 1 FROM "CompanyType" WHERE "name"='Corporate');

INSERT INTO "CompanyType" ("id","name","sortOrder")
SELECT 'ctype_nonprofit','Non-Profit',3
WHERE NOT EXISTS (SELECT 1 FROM "CompanyType" WHERE "name"='Non-Profit');

INSERT INTO "CompanyType" ("id","name","sortOrder")
SELECT 'ctype_planner','Wedding/Event Planner',4
WHERE NOT EXISTS (SELECT 1 FROM "CompanyType" WHERE "name"='Wedding/Event Planner');

INSERT INTO "CompanyRole" ("id","name","sortOrder")
SELECT 'crole_owner','Owner',1
WHERE NOT EXISTS (SELECT 1 FROM "CompanyRole" WHERE "name"='Owner');

INSERT INTO "CompanyRole" ("id","name","sortOrder")
SELECT 'crole_planner','Event Planner',2
WHERE NOT EXISTS (SELECT 1 FROM "CompanyRole" WHERE "name"='Event Planner');

INSERT INTO "CompanyRole" ("id","name","sortOrder")
  SELECT 'crole_sitecontact','Site Contact',3
WHERE NOT EXISTS (SELECT 1 FROM "CompanyRole" WHERE "name"='Site Contact');

INSERT INTO "CompanyRole" ("id","name","sortOrder")
SELECT 'crole_billing','Billing Contact',4
WHERE NOT EXISTS (SELECT 1 FROM "CompanyRole" WHERE "name"='Billing Contact');
