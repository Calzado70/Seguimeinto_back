-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 01-04-2026 a las 22:44:49
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
-- Base de datos: `betrost`
--
CREATE DATABASE IF NOT EXISTS `betrost` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `betrost`;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bodegas`
--

DROP TABLE IF EXISTS `bodegas`;
CREATE TABLE `bodegas` (
  `id_bodega` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `capacidad` int(11) DEFAULT NULL,
  `estado` enum('ACTIVA','INACTIVA') DEFAULT 'ACTIVA',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalles_escaneo`
--

DROP TABLE IF EXISTS `detalles_escaneo`;
CREATE TABLE `detalles_escaneo` (
  `id_detalle` int(11) NOT NULL,
  `id_sesion` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `cantidad_escaneada` int(11) NOT NULL,
  `fecha_escaneo` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `historial`
--

DROP TABLE IF EXISTS `historial`;
CREATE TABLE `historial` (
  `id_historial` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_bodega` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `accion` varchar(100) NOT NULL,
  `cantidad_anterior` int(11) DEFAULT NULL,
  `cantidad_nueva` int(11) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  `detalles` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`detalles`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inventario`
--

DROP TABLE IF EXISTS `inventario`;
CREATE TABLE `inventario` (
  `id_inventario` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_bodega` int(11) NOT NULL,
  `cantidad_disponible` int(11) DEFAULT 0,
  `cantidad_reservada` int(11) DEFAULT 0,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Disparadores `inventario`
--
DROP TRIGGER IF EXISTS `tr_inventario_historial`;
DELIMITER $$
CREATE TRIGGER `tr_inventario_historial` AFTER UPDATE ON `inventario` FOR EACH ROW BEGIN
    DECLARE v_id_usuario INT;

    -- Buscar el último usuario responsable del movimiento del producto y bodega
    SELECT id_usuario_responsable
    INTO v_id_usuario
    FROM movimientos
    WHERE id_producto = NEW.id_producto
      AND (id_bodega_origen = NEW.id_bodega OR id_bodega_destino = NEW.id_bodega)
    ORDER BY fecha_movimiento DESC
    LIMIT 1;

    -- Insertar en historial con el usuario correcto
    INSERT INTO historial (
        id_producto,
        id_bodega,
        id_usuario,
        accion,
        cantidad_anterior,
        cantidad_nueva,
        detalles
    )
    VALUES (
        NEW.id_producto,
        NEW.id_bodega,
        v_id_usuario,
        'ACTUALIZACION_INVENTARIO',
        OLD.cantidad_disponible,
        NEW.cantidad_disponible,
        JSON_OBJECT('motivo', 'Actualización automática de inventario')
    );
END
$$
DELIMITER ;
DROP TRIGGER IF EXISTS `tr_inventario_historial_insert`;
DELIMITER $$
CREATE TRIGGER `tr_inventario_historial_insert` AFTER INSERT ON `inventario` FOR EACH ROW BEGIN
    DECLARE v_id_usuario INT;

    SELECT id_usuario_responsable
    INTO v_id_usuario
    FROM movimientos
    WHERE id_producto = NEW.id_producto
    ORDER BY fecha_movimiento DESC
    LIMIT 1;

    INSERT INTO historial (
        id_producto,
        id_bodega,
        id_usuario,
        accion,
        cantidad_anterior,
        cantidad_nueva,
        detalles
    )
    VALUES (
        NEW.id_producto,
        NEW.id_bodega,
        v_id_usuario,
        'CREACION_INVENTARIO',
        0,
        NEW.cantidad_disponible,
        JSON_OBJECT('motivo', 'Registro inicial de inventario')
    );
END
$$
DELIMITER ;

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
  `id_usuario_responsable` int(11) NOT NULL,
  `fecha_movimiento` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo_movimiento` enum('ENTRADA','PROCESO','COMPLETO') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `estado_movimiento` enum('PENDIENTE','COMPLETADO','CANCELADO') DEFAULT 'COMPLETADO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permisos_bodegas`
--

DROP TABLE IF EXISTS `permisos_bodegas`;
CREATE TABLE `permisos_bodegas` (
  `id_permiso` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_bodega` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

DROP TABLE IF EXISTS `productos`;
CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `caracteristica` varchar(200) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sesiones_escaneo`
--

DROP TABLE IF EXISTS `sesiones_escaneo`;
CREATE TABLE `sesiones_escaneo` (
  `id_sesion` int(11) NOT NULL,
  `id_bodega` int(11) NOT NULL,
  `id_usuario` int(11) NOT NULL,
  `fecha_inicio` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_fin` timestamp NULL DEFAULT NULL,
  `estado` enum('ACTIVA','FINALIZADA','CANCELADA') DEFAULT 'ACTIVA',
  `total_productos` int(11) DEFAULT 0,
  `observaciones` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `id_bodega` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `contrasena` varchar(255) NOT NULL,
  `rol` enum('ADMINISTRADOR','OPERARIO','SUPERVISOR','LOGISTICA') DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_inventario_con_observacion`
-- (Véase abajo para la vista actual)
--
DROP VIEW IF EXISTS `vista_inventario_con_observacion`;
CREATE TABLE `vista_inventario_con_observacion` (
`id_inventario` int(11)
,`id_producto` int(11)
,`id_bodega` int(11)
,`cantidad_disponible` int(11)
,`cantidad_reservada` int(11)
,`fecha_actualizacion` timestamp
,`ultima_observacion` mediumtext
);

-- --------------------------------------------------------

--
-- Estructura para la vista `vista_inventario_con_observacion`
--
DROP TABLE IF EXISTS `vista_inventario_con_observacion`;

DROP VIEW IF EXISTS `vista_inventario_con_observacion`;
CREATE ALGORITHM=UNDEFINED DEFINER=`root`@`localhost` SQL SECURITY DEFINER VIEW `vista_inventario_con_observacion`  AS SELECT `i`.`id_inventario` AS `id_inventario`, `i`.`id_producto` AS `id_producto`, `i`.`id_bodega` AS `id_bodega`, `i`.`cantidad_disponible` AS `cantidad_disponible`, `i`.`cantidad_reservada` AS `cantidad_reservada`, `i`.`fecha_actualizacion` AS `fecha_actualizacion`, (select `m`.`observaciones` from `movimientos` `m` where `m`.`id_producto` = `i`.`id_producto` and (`m`.`id_bodega_origen` = `i`.`id_bodega` or `m`.`id_bodega_destino` = `i`.`id_bodega`) order by `m`.`fecha_movimiento` desc limit 1) AS `ultima_observacion` FROM `inventario` AS `i` ;

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `bodegas`
--
ALTER TABLE `bodegas`
  ADD PRIMARY KEY (`id_bodega`);

--
-- Indices de la tabla `detalles_escaneo`
--
ALTER TABLE `detalles_escaneo`
  ADD PRIMARY KEY (`id_detalle`),
  ADD KEY `id_sesion` (`id_sesion`),
  ADD KEY `id_producto` (`id_producto`);

--
-- Indices de la tabla `historial`
--
ALTER TABLE `historial`
  ADD PRIMARY KEY (`id_historial`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `id_bodega` (`id_bodega`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `idx_historial_fecha` (`fecha`);

--
-- Indices de la tabla `inventario`
--
ALTER TABLE `inventario`
  ADD PRIMARY KEY (`id_inventario`),
  ADD UNIQUE KEY `unique_producto_bodega` (`id_producto`,`id_bodega`),
  ADD KEY `idx_inventario_bodega` (`id_bodega`);

--
-- Indices de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD PRIMARY KEY (`id_movimiento`),
  ADD KEY `id_producto` (`id_producto`),
  ADD KEY `id_bodega_origen` (`id_bodega_origen`),
  ADD KEY `id_bodega_destino` (`id_bodega_destino`),
  ADD KEY `id_usuario_responsable` (`id_usuario_responsable`),
  ADD KEY `idx_movimientos_fecha` (`fecha_movimiento`),
  ADD KEY `idx_movimientos_tipo` (`tipo_movimiento`);

--
-- Indices de la tabla `permisos_bodegas`
--
ALTER TABLE `permisos_bodegas`
  ADD PRIMARY KEY (`id_permiso`),
  ADD UNIQUE KEY `id_usuario_2` (`id_usuario`,`id_bodega`),
  ADD KEY `id_usuario` (`id_usuario`),
  ADD KEY `id_bodega` (`id_bodega`);

--
-- Indices de la tabla `productos`
--
ALTER TABLE `productos`
  ADD PRIMARY KEY (`id_producto`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `sesiones_escaneo`
--
ALTER TABLE `sesiones_escaneo`
  ADD PRIMARY KEY (`id_sesion`),
  ADD KEY `id_bodega` (`id_bodega`),
  ADD KEY `id_usuario` (`id_usuario`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id_usuario`),
  ADD UNIQUE KEY `email` (`correo`),
  ADD KEY `id_bodega` (`id_bodega`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `bodegas`
--
ALTER TABLE `bodegas`
  MODIFY `id_bodega` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `detalles_escaneo`
--
ALTER TABLE `detalles_escaneo`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `historial`
--
ALTER TABLE `historial`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `inventario`
--
ALTER TABLE `inventario`
  MODIFY `id_inventario` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  MODIFY `id_movimiento` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `permisos_bodegas`
--
ALTER TABLE `permisos_bodegas`
  MODIFY `id_permiso` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `sesiones_escaneo`
--
ALTER TABLE `sesiones_escaneo`
  MODIFY `id_sesion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `detalles_escaneo`
--
ALTER TABLE `detalles_escaneo`
  ADD CONSTRAINT `detalles_escaneo_ibfk_1` FOREIGN KEY (`id_sesion`) REFERENCES `sesiones_escaneo` (`id_sesion`),
  ADD CONSTRAINT `detalles_escaneo_ibfk_2` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`);

--
-- Filtros para la tabla `historial`
--
ALTER TABLE `historial`
  ADD CONSTRAINT `historial_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `historial_ibfk_2` FOREIGN KEY (`id_bodega`) REFERENCES `bodegas` (`id_bodega`),
  ADD CONSTRAINT `historial_ibfk_3` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `inventario`
--
ALTER TABLE `inventario`
  ADD CONSTRAINT `inventario_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `inventario_ibfk_2` FOREIGN KEY (`id_bodega`) REFERENCES `bodegas` (`id_bodega`);

--
-- Filtros para la tabla `movimientos`
--
ALTER TABLE `movimientos`
  ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `movimientos_ibfk_2` FOREIGN KEY (`id_bodega_origen`) REFERENCES `bodegas` (`id_bodega`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `movimientos_ibfk_3` FOREIGN KEY (`id_bodega_destino`) REFERENCES `bodegas` (`id_bodega`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `movimientos_ibfk_4` FOREIGN KEY (`id_usuario_responsable`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Filtros para la tabla `permisos_bodegas`
--
ALTER TABLE `permisos_bodegas`
  ADD CONSTRAINT `permisos_ibfk_1` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `permisos_ibfk_2` FOREIGN KEY (`id_bodega`) REFERENCES `bodegas` (`id_bodega`);

--
-- Filtros para la tabla `sesiones_escaneo`
--
ALTER TABLE `sesiones_escaneo`
  ADD CONSTRAINT `sesiones_escaneo_ibfk_1` FOREIGN KEY (`id_bodega`) REFERENCES `bodegas` (`id_bodega`),
  ADD CONSTRAINT `sesiones_escaneo_ibfk_2` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`id_bodega`) REFERENCES `bodegas` (`id_bodega`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
