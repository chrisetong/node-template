CREATE TABLE `User` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(32) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `tokenVersion` INTEGER NOT NULL DEFAULT 1,
  `passwordVersion` INTEGER NOT NULL DEFAULT 1,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `User_username_key`(`username`),
  INDEX `User_enabled_idx`(`enabled`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Role` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `isSuper` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Role_code_key`(`code`),
  INDEX `Role_enabled_idx`(`enabled`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `UserRole` (
  `userId` INTEGER NOT NULL,
  `roleId` INTEGER NOT NULL,
  INDEX `UserRole_roleId_idx`(`roleId`),
  PRIMARY KEY (`userId`, `roleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Menu` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL,
  `path` VARCHAR(120) NOT NULL,
  `component` VARCHAR(120) NOT NULL DEFAULT '',
  `icon` VARCHAR(50) NOT NULL DEFAULT 'CircleDot',
  `parentId` INTEGER NULL,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `permissions` JSON NULL,
  UNIQUE INDEX `Menu_path_key`(`path`),
  INDEX `Menu_parentId_sort_idx`(`parentId`, `sort`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `RoleMenu` (
  `roleId` INTEGER NOT NULL,
  `menuId` INTEGER NOT NULL,
  INDEX `RoleMenu_menuId_idx`(`menuId`),
  PRIMARY KEY (`roleId`, `menuId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `UserRole` ADD CONSTRAINT `UserRole_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Menu` ADD CONSTRAINT `Menu_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Menu`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RoleMenu` ADD CONSTRAINT `RoleMenu_roleId_fkey` FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RoleMenu` ADD CONSTRAINT `RoleMenu_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `Menu`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
