CREATE TABLE `SystemSetting` (
  `id` INTEGER NOT NULL DEFAULT 1,
  `siteName` VARCHAR(100) NULL,
  `loginLogoPath` VARCHAR(255) NULL,
  `loginDescription` VARCHAR(500) NULL,
  `loginBackgroundPath` VARCHAR(255) NULL,
  `filingText` VARCHAR(200) NULL,
  `filingUrl` VARCHAR(500) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  CONSTRAINT `SystemSetting_singleton_check` CHECK (`id` = 1),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `SystemSetting` (
  `id`,
  `createdAt`,
  `updatedAt`
) VALUES (
  1,
  CURRENT_TIMESTAMP(3),
  CURRENT_TIMESTAMP(3)
);

UPDATE `Menu` SET `path` = '/users' WHERE `path` = '/admin/users';
UPDATE `Menu` SET `path` = '/roles' WHERE `path` = '/admin/roles';
UPDATE `Menu` SET `path` = '/menus' WHERE `path` = '/admin/menus';
UPDATE `Menu` SET `path` = '/role-menus' WHERE `path` = '/admin/role-menus';
UPDATE `Menu` SET `path` = '/departments' WHERE `path` = '/admin/departments';
UPDATE `Menu` SET `path` = '/audit-logs' WHERE `path` = '/admin/audit-logs';
