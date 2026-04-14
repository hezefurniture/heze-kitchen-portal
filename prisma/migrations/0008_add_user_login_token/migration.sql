-- AlterTable
ALTER TABLE "User" ADD COLUMN "loginToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_loginToken_key" ON "User"("loginToken");
