-- CreateEnum
CREATE TYPE "EmployeeRole" AS ENUM ('EMPLOYEE', 'MANAGER', 'HR', 'ADMIN');

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "role" "EmployeeRole" NOT NULL DEFAULT 'EMPLOYEE';
