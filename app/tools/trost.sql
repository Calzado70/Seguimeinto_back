-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 02-04-2025 a las 14:28:14
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `trost`
--
CREATE DATABASE IF NOT EXISTS `trost` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `trost`;

DELIMITER $$
--
-- Procedimientos
--
DROP PROCEDURE IF EXISTS `SP_ELIMINAR_BODEGAS`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_ELIMINAR_BODEGAS` (IN `_id_bodega` INT(11))   BEGIN

DELETE FROM bodegas

WHERE id_bodega = _id_bodega;

END$$

DROP PROCEDURE IF EXISTS `SP_ELIMINAR_PRODUCTOS`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_ELIMINAR_PRODUCTOS` (IN `_id_producto` INT(11))   BEGIN

DELETE FROM productos 
WHERE id_producto = _id_producto;

END$$

DROP PROCEDURE IF EXISTS `SP_ELIMINAR_USUARIO`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_ELIMINAR_USUARIO` (IN `_idusuario` INT(11))   BEGIN

DELETE FROM usuarios
WHERE id_usuario = _idusuario;

END$$

DROP PROCEDURE IF EXISTS `SP_INSERTAR_BODEGAS`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_INSERTAR_BODEGAS` (IN `_nombre` VARCHAR(100), IN `_capacidad` INT(11))   BEGIN

INSERT INTO bodegas (nombre, capacidad)
VALUES (_nombre, _capacidad);

END$$

DROP PROCEDURE IF EXISTS `SP_INSERTAR_PRODUCTOS`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_INSERTAR_PRODUCTOS` (IN `_id_bodega` INT(11), IN `_idusuario` INT(11), IN `_codigo` VARCHAR(50), IN `_estado` VARCHAR(50), IN `_cantidad` INT(12))   BEGIN

INSERT INTO productos (id_bodega, idusuario, codigo, estado, cantidad)
VALUES (_id_bodega, _idusuario, _codigo, _estado, _cantidad);

END$$

DROP PROCEDURE IF EXISTS `SP_INSERTAR_USUARIO`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_INSERTAR_USUARIO` (IN `_nombre` VARCHAR(100), IN `_contrasena` VARCHAR(255), IN `_descripcion` VARCHAR(200), IN `_bodega` VARCHAR(100), IN `_rol` VARCHAR(50))   BEGIN
    INSERT INTO usuarios (nombre, contrasena, descripcion, bodega, rol, estado, fecha_creacion)
    VALUES (_nombre, _contraseña, _descripcion, _bodega, _rol, 1, NOW());
END$$

DROP PROCEDURE IF EXISTS `SP_LOGIN_USUARIO`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_LOGIN_USUARIO` (IN `_nombre` VARCHAR(100))   BEGIN

SELECT nombre, contrasena, id_usuario, rol, bodega FROM usuarios
WHERE nombre = _nombre
LIMIT 1;

END$$

DROP PROCEDURE IF EXISTS `SP_MODIFICAR_BODEGAS`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_MODIFICAR_BODEGAS` (IN `_id_bodega` INT(11), IN `_nombre` VARCHAR(100), IN `_capacidad` INT(11))   BEGIN

UPDATE bodegas

SET 
nombre = _nombre,
capacidad = _capacidad
WHERE id_bodega = _id_bodega;

END$$

DROP PROCEDURE IF EXISTS `SP_MODIFICAR_USUARIO`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_MODIFICAR_USUARIO` (IN `_nombre` VARCHAR(100), IN `_descripcion` VARCHAR(200), IN `_bodega` VARCHAR(100))   BEGIN
    UPDATE usuarios
    SET 
        descripcion = _descripcion,
        bodega = _bodega
    WHERE nombre = _nombre;
END$$

DROP PROCEDURE IF EXISTS `SP_MOSTRAR_BODEGAS`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_MOSTRAR_BODEGAS` ()   BEGIN

SELECT * FROM bodegas;

END$$

DROP PROCEDURE IF EXISTS `SP_MOSTRAR_HISTORIAL`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_MOSTRAR_HISTORIAL` ()   BEGIN
    SELECT 
        u.nombre AS Nombre,
        p.codigo AS SKU,
        b.nombre AS Bodega,
        h.fecha
    FROM 
        historial h
    JOIN 
        usuarios u ON h.usuario = u.id_usuario
    JOIN 
        productos p ON h.id_producto = p.id_producto
    JOIN 
        bodegas b ON p.id_bodega = b.id_bodega; 
END$$

DROP PROCEDURE IF EXISTS `SP_MOSTRAR_PRODUCTO`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_MOSTRAR_PRODUCTO` (IN `_id_bodega` INT)   BEGIN
    SELECT 
        u.nombre AS Nombre,
        b.nombre AS Bodega,
        P.codigo AS SKU,
        P.cantidad AS Cantidad,
        P.fecha_registro AS Fecha,
        P.id_producto AS ID
    FROM 
        productos P
    JOIN 
        usuarios u ON P.idusuario = u.id_usuario
    JOIN
        bodegas b ON P.id_bodega = b.id_bodega
    WHERE 
        P.id_bodega = _id_bodega; -- Filtra por bodega
END$$

DROP PROCEDURE IF EXISTS `SP_MOSTRAR_USUARIOS`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_MOSTRAR_USUARIOS` ()   BEGIN

SELECT * FROM usuarios;

END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `alertas`
--

DROP TABLE IF EXISTS `alertas`;
CREATE TABLE `alertas` (
  `id_alerta` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `usuario_asignado` int(11) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `tipo_alerta` varchar(100) NOT NULL,
  `fecha_alerta` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bodegas`
--

DROP TABLE IF EXISTS `bodegas`;
CREATE TABLE `bodegas` (
  `id_bodega` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `capacidad` int(11) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `bodegas`
--

INSERT INTO `bodegas` (`id_bodega`, `nombre`, `capacidad`) VALUES
(1, 'Corte', 100),
(2, 'Inyeccion', 100),
(3, 'Preparada', 100),
(4, 'Montaje', 100),
(5, 'Terminada', 100),
(6, 'Vulcanizado', 100);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial`
--

DROP TABLE IF EXISTS `historial`;
CREATE TABLE `historial` (
  `id_historial` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `usuario` int(11) NOT NULL,
  `fecha` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos`
--

DROP TABLE IF EXISTS `movimientos`;
CREATE TABLE `movimientos` (
  `id_movimiento` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_bodega_origen` int(11) DEFAULT NULL,
  `id_bodega_destino` int(11) DEFAULT NULL,
  `usuario_responsable` int(11) NOT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `fecha_movimiento` datetime DEFAULT current_timestamp(),
  `tipo_movimiento` varchar(50) NOT NULL,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

DROP TABLE IF EXISTS `productos`;
CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `id_bodega` int(11) DEFAULT NULL,
  `idusuario` int(11) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `estado` varchar(50) NOT NULL DEFAULT 'en bodega',
  `cantidad` int(12) NOT NULL,
  `fecha_registro` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `id_bodega`, `idusuario`, `codigo`, `estado`, `cantidad`, `fecha_registro`) VALUES
(35, 1, 2, 'PPCC1001840P42', 'En proceso', 6, '2025-03-31 09:26:58'),
(36, 1, 2, 'PPCC1001840P40', 'En proceso', 6, '2025-03-31 09:26:58'),
(37, 1, 2, 'PPCC1001840P35', 'En proceso', 6, '2025-03-31 09:26:58'),
(38, 1, 2, 'PPCC1001840P38', 'En proceso', 6, '2025-03-31 09:26:58'),
(39, 1, 2, 'PPCC1001840P32', 'En proceso', 6, '2025-03-31 09:26:58'),
(41, 1, 2, 'PPCC1001842', 'En proceso', 8, '2025-04-01 12:26:59'),
(42, 1, 2, 'PPCC1001841', 'En proceso', 8, '2025-04-01 12:26:59'),
(43, 1, 2, 'PPCC1001843', 'En proceso', 1, '2025-04-01 12:26:59'),
(44, 1, 2, 'PPCC1001839', 'En proceso', 1, '2025-04-01 12:26:59'),
(45, 1, 2, 'PPCC1001840', 'En proceso', 1, '2025-04-01 12:26:59'),
(46, 1, 2, 'PPCC1001835', 'En proceso', 1, '2025-04-01 12:26:59'),
(47, 1, 2, 'PPCC1001830', 'En proceso', 1, '2025-04-01 12:27:29'),
(48, 1, 2, 'PPCC1001832', 'En proceso', 1, '2025-04-01 12:27:29'),
(49, 1, 2, 'PPCC1001831', 'En proceso', 1, '2025-04-01 12:27:29'),
(50, 1, 2, 'PPCC1001841', 'En proceso', 1, '2025-04-01 12:35:29'),
(51, 1, 2, '38PPCCV10018', 'En proceso', 1, '2025-04-02 06:31:12');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `contrasena` varchar(255) NOT NULL,
  `descripcion` varchar(200) NOT NULL,
  `bodega` varchar(100) NOT NULL,
  `rol` varchar(50) NOT NULL DEFAULT '''usuario''',
  `estado` varchar(100) DEFAULT 'ACTIVO',
  `fecha_creacion` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `nombre`, `contrasena`, `descripcion`, `bodega`, `rol`, `estado`, `fecha_creacion`) VALUES
(1, 'carlos', '$2b$10$Zrp.oJfMSBN5F/FWHxh.GeSskeQdUcm4WbzGYpyL.CnpxsLatL7Qa', 'Desarrollador de la pagina', 'Desarrollo', 'ADMIN', 'ACTIVO', '2025-02-27 08:45:29'),
(2, 'camilo', '$2b$10$.V6OyCsaMlor/ADwKs7xbeb5LDSWiGCkEKCuhh12Gl.ZdtxsEYA.O', 'operario de corte', 'Corte', 'Operario', '1', '2025-03-17 11:27:08'),
(3, 'juan', '$2b$10$we8t24H9Lnl6Rb6W05Gl6Oc2tN37UvAq0Kll7AjQdyyB25KJKl38q', 'operario de corte', 'Corte', 'Supervisor', '1', '2025-03-17 11:54:48'),
(6, 'pepito', '$2b$10$x0LQT05ORU7H7IiXA551U.AcUvwStbAfMdSrmQhPf1vWkpPbdbmzm', 'operario de montaje', 'Montaje', 'Operario', '1', '2025-04-01 14:30:21');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `alertas`
--
ALTER TABLE `alertas`
  ADD PRIMARY KEY (`id_alerta`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `usuario_asignado` (`usuario_asignado`);

--
-- Indices de la tabla `bodegas`
--
ALTER TABLE `bodegas`
  ADD PRIMARY KEY (`id_bodega`);

--
-- Indices de la tabla `historial`
--
ALTER TABLE `historial`
  ADD PRIMARY KEY (`id_historial`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `usuario` (`usuario`);

--
-- Indices de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD PRIMARY KEY (`id_movimiento`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `id_bodega_origen` (`id_bodega_origen`),
  ADD KEY `id_bodega_destino` (`id_bodega_destino`),
  ADD KEY `idx_movimientos_fecha` (`fecha_movimiento`),
  ADD KEY `movimientos_ibfk_4` (`usuario_responsable`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD KEY `productos_ibfk_1` (`id_bodega`),
  ADD KEY `usuario_ibfk_2` (`idusuario`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `alertas`
--
ALTER TABLE `alertas`
  MODIFY `id_alerta` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `bodegas`
--
ALTER TABLE `bodegas`
  MODIFY `id_bodega` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `historial`
--
ALTER TABLE `historial`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  MODIFY `id_movimiento` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=52;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `alertas`
--
ALTER TABLE `alertas`
  ADD CONSTRAINT `alertas_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE,
  ADD CONSTRAINT `alertas_ibfk_2` FOREIGN KEY (`usuario_asignado`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL;

--
-- Filtros para la tabla `historial`
--
ALTER TABLE `historial`
  ADD CONSTRAINT `historial_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE,
  ADD CONSTRAINT `historial_ibfk_2` FOREIGN KEY (`usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE;

--
-- Filtros para la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE,
  ADD CONSTRAINT `movimientos_ibfk_2` FOREIGN KEY (`id_bodega_origen`) REFERENCES `bodegas` (`id_bodega`) ON DELETE SET NULL,
  ADD CONSTRAINT `movimientos_ibfk_3` FOREIGN KEY (`id_bodega_destino`) REFERENCES `bodegas` (`id_bodega`) ON DELETE SET NULL,
  ADD CONSTRAINT `movimientos_ibfk_4` FOREIGN KEY (`usuario_responsable`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `productos`
--
ALTER TABLE `productos`
  ADD CONSTRAINT `productos_ibfk_1` FOREIGN KEY (`id_bodega`) REFERENCES `bodegas` (`id_bodega`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `usuario_ibfk_2` FOREIGN KEY (`idusuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
