-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 27-06-2025 a las 22:13:13
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

DELIMITER $$
--
-- Procedimientos
--
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_agregar_producto_sesion` (IN `p_id_sesion` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_cantidad` INT, OUT `p_mensaje` VARCHAR(255))   BEGIN
    DECLARE v_id_producto INT DEFAULT 0;
    DECLARE v_estado_sesion VARCHAR(20);
    DECLARE v_cantidad_actual INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al agregar producto a la sesión';
    END;

    START TRANSACTION;
    
    -- Verificar que la sesión esté activa
    SELECT estado INTO v_estado_sesion
    FROM sesiones_escaneo 
    WHERE id_sesion = p_id_sesion;
    
    IF v_estado_sesion != 'ACTIVA' THEN
        SET p_mensaje = 'La sesión no está activa';
        ROLLBACK;
    ELSE
        -- Obtener ID del producto
        SELECT id_producto INTO v_id_producto
        FROM productos 
        WHERE codigo = p_codigo_producto AND estado = 'ACTIVO';
        
        IF v_id_producto = 0 THEN
            SET p_mensaje = 'Producto no encontrado o inactivo';
            ROLLBACK;
        ELSE
            -- Verificar si ya existe en la sesión
            SELECT IFNULL(cantidad_escaneada, 0) INTO v_cantidad_actual
            FROM detalles_escaneo 
            WHERE id_sesion = p_id_sesion AND id_producto = v_id_producto;
            
            IF v_cantidad_actual > 0 THEN
                -- Actualizar cantidad existente
                UPDATE detalles_escaneo 
                SET cantidad_escaneada = cantidad_escaneada + p_cantidad,
                    fecha_escaneo = CURRENT_TIMESTAMP
                WHERE id_sesion = p_id_sesion AND id_producto = v_id_producto;
            ELSE
                -- Insertar nuevo detalle
                INSERT INTO detalles_escaneo (id_sesion, id_producto, cantidad_escaneada)
                VALUES (p_id_sesion, v_id_producto, p_cantidad);
            END IF;
            
            SET p_mensaje = 'Producto agregado correctamente';
            COMMIT;
        END IF;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ajustar_inventario` (IN `p_id_bodega` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_nueva_cantidad` INT, IN `p_id_usuario` INT, IN `p_motivo` TEXT, OUT `p_mensaje` VARCHAR(255))   BEGIN
    DECLARE v_id_producto INT DEFAULT 0;
    DECLARE v_cantidad_anterior INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al ajustar inventario';
    END;

    START TRANSACTION;
    
    -- Obtener ID del producto
    SELECT id_producto INTO v_id_producto
    FROM productos 
    WHERE codigo = p_codigo_producto AND estado = 'ACTIVO';
    
    IF v_id_producto = 0 THEN
        SET p_mensaje = 'Producto no encontrado';
        ROLLBACK;
    ELSE
        -- Obtener cantidad anterior
        SELECT IFNULL(cantidad_disponible, 0) INTO v_cantidad_anterior
        FROM inventario 
        WHERE id_producto = v_id_producto AND id_bodega = p_id_bodega;
        
        -- Actualizar inventario
        INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
        VALUES (v_id_producto, p_id_bodega, p_nueva_cantidad)
        ON DUPLICATE KEY UPDATE 
            cantidad_disponible = p_nueva_cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP;
        
        -- Registrar movimiento de ajuste
        INSERT INTO movimientos (id_producto, id_bodega_destino, id_usuario_responsable, 
                               tipo_movimiento, cantidad, observaciones)
        VALUES (v_id_producto, p_id_bodega, p_id_usuario, 'AJUSTE', 
               p_nueva_cantidad - v_cantidad_anterior, p_motivo);
        
        SET p_mensaje = CONCAT('Inventario ajustado. Anterior: ', v_cantidad_anterior, ', Nuevo: ', p_nueva_cantidad);
        COMMIT;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_cancelar_sesion_escaneo` (IN `p_id_sesion` INT, OUT `p_mensaje` VARCHAR(255))   BEGIN
    DECLARE v_estado VARCHAR(20);
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al cancelar sesión';
    END;

    START TRANSACTION;
    
    SELECT estado INTO v_estado
    FROM sesiones_escaneo 
    WHERE id_sesion = p_id_sesion;
    
    IF v_estado != 'ACTIVA' THEN
        SET p_mensaje = 'La sesión no está activa';
        ROLLBACK;
    ELSE
        -- Eliminar detalles de escaneo
        DELETE FROM detalles_escaneo WHERE id_sesion = p_id_sesion;
        
        -- Marcar sesión como cancelada
        UPDATE sesiones_escaneo 
        SET estado = 'CANCELADA', fecha_fin = CURRENT_TIMESTAMP
        WHERE id_sesion = p_id_sesion;
        
        SET p_mensaje = 'Sesión cancelada correctamente';
        COMMIT;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consultar_inventario_bodega` (IN `p_id_bodega` INT)   BEGIN
    SELECT 
        p.codigo,
        p.nombre,
        p.talla,
        i.cantidad_disponible,
        i.cantidad_reservada,
        i.fecha_actualizacion
    FROM inventario i
    INNER JOIN productos p ON i.id_producto = p.id_producto
    WHERE i.id_bodega = p_id_bodega 
    AND i.cantidad_disponible > 0
    AND p.estado = 'ACTIVO'
    ORDER BY p.nombre;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consultar_movimientos` (IN `p_id_bodega` INT, IN `p_fecha_inicio` DATE, IN `p_fecha_fin` DATE)   BEGIN
    SELECT 
        m.id_movimiento,
        p.codigo,
        p.nombre,
        bo.nombre AS bodega_origen,
        bd.nombre AS bodega_destino,
        u.nombre AS usuario,
        m.tipo_movimiento,
        m.cantidad,
        m.fecha_movimiento,
        m.observaciones
    FROM movimientos m
    INNER JOIN productos p ON m.id_producto = p.id_producto
    INNER JOIN usuarios u ON m.id_usuario_responsable = u.id_usuario
    LEFT JOIN bodegas bo ON m.id_bodega_origen = bo.id_bodega
    LEFT JOIN bodegas bd ON m.id_bodega_destino = bd.id_bodega
    WHERE (m.id_bodega_origen = p_id_bodega OR m.id_bodega_destino = p_id_bodega)
    AND DATE(m.fecha_movimiento) BETWEEN p_fecha_inicio AND p_fecha_fin
    ORDER BY m.fecha_movimiento DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consultar_stock_producto` (IN `p_codigo_producto` VARCHAR(50))   BEGIN
    SELECT 
        b.nombre AS bodega,
        p.codigo,
        p.nombre,
        p.talla,
        i.cantidad_disponible,
        i.cantidad_reservada,
        i.fecha_actualizacion
    FROM inventario i
    INNER JOIN productos p ON i.id_producto = p.id_producto
    INNER JOIN bodegas b ON i.id_bodega = b.id_bodega
    WHERE p.codigo = p_codigo_producto 
    AND i.cantidad_disponible > 0
    AND p.estado = 'ACTIVO'
    ORDER BY b.nombre;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consulta_usuarios` ()   BEGIN

SELECT * FROM usuarios;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_bodegas` (IN `_nombre` VARCHAR(100), IN `_capacidad` INT(11), IN `_estado` ENUM('ACTIVA','INACTIVA'))   BEGIN

INSERT INTO bodegas (nombre, capacidad, estado, fecha_creacion)
VALUES (_nombre, _capacidad, _estado, NOW());

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_bodega` (IN `_id_bodega` INT(11))   BEGIN

DELETE FROM bodegas

WHERE id_bodega = _id_bodega;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_usuario` (IN `_id_usuario` INT(11))   BEGIN

DELETE FROM usuarios
WHERE id_usuario = _id_usuario;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_finalizar_sesion_escaneo` (IN `p_id_sesion` INT, OUT `p_mensaje` VARCHAR(255))   BEGIN
    DECLARE v_id_bodega INT;
    DECLARE v_id_usuario INT;
    DECLARE v_total_productos INT DEFAULT 0;
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_id_producto INT;
    DECLARE v_cantidad INT;
    
    DECLARE cur_productos CURSOR FOR
        SELECT d.id_producto, d.cantidad_escaneada
        FROM detalles_escaneo d
        WHERE d.id_sesion = p_id_sesion;
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al finalizar sesión de escaneo';
    END;

    START TRANSACTION;
    
    -- Obtener datos de la sesión
    SELECT id_bodega, id_usuario INTO v_id_bodega, v_id_usuario
    FROM sesiones_escaneo 
    WHERE id_sesion = p_id_sesion AND estado = 'ACTIVA';
    
    IF v_id_bodega IS NULL THEN
        SET p_mensaje = 'Sesión no encontrada o no activa';
        ROLLBACK;
    ELSE
        -- Procesar cada producto escaneado
        OPEN cur_productos;
        read_loop: LOOP
            FETCH cur_productos INTO v_id_producto, v_cantidad;
            IF v_done THEN
                LEAVE read_loop;
            END IF;
            
            -- Actualizar o insertar en inventario
            INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
            VALUES (v_id_producto, v_id_bodega, v_cantidad)
            ON DUPLICATE KEY UPDATE 
                cantidad_disponible = cantidad_disponible + v_cantidad,
                fecha_actualizacion = CURRENT_TIMESTAMP;
            
            -- Registrar movimiento
            INSERT INTO movimientos (id_producto, id_bodega_destino, id_usuario_responsable, 
                                   tipo_movimiento, cantidad, observaciones)
            VALUES (v_id_producto, v_id_bodega, v_id_usuario, 'ENTRADA', v_cantidad, 
                   CONCAT('Escaneo - Sesión: ', p_id_sesion));
            
            SET v_total_productos = v_total_productos + 1;
        END LOOP;
        CLOSE cur_productos;
        
        -- Actualizar sesión como finalizada
        UPDATE sesiones_escaneo 
        SET estado = 'FINALIZADA', 
            fecha_fin = CURRENT_TIMESTAMP,
            total_productos = v_total_productos
        WHERE id_sesion = p_id_sesion;
        
        SET p_mensaje = CONCAT('Sesión finalizada. ', v_total_productos, ' productos procesados');
        COMMIT;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_iniciar_sesion_escaneo` (IN `p_id_bodega` INT, IN `p_id_usuario` INT, IN `p_observaciones` TEXT, OUT `p_id_sesion` INT, OUT `p_mensaje` VARCHAR(255))   BEGIN
    DECLARE v_sesiones_activas INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al iniciar sesión de escaneo';
        SET p_id_sesion = 0;
    END;

    START TRANSACTION;
    
    -- Verificar si hay sesiones activas
    SELECT COUNT(*) INTO v_sesiones_activas
    FROM sesiones_escaneo 
    WHERE id_bodega = p_id_bodega AND id_usuario = p_id_usuario AND estado = 'ACTIVA';
    
    IF v_sesiones_activas > 0 THEN
        SET p_mensaje = 'Ya tiene una sesión activa en esta bodega';
        SET p_id_sesion = 0;
        ROLLBACK;
    ELSE
        INSERT INTO sesiones_escaneo (id_bodega, id_usuario, observaciones)
        VALUES (p_id_bodega, p_id_usuario, p_observaciones);
        
        SET p_id_sesion = LAST_INSERT_ID();
        SET p_mensaje = 'Sesión iniciada correctamente';
        COMMIT;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_insertar_usuario` (IN `_id_bodega` INT, IN `_nombre` VARCHAR(100), IN `_correo` VARCHAR(150), IN `_contrasena` VARCHAR(255), IN `_rol` VARCHAR(50), IN `_estado` ENUM('ACTIVO','INACTIVO'))   BEGIN
    -- Verificar si el usuario ya existe
    DECLARE user_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO user_exists FROM usuarios WHERE correo = _correo;
    
    IF user_exists > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El correo ya está registrado';
    ELSE
        INSERT INTO usuarios (id_bodega, nombre, correo, contrasena, rol, estado, fecha_creacion)
        VALUES (_id_bodega, _nombre, _correo, _contrasena, _rol, _estado, NOW());
        
        SELECT ROW_COUNT() AS affected_rows;
    END IF;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_login` (IN `_nombre` VARCHAR(100))   BEGIN
    SELECT 
        u.id_usuario,
        u.id_bodega,
        b.nombre AS nombre_bodega,
        u.nombre,
        u.contrasena,
        u.rol
    FROM usuarios u
    LEFT JOIN bodegas b ON u.id_bodega = b.id_bodega
    WHERE u.nombre = _nombre;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_modificar_bodega` (IN `_id_bodega` INT(11), IN `_nombre` VARCHAR(100), IN `_capacidad` INT(11), IN `_estado` ENUM('ACTIVA','INACTIVA'))   BEGIN

UPDATE bodegas

SET
nombre = _nombre,
capacidad = _capacidad,
estado = _estado

WHERE id_bodega = _id_bodega;


END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_modificar_usuario` (IN `_id_bodega` INT(11), IN `_nombre` VARCHAR(100), IN `_contrasena` VARCHAR(255))   BEGIN

	UPDATE usuarios

	SET 
		id_bodega = _id_bodega,
		contrasena = _contrasena
	WHERE nombre = _nombre; 

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_mostrar_bodega` ()   BEGIN

SELECT * FROM bodegas;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_obtener_detalle_sesion` (IN `p_id_sesion` INT)   BEGIN
    SELECT 
        s.id_sesion,
        b.nombre AS bodega,
        u.nombre AS usuario,
        s.fecha_inicio,
        s.estado,
        s.observaciones,
        COUNT(d.id_detalle) AS total_productos_distintos,
        SUM(d.cantidad_escaneada) AS total_cantidad
    FROM sesiones_escaneo s
    INNER JOIN bodegas b ON s.id_bodega = b.id_bodega
    INNER JOIN usuarios u ON s.id_usuario = u.id_usuario
    LEFT JOIN detalles_escaneo d ON s.id_sesion = d.id_sesion
    WHERE s.id_sesion = p_id_sesion
    GROUP BY s.id_sesion, b.nombre, u.nombre, s.fecha_inicio, s.estado, s.observaciones;
    
    -- Detalle de productos
    SELECT 
        p.codigo,
        p.nombre,
        p.talla,
        d.cantidad_escaneada,
        d.fecha_escaneo
    FROM detalles_escaneo d
    INNER JOIN productos p ON d.id_producto = p.id_producto
    WHERE d.id_sesion = p_id_sesion
    ORDER BY d.fecha_escaneo DESC;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_transferir_productos` (IN `p_id_bodega_origen` INT, IN `p_id_bodega_destino` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_cantidad` INT, IN `p_id_usuario` INT, IN `p_observaciones` TEXT, OUT `p_mensaje` VARCHAR(255))   BEGIN
    DECLARE v_id_producto INT DEFAULT 0;
    DECLARE v_cantidad_disponible INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al realizar transferencia';
    END;

    START TRANSACTION;
    
    -- Obtener ID del producto
    SELECT id_producto INTO v_id_producto
    FROM productos 
    WHERE codigo = p_codigo_producto AND estado = 'ACTIVO';
    
    IF v_id_producto = 0 THEN
        SET p_mensaje = 'Producto no encontrado';
        ROLLBACK;
    ELSE
        -- Verificar disponibilidad en bodega origen
        SELECT IFNULL(cantidad_disponible, 0) INTO v_cantidad_disponible
        FROM inventario 
        WHERE id_producto = v_id_producto AND id_bodega = p_id_bodega_origen;
        
        IF v_cantidad_disponible < p_cantidad THEN
            SET p_mensaje = CONCAT('Stock insuficiente. Disponible: ', v_cantidad_disponible);
            ROLLBACK;
        ELSE
            -- Reducir stock en bodega origen
            UPDATE inventario 
            SET cantidad_disponible = cantidad_disponible - p_cantidad,
                fecha_actualizacion = CURRENT_TIMESTAMP
            WHERE id_producto = v_id_producto AND id_bodega = p_id_bodega_origen;
            
            -- Aumentar stock en bodega destino
            INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
            VALUES (v_id_producto, p_id_bodega_destino, p_cantidad)
            ON DUPLICATE KEY UPDATE 
                cantidad_disponible = cantidad_disponible + p_cantidad,
                fecha_actualizacion = CURRENT_TIMESTAMP;
            
            -- Registrar movimiento de transferencia
            INSERT INTO movimientos (id_producto, id_bodega_origen, id_bodega_destino, 
                                   id_usuario_responsable, tipo_movimiento, cantidad, observaciones)
            VALUES (v_id_producto, p_id_bodega_origen, p_id_bodega_destino, 
                   p_id_usuario, 'TRANSFERENCIA', p_cantidad, p_observaciones);
            
            SET p_mensaje = 'Transferencia realizada exitosamente';
            COMMIT;
        END IF;
    END IF;
END$$

DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `bodegas`
--

CREATE TABLE `bodegas` (
  `id_bodega` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `capacidad` int(11) DEFAULT NULL,
  `estado` enum('ACTIVA','INACTIVA') DEFAULT 'ACTIVA',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `bodegas`
--

INSERT INTO `bodegas` (`id_bodega`, `nombre`, `capacidad`, `estado`, `fecha_creacion`) VALUES
(1, 'Corte', 1000, 'ACTIVA', '2025-06-25 20:48:34'),
(2, 'Montaje', 800, 'ACTIVA', '2025-06-25 20:48:34'),
(3, 'Inyección', 600, 'ACTIVA', '2025-06-25 20:48:34'),
(4, 'Vulcanizado', 500, 'ACTIVA', '2025-06-25 20:48:34'),
(5, 'Terminada', 400, 'ACTIVA', '2025-06-25 20:48:34'),
(6, 'Preparada', 300, 'ACTIVA', '2025-06-25 20:48:34');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `detalles_escaneo`
--

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
DELIMITER $$
CREATE TRIGGER `tr_inventario_historial` AFTER UPDATE ON `inventario` FOR EACH ROW BEGIN
    INSERT INTO historial (id_producto, id_bodega, id_usuario, accion, cantidad_anterior, cantidad_nueva, detalles)
    VALUES (NEW.id_producto, NEW.id_bodega, 1, 'ACTUALIZACION_INVENTARIO', OLD.cantidad_disponible, NEW.cantidad_disponible, 
            JSON_OBJECT('motivo', 'Actualización automática de inventario'));
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `movimientos`
--

CREATE TABLE `movimientos` (
  `id_movimiento` int(11) NOT NULL,
  `id_producto` int(11) NOT NULL,
  `id_bodega_origen` int(11) DEFAULT NULL,
  `id_bodega_destino` int(11) DEFAULT NULL,
  `id_usuario_responsable` int(11) NOT NULL,
  `fecha_movimiento` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo_movimiento` enum('ENTRADA','SALIDA','TRANSFERENCIA','AJUSTE') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `estado_movimiento` enum('PENDIENTE','COMPLETADO','CANCELADO') DEFAULT 'COMPLETADO',
  `numero_lote` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

CREATE TABLE `productos` (
  `id_producto` int(11) NOT NULL,
  `codigo` varchar(50) NOT NULL,
  `nombre` varchar(200) NOT NULL,
  `descripcion` text DEFAULT NULL,
  `talla` varchar(20) DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `codigo`, `nombre`, `descripcion`, `talla`, `estado`, `fecha_creacion`) VALUES
(1, 'PROD001', 'Producto A', NULL, 'M', 'ACTIVO', '2025-06-25 20:48:34'),
(2, 'PROD002', 'Producto B', NULL, 'L', 'ACTIVO', '2025-06-25 20:48:34'),
(3, 'PROD003', 'Producto C', NULL, 'S', 'ACTIVO', '2025-06-25 20:48:34');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `sesiones_escaneo`
--

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

CREATE TABLE `usuarios` (
  `id_usuario` int(11) NOT NULL,
  `id_bodega` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `correo` varchar(150) DEFAULT NULL,
  `contrasena` varchar(255) NOT NULL,
  `rol` enum('ADMINISTRADOR','OPERADOR','SUPERVISOR') DEFAULT NULL,
  `estado` enum('ACTIVO','INACTIVO') DEFAULT 'ACTIVO',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `id_bodega`, `nombre`, `correo`, `contrasena`, `rol`, `estado`, `fecha_creacion`) VALUES
(2, 5, 'Gian', 'programador@calzado70.com', '$2b$10$P8FrShmAawQXOWiB.Oofa.tDccx13UNu.EF5VH5dnP9OJIoCepS4G', 'ADMINISTRADOR', 'ACTIVO', '2025-06-26 17:22:26'),
(3, 1, 'carlos', 'montaje@calzado70.com', '$2b$10$/ooifoAUEQgIDVNIuzrvm.MJwBTvdUYMLQ57A0SbEduM2lMaMUliG', 'SUPERVISOR', 'ACTIVO', '2025-06-27 19:46:44'),
(4, 2, 'carlos', 'gofy@calzado70.com', '$2b$10$h18ay3OD.aHg22EifZSkTOS6yfRV4weI.JgulsAEHZLvTnEQx2zNi', 'SUPERVISOR', 'ACTIVO', '2025-06-27 19:49:35');

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
  MODIFY `id_bodega` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `sesiones_escaneo`
--
ALTER TABLE `sesiones_escaneo`
  MODIFY `id_sesion` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id_usuario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

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
  ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`),
  ADD CONSTRAINT `movimientos_ibfk_2` FOREIGN KEY (`id_bodega_origen`) REFERENCES `bodegas` (`id_bodega`),
  ADD CONSTRAINT `movimientos_ibfk_3` FOREIGN KEY (`id_bodega_destino`) REFERENCES `bodegas` (`id_bodega`),
  ADD CONSTRAINT `movimientos_ibfk_4` FOREIGN KEY (`id_usuario_responsable`) REFERENCES `usuarios` (`id_usuario`);

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
