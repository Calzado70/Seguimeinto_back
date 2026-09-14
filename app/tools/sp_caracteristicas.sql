-- Tabla de características para productos Terminada
CREATE TABLE IF NOT EXISTS `caracteristicas` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `valor` VARCHAR(10) NOT NULL UNIQUE,
    `estado` ENUM('ACTIVA', 'INACTIVA') DEFAULT 'ACTIVA',
    `fecha_creacion` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insertar las características existentes
INSERT INTO `caracteristicas` (`valor`, `estado`) VALUES
('30P', 'ACTIVA'), ('31P', 'ACTIVA'), ('40P', 'ACTIVA'), ('41P', 'ACTIVA'),
('42P', 'ACTIVA'), ('43P', 'ACTIVA'), ('44P', 'ACTIVA'), ('45P', 'ACTIVA'),
('46P', 'ACTIVA'), ('47P', 'ACTIVA'), ('48P', 'ACTIVA'), ('49P', 'ACTIVA'),
('50P', 'ACTIVA'), ('51P', 'ACTIVA'), ('52P', 'ACTIVA'), ('53P', 'ACTIVA'),
('54P', 'ACTIVA'), ('55P', 'ACTIVA'), ('56P', 'ACTIVA'), ('57P', 'ACTIVA'),
('58P', 'ACTIVA'), ('59P', 'ACTIVA'), ('60P', 'ACTIVA'), ('61P', 'ACTIVA'),
('62P', 'ACTIVA'), ('65P', 'ACTIVA'), ('67P', 'ACTIVA'), ('68P', 'ACTIVA'),
('69P', 'ACTIVA'), ('70P', 'ACTIVA'), ('71P', 'ACTIVA'), ('72P', 'ACTIVA'),
('73P', 'ACTIVA'), ('74P', 'ACTIVA'), ('75P', 'ACTIVA'), ('76P', 'ACTIVA'),
('77P', 'ACTIVA'), ('78P', 'ACTIVA'), ('79P', 'ACTIVA'), ('80P', 'ACTIVA'),
('81P', 'ACTIVA'), ('82P', 'ACTIVA'), ('83P', 'ACTIVA'), ('84P', 'ACTIVA'),
('85P', 'ACTIVA'), ('86P', 'ACTIVA'), ('87P', 'ACTIVA'), ('88P', 'ACTIVA'),
('89P', 'ACTIVA'), ('90P', 'ACTIVA'), ('91P', 'ACTIVA'), ('92P', 'ACTIVA'),
('93P', 'ACTIVA'), ('94P', 'ACTIVA'), ('96P', 'ACTIVA'),
('110P', 'ACTIVA'), ('120P', 'ACTIVA'), ('130P', 'ACTIVA'),
('201P', 'ACTIVA'), ('215P', 'ACTIVA'), ('220P', 'ACTIVA'),
('225P', 'ACTIVA'), ('230P', 'ACTIVA')
ON DUPLICATE KEY UPDATE `estado` = 'ACTIVA';
