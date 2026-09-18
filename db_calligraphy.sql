-- Script de actualización para el módulo de caligrafía
CREATE TABLE IF NOT EXISTS `calligraphy_sessions` (
  `id` varchar(64) NOT NULL,
  `userId` varchar(64) NOT NULL,
  `childId` varchar(64) NOT NULL,
  `imageUrl` LONGTEXT NOT NULL, -- Almacenamos la imagen en base64 para este prototipo
  `score` int(11) NOT NULL,
  `analysis_json` JSON NOT NULL, -- Contiene legibilidad, trazo, espaciado, errores y rasgos psicológicos
  `timestamp` BIGINT NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
