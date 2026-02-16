-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 16-02-2026 a las 14:34:23
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

DELIMITER $$
--
-- Procedimientos
--
DROP PROCEDURE IF EXISTS `sp_actualizar_caracteristica_producto`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_actualizar_caracteristica_producto` (IN `p_codigo_producto` VARCHAR(50), IN `p_nueva_caracteristica` VARCHAR(255), OUT `p_mensaje` VARCHAR(255))   BEGIN
    DECLARE v_producto_existe INT;

    -- Verifica si el producto existe
    SELECT COUNT(*) INTO v_producto_existe
    FROM productos
    WHERE codigo = p_codigo_producto AND estado = 'ACTIVO';

    IF v_producto_existe = 0 THEN
        SET p_mensaje = 'Producto no encontrado o inactivo';
    ELSE
        UPDATE productos
        SET caracteristica = p_nueva_caracteristica
        WHERE codigo = p_codigo_producto;

        SET p_mensaje = 'Característica actualizada correctamente';
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_agregar_producto_sesion`$$
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

DROP PROCEDURE IF EXISTS `sp_ajustar_inventario`$$
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

DROP PROCEDURE IF EXISTS `sp_cancelar_sesion_escaneo`$$
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

DROP PROCEDURE IF EXISTS `sp_consultar_historial_movimientos`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consultar_historial_movimientos` ()   BEGIN
    SELECT 
        b.nombre AS Bodega,
        p.codigo AS Codigo,
        p.caracteristica,
        u.nombre AS Usuario,
        m.cantidad_anterior,
        m.cantidad_nueva,
        m.fecha
    FROM historial m
    INNER JOIN productos p 
        ON m.id_producto = p.id_producto
    INNER JOIN bodegas b 
        ON m.id_bodega = b.id_bodega
    INNER JOIN usuarios u 
        ON m.id_usuario = u.id_usuario
    ORDER BY m.fecha DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_consultar_inventario_bodega`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consultar_inventario_bodega` (IN `p_nombre_bodega` VARCHAR(100))   BEGIN
    DECLARE v_id_bodega INT;

    IF p_nombre_bodega IS NULL OR p_nombre_bodega = '' THEN
        -- Traer todo el inventario
        SELECT 
            b.nombre AS bodega,
            p.codigo,
            p.caracteristica,
            i.cantidad_disponible,
            i.cantidad_reservada,
            i.fecha_actualizacion
        FROM inventario i
        INNER JOIN productos p ON i.id_producto = p.id_producto
        INNER JOIN bodegas b ON i.id_bodega = b.id_bodega
        WHERE i.cantidad_disponible > 0
          AND p.estado = 'ACTIVO'
        ORDER BY b.nombre, p.codigo;
    ELSE
        -- Buscar por bodega específica
        SELECT id_bodega INTO v_id_bodega
        FROM bodegas
        WHERE nombre = p_nombre_bodega
        LIMIT 1;

        IF v_id_bodega IS NOT NULL THEN
            SELECT 
                b.nombre AS bodega,
                p.codigo,
                p.caracteristica,
                i.cantidad_disponible,
                i.cantidad_reservada,
                i.fecha_actualizacion
            FROM inventario i
            INNER JOIN productos p ON i.id_producto = p.id_producto
            INNER JOIN bodegas b ON i.id_bodega = b.id_bodega
            WHERE i.id_bodega = v_id_bodega
              AND i.cantidad_disponible > 0
              AND p.estado = 'ACTIVO';
        ELSE
            SELECT 'Bodega no encontrada' AS mensaje;
        END IF;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_consultar_movimientos`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consultar_movimientos` (IN `p_id_bodega` INT, IN `p_fecha_inicio` DATE, IN `p_fecha_fin` DATE, IN `P_codigo_inteligente` VARCHAR(100))   BEGIN

	SET p_codigo_inteligente = NULLIF(TRIM(p_codigo_inteligente), "");

    SELECT 
        m.id_movimiento,
        p.codigo,
        bo.nombre AS bodega_origen,
        bd.nombre AS bodega_destino,
        u.nombre AS usuario,
        m.tipo_movimiento,
        m.cantidad,
        DATE_FORMAT(m.fecha_movimiento, '%d/%m/%Y') AS fecha_movimiento, -- Fecha corta
        m.observaciones
    FROM movimientos m
    INNER JOIN productos p ON m.id_producto = p.id_producto
    INNER JOIN usuarios u ON m.id_usuario_responsable = u.id_usuario
    LEFT JOIN bodegas bo ON m.id_bodega_origen = bo.id_bodega
    LEFT JOIN bodegas bd ON m.id_bodega_destino = bd.id_bodega
    WHERE 
        (p_id_bodega IS NULL OR m.id_bodega_origen = p_id_bodega OR m.id_bodega_destino = p_id_bodega)
        AND (p_fecha_inicio IS NULL OR DATE(m.fecha_movimiento) >= p_fecha_inicio)
        AND (p_fecha_fin IS NULL OR DATE(m.fecha_movimiento) <= p_fecha_fin)
		AND(P_codigo_inteligente IS NULL OR m.observaciones = P_codigo_inteligente OR m.observaciones = P_codigo_inteligente)
    ORDER BY m.fecha_movimiento DESC;
END$$

DROP PROCEDURE IF EXISTS `sp_consultar_stock_producto`$$
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

DROP PROCEDURE IF EXISTS `sp_consulta_usuarios`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consulta_usuarios` ()   BEGIN
    SELECT 
        u.id_usuario,
        u.nombre,
        u.correo,
        u.rol,
        u.estado,
        u.fecha_creacion,
        b.nombre AS nombre_bodega  -- Aquí obtenemos el nombre en lugar del ID
    FROM 
        usuarios u
    LEFT JOIN 
        bodegas b ON u.id_bodega = b.id_bodega;
END$$

DROP PROCEDURE IF EXISTS `sp_crear_bodegas`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_bodegas` (IN `_nombre` VARCHAR(100), IN `_capacidad` INT(11), IN `_estado` ENUM('ACTIVA','INACTIVA'))   BEGIN

INSERT INTO bodegas (nombre, capacidad, estado, fecha_creacion)
VALUES (_nombre, _capacidad, _estado, NOW());

END$$

DROP PROCEDURE IF EXISTS `sp_crear_producto`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_producto` (IN `_codigo` VARCHAR(50), IN `_caracteristica` VARCHAR(200))   BEGIN

DECLARE codigo_count INT DEFAULT 0;

SELECT COUNT(*) INTO codigo_count FROM productos WHERE codigo = _codigo;

IF codigo_count > 0 THEN 
SIGNAL SQLSTATE '45000'
SET MESSAGE_TEXT = 'el codigo ya esta registrado o esta inactivo',
MYSQL_ERRNO = 1062;

ELSE

INSERT INTO productos (codigo, caracteristica, estado, 	fecha_creacion)
VALUES (_codigo, _caracteristica, 'ACTIVO', NOW());

END IF;

END$$

DROP PROCEDURE IF EXISTS `sp_eliminar_bodega`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_bodega` (IN `_id_bodega` INT(11))   BEGIN

DELETE FROM bodegas

WHERE id_bodega = _id_bodega;

END$$

DROP PROCEDURE IF EXISTS `sp_eliminar_usuario`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_usuario` (IN `_id_usuario` INT(11))   BEGIN

DELETE FROM usuarios
WHERE id_usuario = _id_usuario;

END$$

DROP PROCEDURE IF EXISTS `sp_finalizar_sesion_escaneo`$$
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

DROP PROCEDURE IF EXISTS `sp_iniciar_sesion_escaneo`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_iniciar_sesion_escaneo` (IN `p_id_bodega` INT, IN `p_id_usuario` INT, IN `p_observaciones` TEXT, OUT `p_id_sesion` INT, OUT `p_mensaje` VARCHAR(255))   proc: BEGIN
    DECLARE v_sesiones_activas INT DEFAULT 0;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al iniciar sesión de escaneo';
        SET p_id_sesion = 0;
    END;

    START TRANSACTION;
    
    IF p_id_bodega <> 1 THEN
        SET p_mensaje = 'Solo se permite iniciar sesión en la bodega principal';
        SET p_id_sesion = 0;
        ROLLBACK;
        LEAVE proc;
    END IF;
    
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

DROP PROCEDURE IF EXISTS `sp_insertar_usuario`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_insertar_usuario` (IN `_id_bodega` INT, IN `_nombre` VARCHAR(100), IN `_correo` VARCHAR(150), IN `_contrasena` VARCHAR(255), IN `_rol` VARCHAR(50), IN `_estado` ENUM('ACTIVO','INACTIVO'))   BEGIN
    DECLARE user_count INT DEFAULT 0;
    
    -- Verificar si el correo ya existe
    SELECT COUNT(*) INTO user_count FROM usuarios WHERE correo = _correo;
    
    IF user_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'El correo ya está registrado',
        MYSQL_ERRNO = 1062;
    ELSE
        -- Insertar nuevo usuario
        INSERT INTO usuarios (id_bodega, nombre, correo, contrasena, rol, estado, fecha_creacion)
        VALUES (_id_bodega, _nombre, _correo, _contrasena, _rol, _estado, NOW());
        
        -- Devolver resultado claro
        SELECT 
            ROW_COUNT() AS affected_rows,
            LAST_INSERT_ID() AS id_usuario;
    END IF;
END$$

DROP PROCEDURE IF EXISTS `sp_login`$$
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

DROP PROCEDURE IF EXISTS `sp_modificar_bodega`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_modificar_bodega` (IN `_id_bodega` INT(11), IN `_nombre` VARCHAR(100), IN `_capacidad` INT(11), IN `_estado` ENUM('ACTIVA','INACTIVA'))   BEGIN

UPDATE bodegas

SET
nombre = _nombre,
capacidad = _capacidad,
estado = _estado

WHERE id_bodega = _id_bodega;


END$$

DROP PROCEDURE IF EXISTS `sp_modificar_usuario`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_modificar_usuario` (IN `_id_bodega` INT(11), IN `_nombre` VARCHAR(100), IN `_contrasena` VARCHAR(255))   BEGIN

	UPDATE usuarios

	SET 
		id_bodega = _id_bodega,
		contrasena = _contrasena
	WHERE nombre = _nombre; 

END$$

DROP PROCEDURE IF EXISTS `sp_mostrar_bodega`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_mostrar_bodega` ()   BEGIN

SELECT * FROM bodegas;

END$$

DROP PROCEDURE IF EXISTS `sp_mostrar_bodega_por_id`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_mostrar_bodega_por_id` (IN `_id_bodega` INT)   BEGIN
    SELECT 
        id_bodega,
        nombre,
        capacidad,
        estado
    FROM bodegas
    WHERE id_bodega = _id_bodega;
END$$

DROP PROCEDURE IF EXISTS `sp_mostrar_usuario_id`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_mostrar_usuario_id` (IN `_id_usuario` INT(11))   BEGIN

SELECT id_usuario, nombre FROM usuarios 
WHERE id_usuario = _id_usuario;

END$$

DROP PROCEDURE IF EXISTS `sp_obtener_detalle_sesion`$$
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

DROP PROCEDURE IF EXISTS `sp_transferir_productos`$$
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_transferir_productos` (IN `p_id_bodega_origen` INT, IN `p_id_bodega_destino` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_cantidad` INT, IN `p_id_usuario` INT, IN `p_observaciones` TEXT, IN `p_tipo_movimiento` ENUM('ENTRADA','SALIDA','TRANSFERENCIA','AJUSTE'), OUT `p_mensaje` VARCHAR(255))   BEGIN
    DECLARE v_id_producto INT DEFAULT 0;
    DECLARE v_cantidad_disponible INT DEFAULT 0;
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE v_error_message TEXT DEFAULT '';
    DECLARE v_prefijo VARCHAR(10) DEFAULT '';
    DECLARE v_observacion_final TEXT;
    DECLARE v_caracteristica VARCHAR(50) DEFAULT '';
    DECLARE v_codigo_modificado VARCHAR(100) DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        SET p_mensaje = CONCAT('Error SQL: ', v_error_message);
        ROLLBACK;
    END;

    START TRANSACTION;

    -- Validar que el usuario exista
    SELECT COUNT(*) INTO v_user_exists
    FROM usuarios
    WHERE id_usuario = p_id_usuario;

    IF v_user_exists = 0 THEN
        SET p_mensaje = 'Usuario responsable no existe';
        ROLLBACK;
    ELSE
        -- Obtener ID y característica del producto
        SELECT id_producto, IFNULL(caracteristica, '') INTO v_id_producto, v_caracteristica
        FROM productos 
        WHERE codigo = p_codigo_producto AND estado = 'ACTIVO';

        IF v_id_producto IS NULL THEN
            SET p_mensaje = 'Producto no encontrado';
            ROLLBACK;
        ELSE
            -- Verificar disponibilidad en bodega destino
            SELECT IFNULL(cantidad_disponible, 0) INTO v_cantidad_disponible
            FROM inventario 
            WHERE id_producto = v_id_producto AND id_bodega = p_id_bodega_destino;

            IF v_cantidad_disponible < p_cantidad THEN
                SET p_mensaje = CONCAT('Stock insuficiente en bodega destino. Disponible: ', v_cantidad_disponible);
                ROLLBACK;
            ELSE
                -- Reducir stock en bodega destino
                UPDATE inventario 
                SET cantidad_disponible = cantidad_disponible - p_cantidad,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id_producto = v_id_producto AND id_bodega = p_id_bodega_destino;

                -- Aumentar stock en bodega origen
                INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
                VALUES (v_id_producto, p_id_bodega_origen, p_cantidad)
                ON DUPLICATE KEY UPDATE 
                    cantidad_disponible = cantidad_disponible + p_cantidad,
                    fecha_actualizacion = CURRENT_TIMESTAMP;

                -- Determinar prefijo según bodega origen
                CASE p_id_bodega_origen
                    WHEN 5 THEN SET v_prefijo = 'PPG'; -- Guarnecida
                    WHEN 2 THEN SET v_prefijo = 'PPM'; -- Montaje
                    WHEN 1 THEN SET v_prefijo = 'PPC'; -- Corte
                    WHEN 4 THEN SET v_prefijo = 'PPV'; -- Vulcanizada
                    WHEN 3 THEN SET v_prefijo = 'PPI'; -- Inyectada
                    WHEN 6 THEN SET v_prefijo = 'PPT'; -- Terminada
                    ELSE SET v_prefijo = '';
                END CASE;

                -- Si el producto tiene característica, insertarla antes de las dos últimas cifras
                IF v_caracteristica <> '' THEN
                    SET v_codigo_modificado = CONCAT(
                        LEFT(p_codigo_producto, LENGTH(p_codigo_producto) - 2),
                        v_caracteristica,
                        RIGHT(p_codigo_producto, 2)
                    );
                ELSE
                    SET v_codigo_modificado = p_codigo_producto;
                END IF;

                -- Crear observación final
                SET v_observacion_final = CONCAT(p_observaciones, v_prefijo, v_codigo_modificado);

                -- Registrar movimiento
                INSERT INTO movimientos (
                    id_producto,
                    id_bodega_origen,
                    id_bodega_destino,
                    id_usuario_responsable,
                    tipo_movimiento,
                    cantidad,
                    observaciones
                )
                VALUES (
                    v_id_producto,
                    p_id_bodega_origen,
                    p_id_bodega_destino,
                    p_id_usuario,
                    p_tipo_movimiento,
                    p_cantidad,
                    v_observacion_final
                );

                SET p_mensaje = 'Transferencia realizada exitosamente';
                COMMIT;
            END IF;
        END IF;
    END IF;
END$$

DELIMITER ;

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

--
-- Volcado de datos para la tabla `bodegas`
--

INSERT INTO `bodegas` (`id_bodega`, `nombre`, `capacidad`, `estado`, `fecha_creacion`) VALUES
(1, 'Corte', 100, 'ACTIVA', '2025-06-25 20:48:34'),
(2, 'Montaje', 100, 'ACTIVA', '2025-06-25 20:48:34'),
(3, 'Inyeccion', 100, 'ACTIVA', '2025-06-25 20:48:34'),
(4, 'Vulcanizado', 100, 'ACTIVA', '2025-06-25 20:48:34'),
(5, 'Guarnecida', 100, 'ACTIVA', '2025-08-12 18:11:45'),
(6, 'Terminada', 100, 'ACTIVA', '2026-01-14 19:26:50');

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

--
-- Volcado de datos para la tabla `detalles_escaneo`
--

INSERT INTO `detalles_escaneo` (`id_detalle`, `id_sesion`, `id_producto`, `cantidad_escaneada`, `fecha_escaneo`) VALUES
(1, 1, 1, 500, '2026-01-14 19:42:56'),
(2, 1, 2, 400, '2026-01-14 19:43:10'),
(3, 2, 2, 50, '2026-01-15 13:59:25'),
(4, 3, 1, 200, '2026-01-21 16:06:38'),
(5, 5, 2, 400, '2026-01-29 19:31:54');

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

--
-- Volcado de datos para la tabla `historial`
--

INSERT INTO `historial` (`id_historial`, `id_producto`, `id_bodega`, `id_usuario`, `accion`, `cantidad_anterior`, `cantidad_nueva`, `fecha`, `detalles`) VALUES
(1, 2, 1, 2, 'ACTUALIZACION_INVENTARIO', 400, 350, '2026-01-14 19:45:37', '{\"motivo\": \"Actualización automática de inventario\"}'),
(2, 1, 1, 2, 'ACTUALIZACION_INVENTARIO', 500, 448, '2026-01-14 19:45:37', '{\"motivo\": \"Actualización automática de inventario\"}'),
(3, 1, 1, 3, 'ACTUALIZACION_INVENTARIO', 448, 444, '2026-01-14 20:22:30', '{\"motivo\": \"Actualización automática de inventario\"}'),
(4, 1, 5, 3, 'ACTUALIZACION_INVENTARIO', 52, 56, '2026-01-14 20:22:30', '{\"motivo\": \"Actualización automática de inventario\"}'),
(5, 2, 1, 3, 'ACTUALIZACION_INVENTARIO', 350, 400, '2026-01-15 14:06:54', '{\"motivo\": \"Actualización automática de inventario\"}'),
(6, 1, 1, 3, 'ACTUALIZACION_INVENTARIO', 444, 644, '2026-01-21 16:06:44', '{\"motivo\": \"Actualización automática de inventario\"}'),
(7, 1, 1, 2, 'ACTUALIZACION_INVENTARIO', 644, 619, '2026-01-21 16:09:42', '{\"motivo\": \"Actualización automática de inventario\"}'),
(8, 1, 5, 3, 'ACTUALIZACION_INVENTARIO', 56, 81, '2026-01-21 16:09:42', '{\"motivo\": \"Actualización automática de inventario\"}'),
(9, 1, 5, 3, 'ACTUALIZACION_INVENTARIO', 81, 51, '2026-01-21 16:19:15', '{\"motivo\": \"Actualización automática de inventario\"}'),
(10, 2, 1, 2, 'ACTUALIZACION_INVENTARIO', 400, 800, '2026-01-29 19:32:30', '{\"motivo\": \"Actualización automática de inventario\"}'),
(11, 2, 5, 3, 'ACTUALIZACION_INVENTARIO', 50, 30, '2026-01-29 19:34:14', '{\"motivo\": \"Actualización automática de inventario\"}'),
(12, 2, 1, 2, 'ACTUALIZACION_INVENTARIO', 800, 820, '2026-01-29 19:34:14', '{\"motivo\": \"Actualización automática de inventario\"}'),
(13, 2, 5, 2, 'ACTUALIZACION_INVENTARIO', 30, 10, '2026-02-06 20:11:57', '{\"motivo\": \"Actualización automática de inventario\"}'),
(14, 2, 1, 2, 'ACTUALIZACION_INVENTARIO', 820, 840, '2026-02-06 20:11:57', '{\"motivo\": \"Actualización automática de inventario\"}'),
(15, 2, 1, 2, 'ACTUALIZACION_INVENTARIO', 840, 800, '2026-02-06 20:16:17', '{\"motivo\": \"Actualización automática de inventario\"}'),
(16, 2, 5, 2, 'ACTUALIZACION_INVENTARIO', 10, 50, '2026-02-06 20:16:17', '{\"motivo\": \"Actualización automática de inventario\"}'),
(17, 2, 1, 3, 'ACTUALIZACION_INVENTARIO', 800, 700, '2026-02-06 20:16:33', '{\"motivo\": \"Actualización automática de inventario\"}'),
(18, 2, 5, 3, 'ACTUALIZACION_INVENTARIO', 50, 150, '2026-02-06 20:16:33', '{\"motivo\": \"Actualización automática de inventario\"}'),
(19, 2, 1, 3, 'ACTUALIZACION_INVENTARIO', 700, 600, '2026-02-06 20:25:56', '{\"motivo\": \"Actualización automática de inventario\"}'),
(20, 2, 5, 3, 'ACTUALIZACION_INVENTARIO', 150, 250, '2026-02-06 20:25:56', '{\"motivo\": \"Actualización automática de inventario\"}'),
(21, 2, 1, 3, 'ACTUALIZACION_INVENTARIO', 600, 500, '2026-02-09 16:49:03', '{\"motivo\": \"Actualización automática de inventario\"}'),
(22, 2, 5, 3, 'ACTUALIZACION_INVENTARIO', 250, 350, '2026-02-09 16:49:03', '{\"motivo\": \"Actualización automática de inventario\"}'),
(23, 1, 1, 3, 'ACTUALIZACION_INVENTARIO', 619, 500, '2026-02-12 17:23:23', '{\"motivo\": \"Actualización automática de inventario\"}'),
(24, 1, 5, 4, 'ACTUALIZACION_INVENTARIO', 51, 170, '2026-02-12 17:23:23', '{\"motivo\": \"Actualización automática de inventario\"}');

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
-- Volcado de datos para la tabla `inventario`
--

INSERT INTO `inventario` (`id_inventario`, `id_producto`, `id_bodega`, `cantidad_disponible`, `cantidad_reservada`, `fecha_actualizacion`) VALUES
(1, 1, 1, 500, 0, '2026-02-12 17:23:23'),
(2, 2, 1, 500, 0, '2026-02-09 16:49:03'),
(3, 2, 5, 350, 0, '2026-02-09 16:49:03'),
(4, 1, 5, 170, 0, '2026-02-12 17:23:23'),
(9, 1, 3, 30, 0, '2026-01-21 16:19:15');

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
  `tipo_movimiento` enum('ENTRADA','SALIDA','TRANSFERENCIA','AJUSTE') NOT NULL,
  `cantidad` int(11) NOT NULL,
  `observaciones` text DEFAULT NULL,
  `estado_movimiento` enum('PENDIENTE','COMPLETADO','CANCELADO') DEFAULT 'COMPLETADO'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `movimientos`
--

INSERT INTO `movimientos` (`id_movimiento`, `id_producto`, `id_bodega_origen`, `id_bodega_destino`, `id_usuario_responsable`, `fecha_movimiento`, `tipo_movimiento`, `cantidad`, `observaciones`, `estado_movimiento`) VALUES
(1, 1, NULL, 1, 2, '2026-01-14 19:43:23', 'ENTRADA', 500, 'Escaneo - Sesión: 1', 'COMPLETADO'),
(2, 2, NULL, 1, 2, '2026-01-14 19:43:23', 'ENTRADA', 400, 'Escaneo - Sesión: 1', 'COMPLETADO'),
(3, 2, 5, 1, 3, '2026-01-14 19:45:37', 'ENTRADA', 50, 'PPICI0700010N/A34', 'COMPLETADO'),
(4, 1, 5, 1, 3, '2026-01-14 19:45:37', 'ENTRADA', 52, 'PPICI0700010N/A40', 'COMPLETADO'),
(5, 1, 5, 1, 3, '2026-01-14 20:22:30', 'ENTRADA', 4, 'PPGCI0700010N/A40', 'COMPLETADO'),
(6, 2, NULL, 1, 2, '2026-01-15 14:06:54', 'ENTRADA', 50, 'Escaneo - Sesión: 2', 'COMPLETADO'),
(7, 1, NULL, 1, 2, '2026-01-21 16:06:44', 'ENTRADA', 200, 'Escaneo - Sesión: 3', 'COMPLETADO'),
(8, 1, 5, 1, 3, '2026-01-21 16:09:43', '', 25, 'PPGCI0700010N/A40', 'COMPLETADO'),
(9, 1, 3, 5, 4, '2026-01-21 16:19:15', 'ENTRADA', 30, 'PPICI07000104240', 'COMPLETADO'),
(10, 2, NULL, 1, 2, '2026-01-29 19:32:30', 'ENTRADA', 400, 'Escaneo - Sesión: 5', 'COMPLETADO'),
(11, 2, 1, 5, 2, '2026-01-29 19:34:14', 'ENTRADA', 20, 'PPCCI0700010N/A34', 'COMPLETADO'),
(12, 2, 1, 5, 2, '2026-02-06 20:11:57', 'ENTRADA', 20, 'PPCCI0700010N/A34', 'COMPLETADO'),
(13, 2, 5, 1, 3, '2026-02-06 20:16:17', 'ENTRADA', 40, 'PPGCI0700010N/A34', 'COMPLETADO'),
(14, 2, 5, 1, 3, '2026-02-06 20:16:33', 'ENTRADA', 100, 'PPGCI0700010N/A34', 'COMPLETADO'),
(15, 2, 5, 1, 3, '2026-02-06 20:25:56', 'ENTRADA', 100, 'PPGCI0700010N/A34', 'COMPLETADO'),
(16, 2, 5, 1, 3, '2026-02-09 16:49:03', 'ENTRADA', 100, 'PPGCI0700010N/A34', 'COMPLETADO'),
(17, 1, 5, 1, 3, '2026-02-12 17:23:23', 'ENTRADA', 119, 'PPGCI07000104240', 'COMPLETADO');

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

--
-- Volcado de datos para la tabla `productos`
--

INSERT INTO `productos` (`id_producto`, `codigo`, `caracteristica`, `estado`, `fecha_creacion`) VALUES
(1, 'CI070001040', '42', 'ACTIVO', '2026-01-14 19:42:56'),
(2, 'CI070001034', 'N/A', 'ACTIVO', '2026-01-14 19:43:10');

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

--
-- Volcado de datos para la tabla `sesiones_escaneo`
--

INSERT INTO `sesiones_escaneo` (`id_sesion`, `id_bodega`, `id_usuario`, `fecha_inicio`, `fecha_fin`, `estado`, `total_productos`, `observaciones`) VALUES
(1, 1, 2, '2026-01-14 19:41:41', '2026-01-14 19:43:23', 'FINALIZADA', 2, NULL),
(2, 1, 2, '2026-01-15 11:56:57', '2026-01-15 14:06:54', 'FINALIZADA', 1, NULL),
(3, 1, 2, '2026-01-21 16:05:58', '2026-01-21 16:06:44', 'FINALIZADA', 1, NULL),
(4, 1, 2, '2026-01-21 16:06:50', '2026-01-21 16:07:16', 'FINALIZADA', 0, NULL),
(5, 1, 2, '2026-01-29 19:31:40', '2026-01-29 19:32:30', 'FINALIZADA', 1, NULL),
(6, 1, 2, '2026-02-06 19:43:14', '2026-02-06 19:43:18', 'FINALIZADA', 0, NULL);

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

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id_usuario`, `id_bodega`, `nombre`, `correo`, `contrasena`, `rol`, `estado`, `fecha_creacion`) VALUES
(1, 1, 'Gian', 'programador@calzado70.com', '$2b$10$P8FrShmAawQXOWiB.Oofa.tDccx13UNu.EF5VH5dnP9OJIoCepS4G', 'ADMINISTRADOR', 'ACTIVO', '2025-06-26 17:22:26'),
(2, 1, 'camilo', 'Camilo@calzado70.com', '$2b$10$DBph1Pqxm6CLyLu0kbuvL.APLRr/JbktS0ujXwKxqfoFUyQbGLQb2', 'SUPERVISOR', 'ACTIVO', '2026-01-14 18:52:32'),
(3, 5, 'pepe', 'pepito@gmail.com', '$2b$10$XrxJnSDA.129cA1ZdjWFJ.NJC/ywdRMqWe/i94UVW8Z4etC4zdg3i', 'SUPERVISOR', 'ACTIVO', '2026-01-14 19:43:54'),
(4, 3, 'juan', 'juan@calzado70.com', '$2b$10$6C8xhRPwHQ67aJIuHBdm8.tTr3gNjV9IQir1uxxAsUXm/PSRrHkfK', 'SUPERVISOR', 'ACTIVO', '2026-01-21 16:17:19');

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
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT de la tabla `historial`
--
ALTER TABLE `historial`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=25;

--
-- AUTO_INCREMENT de la tabla `inventario`
--
ALTER TABLE `inventario`
  MODIFY `id_inventario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  MODIFY `id_movimiento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de la tabla `sesiones_escaneo`
--
ALTER TABLE `sesiones_escaneo`
  MODIFY `id_sesion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

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
  ADD CONSTRAINT `movimientos_ibfk_1` FOREIGN KEY (`id_producto`) REFERENCES `productos` (`id_producto`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `movimientos_ibfk_2` FOREIGN KEY (`id_bodega_origen`) REFERENCES `bodegas` (`id_bodega`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `movimientos_ibfk_3` FOREIGN KEY (`id_bodega_destino`) REFERENCES `bodegas` (`id_bodega`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `movimientos_ibfk_4` FOREIGN KEY (`id_usuario_responsable`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE CASCADE;

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


--
-- Metadatos
--
USE `phpmyadmin`;

--
-- Metadatos para la tabla bodegas
--

--
-- Metadatos para la tabla detalles_escaneo
--

--
-- Metadatos para la tabla historial
--

--
-- Volcado de datos para la tabla `pma__table_uiprefs`
--

INSERT INTO `pma__table_uiprefs` (`username`, `db_name`, `table_name`, `prefs`, `last_update`) VALUES
('root', 'betrost', 'historial', '{\"sorted_col\":\"`id_historial` ASC\"}', '2026-01-14 17:01:36');

--
-- Metadatos para la tabla inventario
--

--
-- Metadatos para la tabla movimientos
--

--
-- Volcado de datos para la tabla `pma__table_uiprefs`
--

INSERT INTO `pma__table_uiprefs` (`username`, `db_name`, `table_name`, `prefs`, `last_update`) VALUES
('root', 'betrost', 'movimientos', '{\"sorted_col\":\"`fecha_movimiento` DESC\"}', '2026-01-14 17:04:53');

--
-- Metadatos para la tabla productos
--

--
-- Metadatos para la tabla sesiones_escaneo
--

--
-- Metadatos para la tabla usuarios
--

--
-- Metadatos para la base de datos betrost
--
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
