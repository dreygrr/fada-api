/*
  Warnings:

  - Added the required column `dataNascimento` to the `Usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `usuario` ADD COLUMN `dataNascimento` DATETIME(3) NOT NULL;
