CREATE TABLE `Department` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(80) NOT NULL,
  `parentId` INTEGER NULL,
  `sort` INTEGER NOT NULL DEFAULT 0,
  `enabled` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `Department_code_key`(`code`),
  INDEX `Department_parentId_sort_idx`(`parentId`, `sort`),
  INDEX `Department_enabled_idx`(`enabled`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `User`
  ADD COLUMN `departmentId` INTEGER NULL,
  ADD INDEX `User_departmentId_idx`(`departmentId`);

ALTER TABLE `Role`
  ADD COLUMN `dataScope` ENUM(
    'ALL',
    'CUSTOM',
    'DEPARTMENT',
    'DEPARTMENT_AND_CHILDREN',
    'SELF'
  ) NOT NULL DEFAULT 'SELF';

CREATE TABLE `RoleDepartment` (
  `roleId` INTEGER NOT NULL,
  `departmentId` INTEGER NOT NULL,
  INDEX `RoleDepartment_departmentId_idx`(`departmentId`),
  PRIMARY KEY (`roleId`, `departmentId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `AuditLog` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `actorId` INTEGER NULL,
  `actorName` VARCHAR(32) NULL,
  `action` VARCHAR(80) NOT NULL,
  `resource` VARCHAR(80) NOT NULL,
  `resourceId` VARCHAR(80) NULL,
  `method` VARCHAR(10) NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `ip` VARCHAR(64) NOT NULL,
  `userAgent` VARCHAR(255) NULL,
  `statusCode` INTEGER NOT NULL,
  `success` BOOLEAN NOT NULL,
  `durationMs` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
  INDEX `AuditLog_action_createdAt_idx`(`action`, `createdAt`),
  INDEX `AuditLog_success_createdAt_idx`(`success`, `createdAt`),
  INDEX `AuditLog_createdAt_idx`(`createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Department` ADD CONSTRAINT `Department_parentId_fkey`
  FOREIGN KEY (`parentId`) REFERENCES `Department`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `User` ADD CONSTRAINT `User_departmentId_fkey`
  FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `RoleDepartment` ADD CONSTRAINT `RoleDepartment_roleId_fkey`
  FOREIGN KEY (`roleId`) REFERENCES `Role`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `RoleDepartment` ADD CONSTRAINT `RoleDepartment_departmentId_fkey`
  FOREIGN KEY (`departmentId`) REFERENCES `Department`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey`
  FOREIGN KEY (`actorId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
