-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 13-06-2025 a las 20:38:54
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
    VALUES (_nombre, _contraseña, _descripcion, _bodega, _rol, 2, NOW());
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
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_MOSTRAR_HISTORIAL` (IN `_id_bodega` INT, IN `_fecha_inicio` DATE, IN `_fecha_fin` DATE)   BEGIN
    SELECT 
        u.nombre AS Nombre,
        p.codigo AS SKU,
        b_origen.nombre AS Bodega,
        b_destino.nombre AS Bodega_entregada,
        p.cantidad AS Cantidad,
        m.tipo_movimiento AS Tipo,
        h.fecha
    FROM 
        historial h
    JOIN 
        usuarios u ON h.usuario = u.id_usuario
    JOIN 
        productos p ON h.id_producto = p.id_producto
    JOIN 
        bodegas b_origen ON p.id_bodega = b_origen.id_bodega
    JOIN 
        movimientos m ON h.id_producto = m.id_producto
    JOIN 
        bodegas b_destino ON m.id_bodega_destino = b_destino.id_bodega
    WHERE 
        (_id_bodega IS NULL OR p.id_bodega = _id_bodega)
        AND (_fecha_inicio IS NULL OR DATE(h.fecha) >= _fecha_inicio)
        AND (_fecha_fin IS NULL OR DATE(h.fecha) <= _fecha_fin);
END$$

DROP PROCEDURE IF EXISTS `SP_MOSTRAR_MOVIMIENTOS`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_MOSTRAR_MOVIMIENTOS` (IN `_fecha_inicio` DATETIME, IN `_fecha_fin` DATETIME)   BEGIN
    SELECT 
        m.id_movimiento,
        p.codigo AS producto_codigo,
        bo.nombre AS bodega_origen,
        bd.nombre AS bodega_destino,
        u.nombre AS usuario_responsable,
        m.fecha_movimiento,
        m.tipo_movimiento,
        m.observaciones,
        p.cantidad AS cantidad
    FROM 
        movimientos m
    JOIN 
        productos p ON m.id_producto = p.id_producto
    LEFT JOIN 
        bodegas bo ON m.id_bodega_origen = bo.id_bodega
    JOIN 
        bodegas bd ON m.id_bodega_destino = bd.id_bodega
    JOIN 
        usuarios u ON m.usuario_responsable = u.id_usuario
    WHERE 
        m.fecha_movimiento BETWEEN COALESCE(_fecha_inicio, '1970-01-01 00:00:00') AND COALESCE(_fecha_fin, NOW())
        AND m.tipo_movimiento IS NOT NULL AND LOWER(m.tipo_movimiento) != 'enviado'
    ORDER BY 
        m.fecha_movimiento DESC;
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

DROP PROCEDURE IF EXISTS `SP_REGISTRAR_MOVIMIENTO`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `SP_REGISTRAR_MOVIMIENTO` (IN `_id_producto` INT(11), IN `_id_bodega_origen` INT(11), IN `_id_bodega_destino` INT(11), IN `_usuario_responsable` INT(11), IN `_tipo_movimiento` VARCHAR(50), IN `_observaciones` TEXT)   BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    -- Verificar que el producto existe y pertenece a la bodega de origen
    IF NOT EXISTS (SELECT 1 FROM productos WHERE id_producto = _id_producto AND id_bodega = _id_bodega_origen) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El producto no existe o no pertenece a la bodega de origen';
    END IF;

    -- Verificar que las bodegas existen
    IF NOT EXISTS (SELECT 1 FROM bodegas WHERE id_bodega = _id_bodega_origen) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bodega de origen no existe';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM bodegas WHERE id_bodega = _id_bodega_destino) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La bodega de destino no existe';
    END IF;

    -- Verificar que el usuario existe
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = _usuario_responsable) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El usuario responsable no existe';
    END IF;

    -- Insertar registro en la tabla movimientos
    INSERT INTO movimientos (
        id_producto,
        id_bodega_origen,
        id_bodega_destino,
        usuario_responsable,
        tipo_movimiento,
        observaciones,
        fecha_movimiento
    )
    VALUES (
        _id_producto,
        _id_bodega_origen,
        _id_bodega_destino,
        _usuario_responsable,
        _tipo_movimiento,
        _observaciones,
        NOW()
    );

    -- Actualizar la bodega del producto
    UPDATE productos 
    SET id_bodega = _id_bodega_destino 
    WHERE id_producto = _id_producto;

    -- Registrar en historial
    INSERT INTO historial (id_producto, usuario, fecha)
    VALUES (_id_producto, _usuario_responsable, NOW());

    COMMIT;
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
(6, 'Vulcanizado', 100),
(8, 'Logistica', 100);

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

--
-- Volcado de datos para la tabla `historial`
--

INSERT INTO `historial` (`id_historial`, `id_producto`, `usuario`, `fecha`) VALUES
(17, 51, 3, '2025-04-02 14:57:01'),
(18, 51, 2, '2025-04-03 15:32:05'),
(19, 51, 2, '2025-04-03 15:32:05'),
(20, 51, 2, '2025-05-26 06:52:07'),
(21, 51, 2, '2025-05-26 06:52:07'),
(22, 51, 3, '2025-05-30 11:22:48'),
(23, 51, 3, '2025-05-30 11:22:48'),
(24, 52, 3, '2025-05-30 11:22:48'),
(25, 52, 3, '2025-05-30 11:22:48'),
(26, 53, 3, '2025-05-30 11:22:48'),
(27, 53, 3, '2025-05-30 11:22:48'),
(34, 51, 3, '2025-06-05 15:02:01'),
(35, 51, 3, '2025-06-05 15:02:01'),
(36, 52, 3, '2025-06-05 15:02:01'),
(37, 52, 3, '2025-06-05 15:02:01'),
(38, 53, 3, '2025-06-05 15:02:01'),
(39, 53, 3, '2025-06-05 15:02:01'),
(40, 57, 3, '2025-06-06 09:58:55'),
(41, 57, 3, '2025-06-06 09:58:55'),
(42, 58, 3, '2025-06-06 09:58:55'),
(43, 58, 3, '2025-06-06 09:58:55'),
(46, 61, 3, '2025-06-06 09:58:55'),
(47, 61, 3, '2025-06-06 09:58:55'),
(48, 62, 3, '2025-06-06 09:58:55'),
(49, 62, 3, '2025-06-06 09:58:55'),
(50, 63, 3, '2025-06-06 09:58:55'),
(51, 63, 3, '2025-06-06 09:58:55'),
(52, 64, 3, '2025-06-06 09:58:55'),
(53, 64, 3, '2025-06-06 09:58:55'),
(54, 65, 3, '2025-06-06 09:58:55'),
(55, 65, 3, '2025-06-06 09:58:55'),
(56, 66, 3, '2025-06-06 09:58:55'),
(57, 66, 3, '2025-06-06 09:58:55'),
(58, 67, 3, '2025-06-06 09:58:55'),
(59, 67, 3, '2025-06-06 09:58:55'),
(60, 69, 3, '2025-06-06 13:03:26'),
(61, 69, 3, '2025-06-06 13:03:26'),
(62, 70, 3, '2025-06-06 13:03:26'),
(63, 70, 3, '2025-06-06 13:03:26'),
(64, 71, 3, '2025-06-06 13:03:26'),
(65, 71, 3, '2025-06-06 13:03:26'),
(66, 72, 3, '2025-06-06 13:03:26'),
(67, 72, 3, '2025-06-06 13:03:26'),
(68, 73, 3, '2025-06-06 13:03:26'),
(69, 73, 3, '2025-06-06 13:03:26'),
(70, 69, 8, '2025-06-06 14:55:15'),
(71, 69, 8, '2025-06-06 14:55:15'),
(72, 70, 8, '2025-06-06 14:55:15'),
(73, 70, 8, '2025-06-06 14:55:15'),
(74, 71, 8, '2025-06-06 14:55:15'),
(75, 71, 8, '2025-06-06 14:55:15'),
(76, 72, 8, '2025-06-06 14:55:15'),
(77, 72, 8, '2025-06-06 14:55:15'),
(78, 73, 8, '2025-06-06 14:55:15'),
(79, 73, 8, '2025-06-06 14:55:15'),
(80, 74, 3, '2025-06-09 10:19:47'),
(81, 74, 3, '2025-06-09 10:19:47'),
(82, 75, 3, '2025-06-09 10:19:47'),
(83, 75, 3, '2025-06-09 10:19:47'),
(84, 76, 3, '2025-06-09 10:19:47'),
(85, 76, 3, '2025-06-09 10:19:47'),
(86, 77, 3, '2025-06-09 10:19:47'),
(87, 77, 3, '2025-06-09 10:19:47'),
(88, 78, 3, '2025-06-09 10:19:47'),
(89, 78, 3, '2025-06-09 10:19:47'),
(90, 51, 19, '2025-06-09 15:11:37'),
(91, 51, 19, '2025-06-09 15:11:37'),
(92, 52, 19, '2025-06-09 15:11:37'),
(93, 52, 19, '2025-06-09 15:11:37'),
(94, 53, 19, '2025-06-09 15:11:37'),
(95, 53, 19, '2025-06-09 15:11:37'),
(96, 69, 19, '2025-06-09 15:11:37'),
(97, 69, 19, '2025-06-09 15:11:37'),
(98, 70, 19, '2025-06-09 15:11:37'),
(99, 70, 19, '2025-06-09 15:11:37'),
(100, 71, 19, '2025-06-09 15:11:37'),
(101, 71, 19, '2025-06-09 15:11:37'),
(102, 72, 19, '2025-06-09 15:11:37'),
(103, 72, 19, '2025-06-09 15:11:37'),
(104, 73, 19, '2025-06-09 15:11:37'),
(105, 73, 19, '2025-06-09 15:11:37'),
(106, 51, 3, '2025-06-09 15:12:45'),
(107, 51, 3, '2025-06-09 15:12:45'),
(108, 52, 3, '2025-06-09 15:12:45'),
(109, 52, 3, '2025-06-09 15:12:45'),
(110, 53, 3, '2025-06-09 15:12:45'),
(111, 53, 3, '2025-06-09 15:12:45'),
(112, 69, 3, '2025-06-09 15:12:45'),
(113, 69, 3, '2025-06-09 15:12:45'),
(114, 70, 3, '2025-06-09 15:12:45'),
(115, 70, 3, '2025-06-09 15:12:45'),
(116, 71, 3, '2025-06-09 15:12:45'),
(117, 71, 3, '2025-06-09 15:12:45'),
(118, 72, 3, '2025-06-09 15:12:45'),
(119, 72, 3, '2025-06-09 15:12:45'),
(120, 73, 3, '2025-06-09 15:14:19'),
(121, 73, 3, '2025-06-09 15:14:19'),
(122, 51, 19, '2025-06-09 15:19:46'),
(123, 51, 19, '2025-06-09 15:19:46'),
(124, 52, 19, '2025-06-09 15:19:46'),
(125, 52, 19, '2025-06-09 15:19:46'),
(126, 53, 19, '2025-06-09 15:19:46'),
(127, 53, 19, '2025-06-09 15:19:46'),
(128, 69, 19, '2025-06-09 15:19:46'),
(129, 69, 19, '2025-06-09 15:19:46'),
(130, 70, 19, '2025-06-09 15:19:46'),
(131, 70, 19, '2025-06-09 15:19:46'),
(132, 71, 19, '2025-06-09 15:19:46'),
(133, 71, 19, '2025-06-09 15:19:46'),
(134, 72, 19, '2025-06-09 15:19:46'),
(135, 72, 19, '2025-06-09 15:19:46'),
(136, 51, 3, '2025-06-09 15:20:15'),
(137, 51, 3, '2025-06-09 15:20:15'),
(138, 52, 3, '2025-06-09 15:20:15'),
(139, 52, 3, '2025-06-09 15:20:15'),
(140, 53, 3, '2025-06-09 15:20:15'),
(141, 53, 3, '2025-06-09 15:20:15'),
(142, 69, 3, '2025-06-09 15:20:15'),
(143, 69, 3, '2025-06-09 15:20:15'),
(144, 70, 3, '2025-06-09 15:20:15'),
(145, 70, 3, '2025-06-09 15:20:15'),
(146, 71, 3, '2025-06-09 15:20:15'),
(147, 71, 3, '2025-06-09 15:20:15'),
(148, 72, 3, '2025-06-09 15:20:15'),
(149, 72, 3, '2025-06-09 15:20:15'),
(150, 51, 19, '2025-06-09 15:37:29'),
(151, 51, 19, '2025-06-09 15:37:29'),
(152, 52, 19, '2025-06-09 15:37:29'),
(153, 52, 19, '2025-06-09 15:37:29'),
(154, 53, 19, '2025-06-09 15:37:29'),
(155, 53, 19, '2025-06-09 15:37:29'),
(156, 69, 19, '2025-06-09 15:37:29'),
(157, 69, 19, '2025-06-09 15:37:29'),
(158, 70, 19, '2025-06-09 15:37:29'),
(159, 70, 19, '2025-06-09 15:37:29'),
(160, 71, 19, '2025-06-09 15:37:29'),
(161, 71, 19, '2025-06-09 15:37:29'),
(162, 72, 19, '2025-06-09 15:37:29'),
(163, 72, 19, '2025-06-09 15:37:29'),
(164, 73, 19, '2025-06-09 15:37:29'),
(165, 73, 19, '2025-06-09 15:37:29');

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

--
-- Volcado de datos para la tabla `movimientos`
--

INSERT INTO `movimientos` (`id_movimiento`, `id_producto`, `id_bodega_origen`, `id_bodega_destino`, `usuario_responsable`, `codigo`, `fecha_movimiento`, `tipo_movimiento`, `observaciones`) VALUES
(17, 51, 1, 2, 2, '38PPCCV10018', '2025-04-03 15:32:05', 'Entransito', 'jajaaj'),
(18, 51, 2, 1, 2, '38PPCCV10018', '2025-05-26 06:52:07', 'En proceso', ''),
(19, 51, 1, 4, 3, '38PPCCV10018', '2025-05-30 11:22:48', 'Transferencia', 'test'),
(20, 52, 1, 4, 3, 'PPCMC1001840P', '2025-05-30 11:22:48', 'Transferencia', 'test'),
(21, 53, 1, 4, 3, '42PPCC1001840P', '2025-05-30 11:22:48', 'Transferencia', 'test'),
(25, 51, 1, 5, 3, '38PPCCV10018', '2025-06-05 15:02:01', 'Transferencia', 'se entrego el producto correctamente'),
(26, 52, 1, 5, 3, 'PPCMC1001840P', '2025-06-05 15:02:01', 'Transferencia', 'se entrego el producto correctamente'),
(27, 53, 1, 5, 3, '42PPCC1001840P', '2025-06-05 15:02:01', 'Transferencia', 'se entrego el producto correctamente'),
(28, 57, 1, 4, 3, '861232062963472', '2025-06-06 09:58:55', 'En proceso', 'Productos para la fase de montaje'),
(29, 58, 1, 4, 3, '423010001724', '2025-06-06 09:58:55', 'En proceso', 'Productos para la fase de montaje'),
(31, 61, 1, 4, 3, '1041148895', '2025-06-06 09:58:55', 'En proceso', 'Productos para la fase de montaje'),
(32, 62, 1, 4, 3, '1041351031', '2025-06-06 09:58:55', 'En proceso', 'Productos para la fase de montaje'),
(33, 63, 1, 4, 3, '1143238851', '2025-06-06 09:58:55', 'En proceso', 'Productos para la fase de montaje'),
(34, 64, 1, 4, 3, '1066752511', '2025-06-06 09:58:55', 'En proceso', 'Productos para la fase de montaje'),
(35, 65, 1, 4, 3, '1152459112', '2025-06-06 09:58:55', 'En proceso', 'Productos para la fase de montaje'),
(36, 66, 1, 4, 3, '1128264805', '2025-06-06 09:58:55', 'En proceso', 'Productos para la fase de montaje'),
(37, 67, 1, 4, 3, '1036608150', '2025-06-06 09:58:55', 'En proceso', 'Productos para la fase de montaje'),
(38, 69, 1, 3, 3, '2131313131', '2025-06-06 13:03:26', 'En proceso', 'se traslada productos de corte a preparada'),
(39, 70, 1, 3, 3, '113132133131', '2025-06-06 13:03:26', 'En proceso', 'se traslada productos de corte a preparada'),
(40, 71, 1, 3, 3, '126565161165165165', '2025-06-06 13:03:26', 'En proceso', 'se traslada productos de corte a preparada'),
(41, 72, 1, 3, 3, '16516516516516161', '2025-06-06 13:03:26', 'En proceso', 'se traslada productos de corte a preparada'),
(42, 73, 1, 3, 3, '1165165165060650', '2025-06-06 13:03:26', 'En proceso', 'se traslada productos de corte a preparada'),
(43, 69, 3, 5, 8, '2131313131', '2025-06-06 14:55:15', 'En proceso', 'se realiza el movimiento de los N productos a la bodega de terminada'),
(44, 70, 3, 5, 8, '113132133131', '2025-06-06 14:55:15', 'En proceso', 'se realiza el movimiento de los N productos a la bodega de terminada'),
(45, 71, 3, 5, 8, '126565161165165165', '2025-06-06 14:55:15', 'En proceso', 'se realiza el movimiento de los N productos a la bodega de terminada'),
(46, 72, 3, 5, 8, '16516516516516161', '2025-06-06 14:55:15', 'En proceso', 'se realiza el movimiento de los N productos a la bodega de terminada'),
(47, 73, 3, 5, 8, '1165165165060650', '2025-06-06 14:55:15', 'En proceso', 'se realiza el movimiento de los N productos a la bodega de terminada'),
(48, 74, 1, 4, 3, '1020110400238', '2025-06-09 10:19:47', 'En proceso', 'pasar a bodega de montaje'),
(49, 75, 1, 4, 3, '1020110400242', '2025-06-09 10:19:47', 'En proceso', 'pasar a bodega de montaje'),
(50, 76, 1, 4, 3, '1020102400240', '2025-06-09 10:19:47', 'En proceso', 'pasar a bodega de montaje'),
(51, 77, 1, 4, 3, '1020110400236', '2025-06-09 10:19:47', 'En proceso', 'pasar a bodega de montaje'),
(52, 78, 1, 4, 3, '1020100403034', '2025-06-09 10:19:47', 'En proceso', 'pasar a bodega de montaje'),
(53, 51, 5, 1, 19, NULL, '2025-06-09 15:11:37', 'En proceso', 'producto en devolucion  a corte'),
(54, 52, 5, 1, 19, NULL, '2025-06-09 15:11:37', 'En proceso', 'producto en devolucion  a corte'),
(55, 53, 5, 1, 19, NULL, '2025-06-09 15:11:37', 'En proceso', 'producto en devolucion  a corte'),
(56, 69, 5, 1, 19, NULL, '2025-06-09 15:11:37', 'En proceso', 'producto en devolucion  a corte'),
(57, 70, 5, 1, 19, NULL, '2025-06-09 15:11:37', 'En proceso', 'producto en devolucion  a corte'),
(58, 71, 5, 1, 19, NULL, '2025-06-09 15:11:37', 'En proceso', 'producto en devolucion  a corte'),
(59, 72, 5, 1, 19, NULL, '2025-06-09 15:11:37', 'En proceso', 'producto en devolucion  a corte'),
(60, 73, 5, 1, 19, NULL, '2025-06-09 15:11:37', 'En proceso', 'producto en devolucion  a corte'),
(61, 51, 1, 5, 3, NULL, '2025-06-09 15:12:45', 'Transferencia', 'se termino el prodcuto'),
(62, 52, 1, 5, 3, NULL, '2025-06-09 15:12:45', 'Transferencia', 'se termino el prodcuto'),
(63, 53, 1, 5, 3, NULL, '2025-06-09 15:12:45', 'Transferencia', 'se termino el prodcuto'),
(64, 69, 1, 5, 3, NULL, '2025-06-09 15:12:45', 'Transferencia', 'se termino el prodcuto'),
(65, 70, 1, 5, 3, NULL, '2025-06-09 15:12:45', 'Transferencia', 'se termino el prodcuto'),
(66, 71, 1, 5, 3, NULL, '2025-06-09 15:12:45', 'Transferencia', 'se termino el prodcuto'),
(67, 72, 1, 5, 3, NULL, '2025-06-09 15:12:45', 'Transferencia', 'se termino el prodcuto'),
(68, 73, 1, 5, 3, NULL, '2025-06-09 15:14:19', 'Transferencia', 'se termino'),
(69, 51, 5, 1, 19, NULL, '2025-06-09 15:19:46', 'En proceso', 'se devuelve por calidad'),
(70, 52, 5, 1, 19, NULL, '2025-06-09 15:19:46', 'En proceso', 'se devuelve por calidad'),
(71, 53, 5, 1, 19, NULL, '2025-06-09 15:19:46', 'En proceso', 'se devuelve por calidad'),
(72, 69, 5, 1, 19, NULL, '2025-06-09 15:19:46', 'En proceso', 'se devuelve por calidad'),
(73, 70, 5, 1, 19, NULL, '2025-06-09 15:19:46', 'En proceso', 'se devuelve por calidad'),
(74, 71, 5, 1, 19, NULL, '2025-06-09 15:19:46', 'En proceso', 'se devuelve por calidad'),
(75, 72, 5, 1, 19, NULL, '2025-06-09 15:19:46', 'En proceso', 'se devuelve por calidad'),
(76, 51, 1, 5, 3, NULL, '2025-06-09 15:20:15', 'Terminado', 'se vuelve a amndar a termianda ya quedo solucionado el problema de calidadç'),
(77, 52, 1, 5, 3, NULL, '2025-06-09 15:20:15', 'Terminado', 'se vuelve a amndar a termianda ya quedo solucionado el problema de calidadç'),
(78, 53, 1, 5, 3, NULL, '2025-06-09 15:20:15', 'Terminado', 'se vuelve a amndar a termianda ya quedo solucionado el problema de calidadç'),
(79, 69, 1, 5, 3, NULL, '2025-06-09 15:20:15', 'Terminado', 'se vuelve a amndar a termianda ya quedo solucionado el problema de calidadç'),
(80, 70, 1, 5, 3, NULL, '2025-06-09 15:20:15', 'Terminado', 'se vuelve a amndar a termianda ya quedo solucionado el problema de calidadç'),
(81, 71, 1, 5, 3, NULL, '2025-06-09 15:20:15', 'Terminado', 'se vuelve a amndar a termianda ya quedo solucionado el problema de calidadç'),
(82, 72, 1, 5, 3, NULL, '2025-06-09 15:20:15', 'Terminado', 'se vuelve a amndar a termianda ya quedo solucionado el problema de calidadç'),
(83, 51, 5, 8, 19, NULL, '2025-06-09 15:37:29', 'Enviado', 'se realiza la entrega de los productos ya terminados y empacados'),
(84, 52, 5, 8, 19, NULL, '2025-06-09 15:37:29', 'Enviado', 'se realiza la entrega de los productos ya terminados y empacados'),
(85, 53, 5, 8, 19, NULL, '2025-06-09 15:37:29', 'Enviado', 'se realiza la entrega de los productos ya terminados y empacados'),
(86, 69, 5, 8, 19, NULL, '2025-06-09 15:37:29', 'Enviado', 'se realiza la entrega de los productos ya terminados y empacados'),
(87, 70, 5, 8, 19, NULL, '2025-06-09 15:37:29', 'Enviado', 'se realiza la entrega de los productos ya terminados y empacados'),
(88, 71, 5, 8, 19, NULL, '2025-06-09 15:37:29', 'Enviado', 'se realiza la entrega de los productos ya terminados y empacados'),
(89, 72, 5, 8, 19, NULL, '2025-06-09 15:37:29', 'Enviado', 'se realiza la entrega de los productos ya terminados y empacados'),
(90, 73, 5, 8, 19, NULL, '2025-06-09 15:37:29', 'Enviado', 'se realiza la entrega de los productos ya terminados y empacados');

--
-- Disparadores `movimientos`
--
DROP TRIGGER IF EXISTS `TRG_AFTER_MOVIMIENTO_INSERT`;
DELIMITER $$
CREATE TRIGGER `TRG_AFTER_MOVIMIENTO_INSERT` AFTER INSERT ON `movimientos` FOR EACH ROW BEGIN
    -- Registrar en el historial automáticamente
    INSERT INTO historial (id_producto, usuario)
    VALUES (NEW.id_producto, NEW.usuario_responsable);
END
$$
DELIMITER ;

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
(51, 8, 2, '38PPCCV10018', 'En proceso', 1, '2025-04-02 06:31:12'),
(52, 8, 2, 'PPCMC1001840P', 'En proceso', 1, '2025-05-05 14:48:31'),
(53, 8, 2, '42PPCC1001840P', 'En proceso', 10, '2025-05-05 14:48:31'),
(57, 4, 2, '861232062963472', 'En proceso', 3, '2025-06-06 09:57:15'),
(58, 4, 2, '423010001724', 'En proceso', 3, '2025-06-06 09:57:15'),
(61, 4, 2, '1041148895', 'En proceso', 1, '2025-06-06 09:57:15'),
(62, 4, 2, '1041351031', 'En proceso', 3, '2025-06-06 09:57:15'),
(63, 4, 2, '1143238851', 'En proceso', 11, '2025-06-06 09:57:15'),
(64, 4, 2, '1066752511', 'En proceso', 4, '2025-06-06 09:57:15'),
(65, 4, 2, '1152459112', 'En proceso', 2, '2025-06-06 09:57:15'),
(66, 4, 2, '1128264805', 'En proceso', 15, '2025-06-06 09:57:15'),
(67, 4, 2, '1036608150', 'En proceso', 9, '2025-06-06 09:57:15'),
(69, 8, 2, '2131313131', 'En proceso', 1, '2025-06-06 12:57:35'),
(70, 8, 2, '113132133131', 'En proceso', 1, '2025-06-06 12:57:35'),
(71, 8, 2, '126565161165165165', 'En proceso', 1, '2025-06-06 13:01:51'),
(72, 8, 2, '16516516516516161', 'En proceso', 1, '2025-06-06 13:01:51'),
(73, 8, 2, '1165165165060650', 'En proceso', 1, '2025-06-06 13:01:51'),
(74, 4, 2, '1020110400238', 'En proceso', 5, '2025-06-09 10:18:45'),
(75, 4, 2, '1020110400242', 'En proceso', 2, '2025-06-09 10:18:45'),
(76, 4, 2, '1020102400240', 'En proceso', 2, '2025-06-09 10:18:45'),
(77, 4, 2, '1020110400236', 'En proceso', 2, '2025-06-09 10:18:45'),
(78, 4, 2, '1020100403034', 'En proceso', 1, '2025-06-09 10:18:45');

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
(1, 'carlos', '$2b$10$Zrp.oJfMSBN5F/FWHxh.GeSskeQdUcm4WbzGYpyL.CnpxsLatL7Qa', 'cccc', 'Inyeccion', 'ADMIN', 'ACTIVO', '2025-02-27 08:45:29'),
(2, 'camilo', '$2b$10$.V6OyCsaMlor/ADwKs7xbeb5LDSWiGCkEKCuhh12Gl.ZdtxsEYA.O', 'operario de corte', 'Corte', 'Operario', '1', '2025-03-17 11:27:08'),
(3, 'juan', '$2b$10$we8t24H9Lnl6Rb6W05Gl6Oc2tN37UvAq0Kll7AjQdyyB25KJKl38q', 'operario de corte', 'Corte', 'Supervisor', '1', '2025-03-17 11:54:48'),
(6, 'pepito', '$2b$10$x0LQT05ORU7H7IiXA551U.AcUvwStbAfMdSrmQhPf1vWkpPbdbmzm', 'operario de montaje', 'Montaje', 'Operario', '1', '2025-04-01 14:30:21'),
(8, 'gofy', '$2b$10$mgUTg1Kt8GrKHrElKyM5sOz2dzBN7ROhas49Sv6WVhrzcGCeeHDT.', 'supervisor de montaje', 'Montaje', 'Supervisor', '1', '2025-06-06 07:55:34'),
(18, 'elgar', '$2b$10$eWInpYCJYjZ6bFwDNPyYc.Bhb4a79KTcFPDEKhk8oyeX7v5yeo5F6', 'usuario que se comparte tanto el supervisor de Inyeccion y el operario de Inyeccion ', 'Inyeccion', 'Operario de Inyeccion', '2', '2025-06-06 13:32:30'),
(19, 'pepe', '$2b$10$fCzkpfRdfI7yWKAWuZ8xZeUDS3kWpxdGRWbs0ju.apQI7xdCtghUC', 'sfsf', 'Terminada', 'Supervisor', '2', '2025-06-06 14:57:34'),
(20, 'gian', '$2b$10$ybarYllVirI24oCu2YahXOdl1B2f9PojYzf.WU2fREqu9rBoZ/6AS', 'logistica', 'Logistica', 'Supervisor', '2', '2025-06-10 14:46:48');

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
  MODIFY `id_bodega` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `historial`
--
ALTER TABLE `historial`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=166;

--
-- AUTO_INCREMENT de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  MODIFY `id_movimiento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=91;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

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


--
-- Metadatos
--
USE `phpmyadmin`;

--
-- Metadatos para la tabla alertas
--

--
-- Metadatos para la tabla bodegas
--

--
-- Metadatos para la tabla historial
--

--
-- Metadatos para la tabla movimientos
--

--
-- Metadatos para la tabla productos
--

--
-- Volcado de datos para la tabla `pma__table_uiprefs`
--

INSERT INTO `pma__table_uiprefs` (`username`, `db_name`, `table_name`, `prefs`, `last_update`) VALUES
('root', 'trost', 'productos', '{\"sorted_col\":\"`idusuario` ASC\"}', '2025-06-10 19:29:25');

--
-- Metadatos para la tabla usuarios
--

--
-- Metadatos para la base de datos trost
--

--
-- Volcado de datos para la tabla `pma__pdf_pages`
--

INSERT INTO `pma__pdf_pages` (`db_name`, `page_descr`) VALUES
('trost', '1');

SET @LAST_PAGE = LAST_INSERT_ID();

--
-- Volcado de datos para la tabla `pma__table_coords`
--

INSERT INTO `pma__table_coords` (`db_name`, `table_name`, `pdf_page_number`, `x`, `y`) VALUES
('trost', 'alertas', @LAST_PAGE, 691, 218),
('trost', 'bodegas', @LAST_PAGE, 181, 526),
('trost', 'historial', @LAST_PAGE, 717, 0),
('trost', 'movimientos', @LAST_PAGE, 449, 438),
('trost', 'productos', @LAST_PAGE, 453, 173),
('trost', 'usuarios', @LAST_PAGE, 878, 589);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
