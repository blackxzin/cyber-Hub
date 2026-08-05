-- CreateEnum
CREATE TYPE "RoleName" AS ENUM ('ADMIN', 'ANALYST', 'VIEWER', 'BOT');

-- CreateEnum
CREATE TYPE "ConsultaType" AS ENUM ('IP', 'DOMAIN', 'CVE', 'NEWS');

-- CreateEnum
CREATE TYPE "ConsultaStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'HTML', 'JSON');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('DISCORD', 'EMAIL', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "AiKind" AS ENUM ('RESUME_IP', 'RESUME_DOMAIN', 'EXPLAIN_CVE', 'RESUME_NEWS', 'REPORT_SUMMARY', 'CHAT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "apiKeyHash" TEXT,
    "role" "RoleName" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" "RoleName" NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consulta" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ConsultaType" NOT NULL,
    "query" TEXT NOT NULL,
    "status" "ConsultaStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultaResult" (
    "id" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultaResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiSummary" (
    "id" TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "kind" "AiKind" NOT NULL,
    "prompt" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "consultaId" TEXT,
    "title" TEXT NOT NULL,
    "summaryExec" TEXT,
    "riskScore" INTEGER,
    "filePath" TEXT,
    "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rule" JSONB NOT NULL,
    "channel" "AlertChannel" NOT NULL DEFAULT 'DISCORD',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cve" (
    "id" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "cvss" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cve_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CveReference" (
    "id" TEXT NOT NULL,
    "cveId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "CveReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT,
    "publishedAt" TIMESTAMP(3),
    "summary" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL,
    "newsId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT,

    CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Configuracao" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "Configuracao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKeyHash_key" ON "User"("apiKeyHash");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Role_name_idx" ON "Role"("name");

-- CreateIndex
CREATE INDEX "Permission_roleId_idx" ON "Permission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_roleId_key" ON "Permission"("name", "roleId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Consulta_userId_createdAt_idx" ON "Consulta"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Consulta_type_query_idx" ON "Consulta"("type", "query");

-- CreateIndex
CREATE INDEX "ConsultaResult_consultaId_idx" ON "ConsultaResult"("consultaId");

-- CreateIndex
CREATE INDEX "ConsultaResult_source_idx" ON "ConsultaResult"("source");

-- CreateIndex
CREATE UNIQUE INDEX "AiSummary_consultaId_key" ON "AiSummary"("consultaId");

-- CreateIndex
CREATE INDEX "AiSummary_kind_idx" ON "AiSummary"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Report_consultaId_key" ON "Report"("consultaId");

-- CreateIndex
CREATE INDEX "Report_userId_createdAt_idx" ON "Report"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Alert_userId_idx" ON "Alert"("userId");

-- CreateIndex
CREATE INDEX "Alert_active_idx" ON "Alert"("active");

-- CreateIndex
CREATE INDEX "Cve_publishedAt_idx" ON "Cve"("publishedAt");

-- CreateIndex
CREATE INDEX "CveReference_cveId_idx" ON "CveReference"("cveId");

-- CreateIndex
CREATE UNIQUE INDEX "News_url_key" ON "News"("url");

-- CreateIndex
CREATE INDEX "News_publishedAt_idx" ON "News"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsSource_newsId_idx" ON "NewsSource"("newsId");

-- CreateIndex
CREATE INDEX "Configuracao_key_idx" ON "Configuracao"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Configuracao_userId_key_key" ON "Configuracao"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultaResult" ADD CONSTRAINT "ConsultaResult_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiSummary" ADD CONSTRAINT "AiSummary_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_consultaId_fkey" FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CveReference" ADD CONSTRAINT "CveReference_cveId_fkey" FOREIGN KEY ("cveId") REFERENCES "Cve"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsSource" ADD CONSTRAINT "NewsSource_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES "News"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Configuracao" ADD CONSTRAINT "Configuracao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
