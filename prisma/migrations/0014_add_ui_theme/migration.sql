-- AlterTable
ALTER TABLE "User" ADD COLUMN     "uiTheme" TEXT;

-- AlterTable
ALTER TABLE "AppSettings" ADD COLUMN     "defaultUiTheme" TEXT NOT NULL DEFAULT 'classic';

