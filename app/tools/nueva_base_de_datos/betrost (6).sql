-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 06-04-2026 a las 19:59:28
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_asignar_bodega_usuario` (IN `p_id_usuario` INT, IN `p_id_bodega` INT)   BEGIN

    IF NOT EXISTS (
        SELECT 1 
        FROM permisos_bodegas 
        WHERE id_usuario = p_id_usuario 
        AND id_bodega = p_id_bodega
    ) THEN

        INSERT INTO permisos_bodegas(id_usuario,id_bodega)
        VALUES(p_id_usuario,p_id_bodega);

    END IF;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_bodegas_por_usuario` (IN `p_id_usuario` INT)   BEGIN

SELECT 
b.id_bodega,
b.nombre
FROM bodegas b
INNER JOIN permisos_bodegas pb 
ON pb.id_bodega = b.id_bodega
WHERE pb.id_usuario = p_id_usuario
AND b.estado = 'ACTIVA';

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
        m.fecha_movimiento AS fecha_movimiento,
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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_crear_bodegas` (IN `_nombre` VARCHAR(100), IN `_capacidad` INT(11), IN `_estado` ENUM('ACTIVA','INACTIVA'))   BEGIN

INSERT INTO bodegas (nombre, capacidad, estado, fecha_creacion)
VALUES (_nombre, _capacidad, _estado, NOW());

END$$

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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_bodega` (IN `_id_bodega` INT(11))   BEGIN

DELETE FROM bodegas

WHERE id_bodega = _id_bodega;

END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_eliminar_permiso_bodega` (IN `p_id_usuario` INT, IN `p_id_bodega` INT)   BEGIN

    DELETE FROM permisos_bodegas
    WHERE id_usuario = p_id_usuario
    AND id_bodega = p_id_bodega;

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
    DECLARE v_codigo_producto VARCHAR(50);

    
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

    -- Obtener código del producto
    SELECT codigo 
    INTO v_codigo_producto
    FROM productos
    WHERE id_producto = v_id_producto;

    INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
    VALUES (v_id_producto, v_id_bodega, v_cantidad)
    ON DUPLICATE KEY UPDATE 
        cantidad_disponible = cantidad_disponible + v_cantidad,
        fecha_actualizacion = CURRENT_TIMESTAMP;

    INSERT INTO movimientos (
        id_producto,
        id_bodega_destino,
        id_usuario_responsable,
        tipo_movimiento,
        cantidad,
        observaciones
    )
    VALUES (
        v_id_producto,
        v_id_bodega,
        v_id_usuario,
        'ENTRADA',
        v_cantidad,
        CONCAT('PPC', v_codigo_producto)
    );

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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_mostrar_bodega_por_id` (IN `_id_bodega` INT)   BEGIN
    SELECT 
        id_bodega,
        nombre,
        capacidad,
        estado
    FROM bodegas
    WHERE id_bodega = _id_bodega;
END$$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_mostrar_usuario_id` (IN `_id_usuario` INT(11))   BEGIN

SELECT id_usuario, nombre FROM usuarios 
WHERE id_usuario = _id_usuario;

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

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_transferir_productos` (IN `p_id_bodega_origen` INT, IN `p_id_bodega_destino` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_cantidad` INT, IN `p_id_usuario` INT, IN `p_observaciones` TEXT, IN `p_tipo_movimiento` ENUM('ENTRADA','PROCESO','COMPLETO'), OUT `p_mensaje` VARCHAR(255))   BEGIN
    DECLARE v_id_producto INT DEFAULT NULL;
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

    /* ===============================
       1. VALIDAR USUARIO
    =============================== */
    SELECT COUNT(*) INTO v_user_exists
    FROM usuarios
    WHERE id_usuario = p_id_usuario;

    IF v_user_exists = 0 THEN
        SET p_mensaje = 'Usuario no existe';
        ROLLBACK;

    ELSE

        /* ===============================
           2. OBTENER PRODUCTO
        =============================== */
        SELECT id_producto, IFNULL(caracteristica,'')
        INTO v_id_producto, v_caracteristica
        FROM productos
        WHERE codigo = p_codigo_producto
        AND estado = 'ACTIVO'
        LIMIT 1;

        IF v_id_producto IS NULL THEN
            SET p_mensaje = 'Producto no encontrado';
            ROLLBACK;

        ELSE

            /* ===============================
               3. DEFINIR TIPO DE FLUJO
            =============================== */

            IF p_tipo_movimiento = 'COMPLETO' 
   AND p_id_bodega_origen = 23 THEN

    /* =====================================
        CONSUMO INVERSO
       (resta destino, suma origen)
    ===================================== */

    -- VALIDAR STOCK EN DESTINO
    SELECT cantidad_disponible
    INTO v_cantidad_disponible
    FROM inventario
    WHERE id_producto = v_id_producto
    AND id_bodega = p_id_bodega_destino
    FOR UPDATE;

    IF IFNULL(v_cantidad_disponible,0) < p_cantidad THEN
        SET p_mensaje = 'Stock insuficiente en bodega destino';
        ROLLBACK;
    ELSE

        --  RESTAR DESTINO
        UPDATE inventario
        SET cantidad_disponible = cantidad_disponible - p_cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_producto = v_id_producto
        AND id_bodega = p_id_bodega_destino;

        --  SUMAR ORIGEN ( ESTO TE FALTABA)
        INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
        VALUES (v_id_producto, p_id_bodega_origen, p_cantidad)
        ON DUPLICATE KEY UPDATE
            cantidad_disponible = cantidad_disponible + p_cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP;

    END IF;

ELSE

                /* =====================================
                   TRANSFERENCIA NORMAL
                ===================================== */

                SELECT cantidad_disponible
                INTO v_cantidad_disponible
                FROM inventario
                WHERE id_producto = v_id_producto
                AND id_bodega = p_id_bodega_origen
                FOR UPDATE;

                IF IFNULL(v_cantidad_disponible,0) < p_cantidad THEN
                    SET p_mensaje = 'Stock insuficiente en origen';
                    ROLLBACK;
                ELSE

                    -- DESCONTAR ORIGEN
                    UPDATE inventario
                    SET cantidad_disponible = cantidad_disponible - p_cantidad,
                        fecha_actualizacion = CURRENT_TIMESTAMP
                    WHERE id_producto = v_id_producto
                    AND id_bodega = p_id_bodega_origen;

                    -- SUMAR DESTINO
                    INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
                    VALUES (v_id_producto, p_id_bodega_destino, p_cantidad)
                    ON DUPLICATE KEY UPDATE
                        cantidad_disponible = cantidad_disponible + p_cantidad,
                        fecha_actualizacion = CURRENT_TIMESTAMP;

                END IF;

            END IF;

            /* =====================================================
               LÓGICAS PRODUCTIVAS (SOLO SI NO ES CONSUMO)
            ===================================================== */

            IF NOT (p_tipo_movimiento = 'COMPLETO' AND p_id_bodega_origen = 23) THEN

                /* GUARNICIDA COMPLETO (23) */
                IF p_id_bodega_destino = 23 
                   AND p_tipo_movimiento = 'COMPLETO' THEN

                    SELECT cantidad_disponible INTO v_cantidad_disponible
                    FROM inventario
                    WHERE id_producto = v_id_producto AND id_bodega = 5
                    FOR UPDATE;

                    IF IFNULL(v_cantidad_disponible,0) < p_cantidad THEN
                        SET p_mensaje = 'Stock insuficiente en Guarnecida Proceso';
                        ROLLBACK;
                    ELSE
                        UPDATE inventario
                        SET cantidad_disponible = cantidad_disponible - p_cantidad,
                            fecha_actualizacion = CURRENT_TIMESTAMP
                        WHERE id_producto = v_id_producto AND id_bodega = 5;
                    END IF;

                END IF;

                /* MONTAJE COMPLETO (21) */
                IF p_id_bodega_destino = 21 
                   AND p_tipo_movimiento = 'COMPLETO' THEN

                    -- consumir de montaje proceso (2)
                    SELECT cantidad_disponible INTO v_cantidad_disponible
                    FROM inventario
                    WHERE id_producto = v_id_producto AND id_bodega = 2
                    FOR UPDATE;

                    IF IFNULL(v_cantidad_disponible,0) < p_cantidad THEN
                        SET p_mensaje = 'Stock insuficiente en Montaje Proceso';
                        ROLLBACK;
                    ELSE
                        UPDATE inventario
                        SET cantidad_disponible = cantidad_disponible - p_cantidad,
                            fecha_actualizacion = CURRENT_TIMESTAMP
                        WHERE id_producto = v_id_producto AND id_bodega = 2;
                    END IF;

                    -- consumir de guarnecida completo (23)
                    SELECT cantidad_disponible INTO v_cantidad_disponible
                    FROM inventario
                    WHERE id_producto = v_id_producto AND id_bodega = 23
                    FOR UPDATE;

                    IF IFNULL(v_cantidad_disponible,0) < p_cantidad THEN
                        SET p_mensaje = 'Stock insuficiente en Guarnecida Completo';
                        ROLLBACK;
                    ELSE
                        UPDATE inventario
                        SET cantidad_disponible = cantidad_disponible - p_cantidad,
                            fecha_actualizacion = CURRENT_TIMESTAMP
                        WHERE id_producto = v_id_producto AND id_bodega = 23;
                    END IF;

                END IF;

            END IF;

            /* ===============================
               PREFIJOS
            =============================== */
            CASE p_id_bodega_origen
                WHEN 23 THEN SET v_prefijo = 'PPG';
                WHEN 2 THEN SET v_prefijo = 'PPM';
                WHEN 21 THEN SET v_prefijo = 'PPM';
                WHEN 1 THEN SET v_prefijo = 'PPC';
                WHEN 4 THEN SET v_prefijo = 'PPV';
                WHEN 3 THEN SET v_prefijo = 'PPI';
                WHEN 25 THEN SET v_prefijo = 'PPT';
                WHEN 6 THEN SET v_prefijo = 'PPT';
                ELSE SET v_prefijo = 'PPG';
            END CASE;

            /* ===============================
               CODIGO MODIFICADO
            =============================== */
            IF v_caracteristica <> '' THEN
                SET v_codigo_modificado = CONCAT(
                    LEFT(p_codigo_producto, LENGTH(p_codigo_producto) - 2),
                    v_caracteristica,
                    RIGHT(p_codigo_producto, 2)
                );
            ELSE
                SET v_codigo_modificado = p_codigo_producto;
            END IF;

            SET v_observacion_final = CONCAT(
                IFNULL(p_observaciones,''),
                ' ',
                v_prefijo,
                v_codigo_modificado
            );

            /* ===============================
               REGISTRO MOVIMIENTO
            =============================== */
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

            /* ===============================
               MENSAJE FINAL
            =============================== */
            IF p_tipo_movimiento = 'COMPLETO' AND p_id_bodega_origen = 23 THEN
                SET p_mensaje = 'Consumo realizado correctamente';
            ELSE
                SET p_mensaje = 'Transferencia realizada correctamente';
            END IF;

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
(1, 'Corte Materiales', 100, 'ACTIVA', '2025-06-25 20:48:34'),
(2, 'Montaje Proceso', 100, 'ACTIVA', '2025-06-25 20:48:34'),
(3, 'Inyeccion', 100, 'INACTIVA', '2025-06-25 20:48:34'),
(4, 'Vulcanizado Proceso', 100, 'ACTIVA', '2025-06-25 20:48:34'),
(5, 'Guarnecida Proceso', 100, 'ACTIVA', '2025-08-12 18:11:45'),
(6, 'Terminada Proceso', 100, 'ACTIVA', '2026-01-14 19:26:50'),
(7, 'Jose Andres Villa Restrepo', 100, 'ACTIVA', '2026-03-04 00:41:49'),
(8, 'Luis Javier Quintero Quintero', 100, 'ACTIVA', '2026-03-04 00:42:21'),
(9, 'Jorge Wiliam Goez Gil', 100, 'ACTIVA', '2026-03-04 00:42:29'),
(10, 'Maquiladora Dativel', 100, 'ACTIVA', '2026-03-04 00:42:37'),
(11, 'Maria Isaura Castaño Cespedez', 100, 'ACTIVA', '2026-03-04 00:42:45'),
(12, 'Nabor Soto Cataño', 100, 'ACTIVA', '2026-03-04 00:42:56'),
(13, 'Lisett Blindon Zapata', 100, 'ACTIVA', '2026-03-04 00:43:05'),
(14, 'Santiago Torres Diaz', 100, 'ACTIVA', '2026-03-04 00:43:13'),
(15, 'Maria Gilma De Botero Hincapie', 100, 'ACTIVA', '2026-03-04 00:43:21'),
(16, 'Augusto Javier Molina Garcia', 100, 'ACTIVA', '2026-03-04 00:43:29'),
(17, 'joany del Rosario ramirez Perez', 100, 'ACTIVA', '2026-03-04 00:43:36'),
(18, 'Jesus Maria Velandia Rosales', 100, 'ACTIVA', '2026-03-04 00:43:43'),
(19, 'Santiago Murillo Gil', 100, 'ACTIVA', '2026-03-04 00:43:53'),
(21, 'Montaje Completo', 100, 'ACTIVA', '2026-03-04 17:20:12'),
(22, 'Vulcanizado Completo', 100, 'ACTIVA', '2026-03-04 17:20:18'),
(23, 'Guarnecidad Completo', 100, 'ACTIVA', '2026-03-04 17:20:24'),
(25, 'Terminada Completo', 100, 'ACTIVA', '2026-03-04 19:29:57');

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

--
-- Volcado de datos para la tabla `detalles_escaneo`
--

INSERT INTO `detalles_escaneo` (`id_detalle`, `id_sesion`, `id_producto`, `cantidad_escaneada`, `fecha_escaneo`) VALUES
(23, 19, 14, 5000, '2026-03-09 19:50:24'),
(24, 20, 14, 5000, '2026-03-10 19:30:41'),
(25, 21, 14, 4000, '2026-03-31 20:01:36');

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

--
-- Volcado de datos para la tabla `historial`
--

INSERT INTO `historial` (`id_historial`, `id_producto`, `id_bodega`, `id_usuario`, `accion`, `cantidad_anterior`, `cantidad_nueva`, `fecha`, `detalles`) VALUES
(58, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5000, 4000, '2026-03-10 16:12:12', '{\"motivo\": \"Actualización automática de inventario\"}'),
(59, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4000, 5000, '2026-03-10 16:12:12', '{\"motivo\": \"Actualización automática de inventario\"}'),
(60, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5000, 4900, '2026-03-10 16:52:53', '{\"motivo\": \"Actualización automática de inventario\"}'),
(61, 14, 5, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-10 16:52:53', '{\"motivo\": \"Registro inicial de inventario\"}'),
(62, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4900, 4800, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(63, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 100, 200, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(64, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4800, 4600, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(65, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 200, 400, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(66, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4600, 4500, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(67, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 400, 500, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(68, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4500, 4400, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(69, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 500, 600, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(70, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4400, 4300, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(71, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 600, 700, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(72, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4300, 4200, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(73, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 700, 800, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(74, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4200, 4100, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(75, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 800, 900, '2026-03-10 17:38:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(76, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4100, 4000, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(77, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 900, 1000, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(78, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4000, 3900, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(79, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1000, 1100, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(80, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3900, 3800, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(81, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1100, 1200, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(82, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3800, 3700, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(83, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1200, 1300, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(84, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3700, 3600, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(85, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1300, 1400, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(86, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3600, 3500, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(87, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1400, 1500, '2026-03-10 17:38:06', '{\"motivo\": \"Actualización automática de inventario\"}'),
(88, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3500, 3400, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(89, 14, 19, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-10 19:24:32', '{\"motivo\": \"Registro inicial de inventario\"}'),
(90, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3400, 3300, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(91, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 100, 200, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(92, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3300, 3200, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(93, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 200, 300, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(94, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3200, 3100, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(95, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 300, 400, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(96, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3100, 3000, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(97, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 400, 500, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(98, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3000, 2900, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(99, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 500, 600, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(100, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2900, 2800, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(101, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 600, 700, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(102, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2800, 2700, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(103, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 700, 800, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(104, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2700, 2600, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(105, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 800, 900, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(106, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2600, 2500, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(107, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 900, 1000, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(108, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2500, 2400, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(109, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 1000, 1100, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(110, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2400, 2300, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(111, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 1100, 1200, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(112, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2300, 2200, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(113, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 1200, 1300, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(114, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2200, 2100, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(115, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 1300, 1400, '2026-03-10 19:24:32', '{\"motivo\": \"Actualización automática de inventario\"}'),
(116, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2100, 7100, '2026-03-10 19:30:45', '{\"motivo\": \"Actualización automática de inventario\"}'),
(117, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 7100, 7000, '2026-03-10 19:32:44', '{\"motivo\": \"Actualización automática de inventario\"}'),
(118, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 1400, 1500, '2026-03-10 19:32:44', '{\"motivo\": \"Actualización automática de inventario\"}'),
(119, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 7000, 6900, '2026-03-10 19:32:44', '{\"motivo\": \"Actualización automática de inventario\"}'),
(120, 14, 18, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-10 19:32:44', '{\"motivo\": \"Registro inicial de inventario\"}'),
(121, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 6900, 6800, '2026-03-10 19:32:44', '{\"motivo\": \"Actualización automática de inventario\"}'),
(122, 14, 17, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-10 19:32:44', '{\"motivo\": \"Registro inicial de inventario\"}'),
(123, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 6800, 6750, '2026-03-10 19:40:34', '{\"motivo\": \"Actualización automática de inventario\"}'),
(124, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1500, 1550, '2026-03-10 19:40:34', '{\"motivo\": \"Actualización automática de inventario\"}'),
(125, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 6750, 6650, '2026-03-10 19:40:34', '{\"motivo\": \"Actualización automática de inventario\"}'),
(126, 14, 15, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-10 19:40:34', '{\"motivo\": \"Registro inicial de inventario\"}'),
(127, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 6650, 6630, '2026-03-10 19:40:34', '{\"motivo\": \"Actualización automática de inventario\"}'),
(128, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 1500, 1520, '2026-03-10 19:40:34', '{\"motivo\": \"Actualización automática de inventario\"}'),
(129, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1550, 2100, '2026-03-19 14:48:15', '{\"motivo\": \"Actualización automática de inventario\"}'),
(130, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 2100, 1550, '2026-03-19 14:48:15', '{\"motivo\": \"Actualización automática de inventario\"}'),
(131, 14, 2, 2, 'CREACION_INVENTARIO', 0, 550, '2026-03-19 14:48:15', '{\"motivo\": \"Registro inicial de inventario\"}'),
(132, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 6630, 6530, '2026-03-19 15:35:45', '{\"motivo\": \"Actualización automática de inventario\"}'),
(133, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1550, 1650, '2026-03-19 15:35:45', '{\"motivo\": \"Actualización automática de inventario\"}'),
(152, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1650, 1500, '2026-03-20 19:48:37', '{\"motivo\": \"Actualización automática de inventario\"}'),
(153, 14, 23, 2, 'CREACION_INVENTARIO', 0, 150, '2026-03-20 19:48:37', '{\"motivo\": \"Registro inicial de inventario\"}'),
(154, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 6530, 6400, '2026-03-24 16:13:12', '{\"motivo\": \"Actualización automática de inventario\"}'),
(155, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1500, 1630, '2026-03-24 16:13:12', '{\"motivo\": \"Actualización automática de inventario\"}'),
(156, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 150, 20, '2026-03-24 16:16:53', '{\"motivo\": \"Actualización automática de inventario\"}'),
(157, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1630, 1760, '2026-03-24 16:16:54', '{\"motivo\": \"Actualización automática de inventario\"}'),
(158, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 20, 10, '2026-03-24 16:47:10', '{\"motivo\": \"Actualización automática de inventario\"}'),
(159, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1760, 1770, '2026-03-24 16:47:10', '{\"motivo\": \"Actualización automática de inventario\"}'),
(160, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 10, 2000, '2026-03-24 16:55:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(161, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1770, 1000, '2026-03-24 16:57:27', '{\"motivo\": \"Actualización automática de inventario\"}'),
(162, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 2000, 2770, '2026-03-24 16:57:27', '{\"motivo\": \"Actualización automática de inventario\"}'),
(163, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1000, 230, '2026-03-24 16:57:27', '{\"motivo\": \"Actualización automática de inventario\"}'),
(164, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 2770, 2000, '2026-03-24 17:19:23', '{\"motivo\": \"Actualización automática de inventario\"}'),
(165, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 230, 1000, '2026-03-24 17:19:23', '{\"motivo\": \"Actualización automática de inventario\"}'),
(166, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 6400, 6000, '2026-03-24 17:29:21', '{\"motivo\": \"Actualización automática de inventario\"}'),
(167, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1000, 1400, '2026-03-24 17:29:21', '{\"motivo\": \"Actualización automática de inventario\"}'),
(168, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 2000, 1900, '2026-03-24 17:48:54', '{\"motivo\": \"Actualización automática de inventario\"}'),
(169, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 1400, 1500, '2026-03-24 17:48:54', '{\"motivo\": \"Actualización automática de inventario\"}'),
(170, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1900, 1800, '2026-03-24 18:39:07', '{\"motivo\": \"Actualización automática de inventario\"}'),
(171, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1500, 1600, '2026-03-24 18:39:07', '{\"motivo\": \"Actualización automática de inventario\"}'),
(172, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1800, 1700, '2026-03-24 19:12:26', '{\"motivo\": \"Actualización automática de inventario\"}'),
(173, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1600, 1700, '2026-03-24 19:12:26', '{\"motivo\": \"Actualización automática de inventario\"}'),
(174, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1700, 1650, '2026-03-26 17:59:08', '{\"motivo\": \"Actualización automática de inventario\"}'),
(175, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1700, 1750, '2026-03-26 17:59:08', '{\"motivo\": \"Actualización automática de inventario\"}'),
(176, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1650, 1600, '2026-03-26 18:10:19', '{\"motivo\": \"Actualización automática de inventario\"}'),
(177, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1750, 1800, '2026-03-26 18:10:19', '{\"motivo\": \"Actualización automática de inventario\"}'),
(178, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1600, 1550, '2026-03-26 18:19:27', '{\"motivo\": \"Actualización automática de inventario\"}'),
(179, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1800, 1850, '2026-03-26 18:19:27', '{\"motivo\": \"Actualización automática de inventario\"}'),
(180, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1550, 1500, '2026-03-26 18:21:43', '{\"motivo\": \"Actualización automática de inventario\"}'),
(181, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1850, 1900, '2026-03-26 18:21:43', '{\"motivo\": \"Actualización automática de inventario\"}'),
(182, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1500, 1400, '2026-03-26 20:28:44', '{\"motivo\": \"Actualización automática de inventario\"}'),
(183, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1900, 2000, '2026-03-26 20:28:44', '{\"motivo\": \"Actualización automática de inventario\"}'),
(184, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 2000, 1900, '2026-03-26 20:28:44', '{\"motivo\": \"Actualización automática de inventario\"}'),
(185, 14, 15, 2, 'ACTUALIZACION_INVENTARIO', 100, 0, '2026-03-26 20:28:44', '{\"motivo\": \"Actualización automática de inventario\"}'),
(189, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1400, 1350, '2026-03-26 20:29:52', '{\"motivo\": \"Actualización automática de inventario\"}'),
(190, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1900, 1950, '2026-03-26 20:29:52', '{\"motivo\": \"Actualización automática de inventario\"}'),
(191, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1950, 1900, '2026-03-26 20:29:52', '{\"motivo\": \"Actualización automática de inventario\"}'),
(192, 14, 17, 2, 'ACTUALIZACION_INVENTARIO', 100, 50, '2026-03-26 20:29:52', '{\"motivo\": \"Actualización automática de inventario\"}'),
(193, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 6000, 3000, '2026-03-26 20:31:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(194, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 1900, 4900, '2026-03-26 20:31:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(195, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1350, 1250, '2026-03-26 20:33:47', '{\"motivo\": \"Actualización automática de inventario\"}'),
(196, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 4900, 5000, '2026-03-26 20:33:47', '{\"motivo\": \"Actualización automática de inventario\"}'),
(197, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 5000, 4900, '2026-03-26 20:33:47', '{\"motivo\": \"Actualización automática de inventario\"}'),
(198, 14, 18, 2, 'ACTUALIZACION_INVENTARIO', 100, 0, '2026-03-26 20:33:47', '{\"motivo\": \"Actualización automática de inventario\"}'),
(202, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1250, 1150, '2026-03-27 14:58:24', '{\"motivo\": \"Actualización automática de inventario\"}'),
(203, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 4900, 5000, '2026-03-27 14:58:24', '{\"motivo\": \"Actualización automática de inventario\"}'),
(204, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5000, 4850, '2026-03-27 19:32:05', '{\"motivo\": \"Actualización automática de inventario\"}'),
(205, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 3000, 2000, '2026-03-27 19:41:02', '{\"motivo\": \"Actualización automática de inventario\"}'),
(206, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 4850, 5850, '2026-03-27 19:41:02', '{\"motivo\": \"Actualización automática de inventario\"}'),
(207, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 5850, 5700, '2026-03-31 12:18:13', '{\"motivo\": \"Actualización automática de inventario\"}'),
(209, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5700, 5600, '2026-03-31 19:09:02', '{\"motivo\": \"Actualización automática de inventario\"}'),
(210, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1150, 1050, '2026-03-31 19:49:15', '{\"motivo\": \"Actualización automática de inventario\"}'),
(211, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5600, 5700, '2026-03-31 19:49:15', '{\"motivo\": \"Actualización automática de inventario\"}'),
(212, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5700, 5600, '2026-03-31 19:50:15', '{\"motivo\": \"Actualización automática de inventario\"}'),
(213, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 2000, 6000, '2026-03-31 20:01:43', '{\"motivo\": \"Actualización automática de inventario\"}'),
(214, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 6000, 5900, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(215, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5600, 5700, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(216, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5900, 5800, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(217, 14, 7, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Registro inicial de inventario\"}'),
(218, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5800, 5700, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(219, 14, 8, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Registro inicial de inventario\"}'),
(220, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5700, 5600, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(221, 14, 9, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Registro inicial de inventario\"}'),
(222, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5600, 5500, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(223, 14, 10, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Registro inicial de inventario\"}'),
(224, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5500, 5400, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(225, 14, 11, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Registro inicial de inventario\"}'),
(226, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5400, 5300, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(227, 14, 12, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Registro inicial de inventario\"}'),
(228, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5300, 5200, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(229, 14, 13, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Registro inicial de inventario\"}'),
(230, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5200, 5100, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(231, 14, 14, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Registro inicial de inventario\"}'),
(232, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5100, 5000, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(233, 14, 15, 2, 'ACTUALIZACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(234, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 5000, 4900, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(235, 14, 16, 2, 'CREACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Registro inicial de inventario\"}'),
(236, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4900, 4800, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(237, 14, 17, 2, 'ACTUALIZACION_INVENTARIO', 50, 150, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(238, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4800, 4700, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(239, 14, 18, 2, 'ACTUALIZACION_INVENTARIO', 0, 100, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(240, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4700, 4600, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(241, 14, 19, 2, 'ACTUALIZACION_INVENTARIO', 1520, 1620, '2026-03-31 20:04:38', '{\"motivo\": \"Actualización automática de inventario\"}'),
(242, 14, 17, 2, 'ACTUALIZACION_INVENTARIO', 150, 100, '2026-03-31 20:08:31', '{\"motivo\": \"Actualización automática de inventario\"}'),
(243, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 5700, 5600, '2026-04-01 11:48:18', '{\"motivo\": \"Actualización automática de inventario\"}'),
(244, 14, 5, 2, 'ACTUALIZACION_INVENTARIO', 5600, 5700, '2026-04-01 11:48:18', '{\"motivo\": \"Actualización automática de inventario\"}'),
(245, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5700, 5600, '2026-04-01 11:50:02', '{\"motivo\": \"Actualización automática de inventario\"}'),
(246, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5600, 5700, '2026-04-01 11:50:02', '{\"motivo\": \"Actualización automática de inventario\"}'),
(247, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5700, 5600, '2026-04-01 12:03:23', '{\"motivo\": \"Actualización automática de inventario\"}'),
(248, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1050, 1150, '2026-04-01 12:03:23', '{\"motivo\": \"Actualización automática de inventario\"}'),
(249, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5600, 5500, '2026-04-01 12:04:09', '{\"motivo\": \"Actualización automática de inventario\"}'),
(250, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1150, 1250, '2026-04-01 12:04:09', '{\"motivo\": \"Actualización automática de inventario\"}'),
(251, 14, 1, 2, 'ACTUALIZACION_INVENTARIO', 4600, 4500, '2026-04-01 12:08:02', '{\"motivo\": \"Actualización automática de inventario\"}'),
(252, 14, 5, 3, 'ACTUALIZACION_INVENTARIO', 5500, 5600, '2026-04-01 12:08:02', '{\"motivo\": \"Actualización automática de inventario\"}'),
(253, 14, 7, 2, 'ACTUALIZACION_INVENTARIO', 100, 50, '2026-04-01 12:17:29', '{\"motivo\": \"Actualización automática de inventario\"}'),
(254, 14, 23, 3, 'ACTUALIZACION_INVENTARIO', 1250, 1300, '2026-04-01 12:17:29', '{\"motivo\": \"Actualización automática de inventario\"}');

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
-- Volcado de datos para la tabla `inventario`
--

INSERT INTO `inventario` (`id_inventario`, `id_producto`, `id_bodega`, `cantidad_disponible`, `cantidad_reservada`, `fecha_actualizacion`) VALUES
(52, 14, 1, 4500, 0, '2026-04-01 12:08:02'),
(54, 14, 5, 5600, 0, '2026-04-01 12:08:02'),
(68, 14, 19, 1620, 0, '2026-03-31 20:04:38'),
(84, 14, 18, 100, 0, '2026-03-31 20:04:38'),
(85, 14, 17, 100, 0, '2026-03-31 20:08:31'),
(87, 14, 15, 100, 0, '2026-03-31 20:04:38'),
(90, 14, 2, 550, 0, '2026-03-19 14:48:15'),
(110, 14, 23, 1300, 0, '2026-04-01 12:17:29'),
(135, 14, 7, 50, 0, '2026-04-01 12:17:29'),
(136, 14, 8, 100, 0, '2026-03-31 20:04:38'),
(137, 14, 9, 100, 0, '2026-03-31 20:04:38'),
(138, 14, 10, 100, 0, '2026-03-31 20:04:38'),
(139, 14, 11, 100, 0, '2026-03-31 20:04:38'),
(140, 14, 12, 100, 0, '2026-03-31 20:04:38'),
(141, 14, 13, 100, 0, '2026-03-31 20:04:38'),
(142, 14, 14, 100, 0, '2026-03-31 20:04:38'),
(144, 14, 16, 100, 0, '2026-03-31 20:04:38');

--
-- Disparadores `inventario`
--
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

--
-- Volcado de datos para la tabla `movimientos`
--

INSERT INTO `movimientos` (`id_movimiento`, `id_producto`, `id_bodega_origen`, `id_bodega_destino`, `id_usuario_responsable`, `fecha_movimiento`, `tipo_movimiento`, `cantidad`, `observaciones`, `estado_movimiento`) VALUES
(48, 14, NULL, 1, 2, '2026-03-09 19:50:31', 'ENTRADA', 5000, 'PPCCI070001040', 'COMPLETADO'),
(49, 14, 1, 5, 2, '2026-03-10 16:12:12', 'ENTRADA', 1000, 'PPCCI070001040', 'COMPLETADO'),
(50, 14, 1, 5, 2, '2026-03-10 16:52:53', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(51, 14, 1, 5, 2, '2026-03-10 17:38:05', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(52, 14, 1, 5, 2, '2026-03-10 17:38:05', 'ENTRADA', 200, 'PPCCI070001040', 'COMPLETADO'),
(53, 14, 1, 5, 2, '2026-03-10 17:38:05', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(54, 14, 1, 5, 2, '2026-03-10 17:38:05', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(55, 14, 1, 5, 2, '2026-03-10 17:38:05', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(56, 14, 1, 5, 2, '2026-03-10 17:38:05', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(57, 14, 1, 5, 2, '2026-03-10 17:38:05', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(58, 14, 1, 5, 2, '2026-03-10 17:38:06', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(59, 14, 1, 5, 2, '2026-03-10 17:38:06', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(60, 14, 1, 5, 2, '2026-03-10 17:38:06', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(61, 14, 1, 5, 2, '2026-03-10 17:38:06', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(62, 14, 1, 5, 2, '2026-03-10 17:38:06', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(63, 14, 1, 5, 2, '2026-03-10 17:38:06', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(64, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(65, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(66, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(67, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(68, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(69, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(70, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(71, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(72, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(73, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(74, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(75, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(76, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(77, 14, 1, 19, 2, '2026-03-10 19:24:32', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(78, 14, NULL, 1, 2, '2026-03-10 19:30:45', 'ENTRADA', 5000, 'PPCCI070001040', 'COMPLETADO'),
(79, 14, 1, 19, 2, '2026-03-10 19:32:44', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(80, 14, 1, 18, 2, '2026-03-10 19:32:44', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(81, 14, 1, 17, 2, '2026-03-10 19:32:44', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(82, 14, 1, 5, 2, '2026-03-10 19:40:34', 'ENTRADA', 50, 'PPCCI070001040', 'COMPLETADO'),
(83, 14, 1, 15, 2, '2026-03-10 19:40:34', 'ENTRADA', 100, 'PPCCI070001040', 'COMPLETADO'),
(84, 14, 1, 19, 2, '2026-03-10 19:40:34', 'ENTRADA', 20, 'PPCCI070001040', 'COMPLETADO'),
(85, 14, 23, 5, 3, '2026-03-19 14:48:15', '', 550, ' CI070001040', 'COMPLETADO'),
(86, 14, 1, 5, 2, '2026-03-19 15:35:45', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(87, 14, 5, 23, 3, '2026-03-20 19:48:37', '', 150, 'Pruebas PPGCI070001040', 'COMPLETADO'),
(88, 14, 1, 5, 2, '2026-03-24 16:13:12', 'ENTRADA', 130, ' PPCCI070001040', 'COMPLETADO'),
(89, 14, 23, 5, 3, '2026-03-24 16:16:54', '', 130, ' PPGCI070001040', 'COMPLETADO'),
(90, 14, 23, 5, 3, '2026-03-24 16:47:10', '', 10, 'PPG PPGCI070001040', 'COMPLETADO'),
(91, 14, 5, 23, 3, '2026-03-24 16:57:27', '', 770, ' PPGCI070001040', 'COMPLETADO'),
(92, 14, 23, 5, 3, '2026-03-24 17:19:23', '', 770, ' PPGCI070001040', 'COMPLETADO'),
(93, 14, 1, 5, 2, '2026-03-24 17:29:21', 'ENTRADA', 400, ' PPCCI070001040', 'COMPLETADO'),
(94, 14, 23, 5, 3, '2026-03-24 17:48:54', '', 100, ' PPGCI070001040', 'COMPLETADO'),
(95, 14, 23, 5, 3, '2026-03-24 18:39:07', '', 100, ' PPGCI070001040', 'COMPLETADO'),
(96, 14, 23, 5, 3, '2026-03-24 19:12:26', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(97, 14, 23, 5, 3, '2026-03-26 17:59:08', 'COMPLETO', 50, ' PPGCI070001040', 'COMPLETADO'),
(98, 14, 23, 5, 3, '2026-03-26 18:10:19', 'COMPLETO', 50, ' PPGCI070001040', 'COMPLETADO'),
(99, 14, 23, 5, 3, '2026-03-26 18:19:27', 'COMPLETO', 50, ' PPGCI070001040', 'COMPLETADO'),
(100, 14, 23, 5, 3, '2026-03-26 18:21:43', 'COMPLETO', 50, ' PPGCI070001040', 'COMPLETADO'),
(101, 14, 23, 5, 3, '2026-03-26 20:28:44', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(102, 14, 23, 5, 3, '2026-03-26 20:29:52', 'COMPLETO', 50, ' PPGCI070001040', 'COMPLETADO'),
(103, 14, 1, 5, 2, '2026-03-26 20:31:05', 'ENTRADA', 3000, ' PPCCI070001040', 'COMPLETADO'),
(104, 14, 23, 5, 3, '2026-03-26 20:33:47', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(105, 14, 23, 5, 3, '2026-03-27 14:55:02', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(106, 14, 23, 5, 3, '2026-03-27 14:58:24', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(107, 14, 23, 5, 3, '2026-03-27 19:32:05', 'COMPLETO', 150, ' PPGCI070001040', 'COMPLETADO'),
(108, 14, 1, 5, 2, '2026-03-27 19:41:02', 'PROCESO', 1000, ' PPCCI070001040', 'COMPLETADO'),
(109, 14, 23, 5, 3, '2026-03-31 12:18:13', 'COMPLETO', 150, ' PPGCI070001040', 'COMPLETADO'),
(110, 14, 23, 5, 3, '2026-03-31 19:09:02', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(111, 14, 23, 5, 3, '2026-03-31 19:49:15', 'COMPLETO', 100, '', 'COMPLETADO'),
(112, 14, 23, 5, 3, '2026-03-31 19:50:15', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(113, 14, NULL, 1, 2, '2026-03-31 20:01:43', 'ENTRADA', 4000, 'PPCCI070001040', 'COMPLETADO'),
(114, 14, 1, 5, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(115, 14, 1, 7, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(116, 14, 1, 8, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(117, 14, 1, 9, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(118, 14, 1, 10, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(119, 14, 1, 11, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(120, 14, 1, 12, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(121, 14, 1, 13, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(122, 14, 1, 14, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(123, 14, 1, 15, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(124, 14, 1, 16, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(125, 14, 1, 17, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(126, 14, 1, 18, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(127, 14, 1, 19, 2, '2026-03-31 20:04:38', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(128, 14, 23, 17, 3, '2026-03-31 20:08:31', 'COMPLETO', 50, ' PPGCI070001040', 'COMPLETADO'),
(129, 14, 23, 5, 3, '2026-04-01 11:48:18', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(130, 14, 23, 5, 3, '2026-04-01 11:50:02', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(131, 14, 23, 5, 3, '2026-04-01 12:03:23', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(132, 14, 23, 5, 3, '2026-04-01 12:04:09', 'COMPLETO', 100, ' PPGCI070001040', 'COMPLETADO'),
(133, 14, 1, 5, 2, '2026-04-01 12:08:02', 'ENTRADA', 100, ' PPCCI070001040', 'COMPLETADO'),
(134, 14, 23, 7, 3, '2026-04-01 12:17:29', 'COMPLETO', 50, ' PPGCI070001040', 'COMPLETADO');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permisos_bodegas`
--

CREATE TABLE `permisos_bodegas` (
  `id_permiso` int(11) NOT NULL,
  `id_usuario` int(11) DEFAULT NULL,
  `id_bodega` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `permisos_bodegas`
--

INSERT INTO `permisos_bodegas` (`id_permiso`, `id_usuario`, `id_bodega`) VALUES
(1, 2, 5),
(2, 2, 7),
(3, 2, 8),
(4, 2, 9),
(5, 2, 10),
(6, 2, 11),
(7, 2, 12),
(8, 2, 13),
(9, 2, 14),
(10, 2, 15),
(11, 2, 16),
(12, 2, 17),
(13, 2, 18),
(14, 2, 19),
(31, 3, 5),
(32, 3, 7),
(33, 3, 8),
(34, 3, 9),
(35, 3, 10),
(36, 3, 11),
(37, 3, 12),
(38, 3, 13),
(39, 3, 14),
(40, 3, 15),
(41, 3, 16),
(42, 3, 17),
(43, 3, 18),
(44, 3, 19);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `productos`
--

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
(14, 'CI070001040', '', 'ACTIVO', '2026-03-09 19:50:24');

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

--
-- Volcado de datos para la tabla `sesiones_escaneo`
--

INSERT INTO `sesiones_escaneo` (`id_sesion`, `id_bodega`, `id_usuario`, `fecha_inicio`, `fecha_fin`, `estado`, `total_productos`, `observaciones`) VALUES
(19, 1, 2, '2026-03-09 19:48:17', '2026-03-09 19:50:31', 'FINALIZADA', 1, NULL),
(20, 1, 2, '2026-03-10 19:30:32', '2026-03-10 19:30:45', 'FINALIZADA', 1, NULL),
(21, 1, 2, '2026-03-31 20:01:23', '2026-03-31 20:01:43', 'FINALIZADA', 1, NULL);

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
(3, 23, 'pepe', 'pepito@gmail.com', '$2b$10$XrxJnSDA.129cA1ZdjWFJ.NJC/ywdRMqWe/i94UVW8Z4etC4zdg3i', 'SUPERVISOR', 'ACTIVO', '2026-01-14 19:43:54'),
(4, 5, 'sandra', 'guarnecidadproceso@calzado70.com', '$2b$10$9DDhzr9fRvy2fbnjZi5vq.r0pjWWHUEuE2KSYSy7363iws6XtKDCa', 'SUPERVISOR', 'ACTIVO', '2026-03-09 19:54:17');

-- --------------------------------------------------------

--
-- Estructura Stand-in para la vista `vista_inventario_con_observacion`
-- (Véase abajo para la vista actual)
--
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
  MODIFY `id_bodega` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `detalles_escaneo`
--
ALTER TABLE `detalles_escaneo`
  MODIFY `id_detalle` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=26;

--
-- AUTO_INCREMENT de la tabla `historial`
--
ALTER TABLE `historial`
  MODIFY `id_historial` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=255;

--
-- AUTO_INCREMENT de la tabla `inventario`
--
ALTER TABLE `inventario`
  MODIFY `id_inventario` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=154;

--
-- AUTO_INCREMENT de la tabla `movimientos`
--
ALTER TABLE `movimientos`
  MODIFY `id_movimiento` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=135;

--
-- AUTO_INCREMENT de la tabla `permisos_bodegas`
--
ALTER TABLE `permisos_bodegas`
  MODIFY `id_permiso` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT de la tabla `productos`
--
ALTER TABLE `productos`
  MODIFY `id_producto` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT de la tabla `sesiones_escaneo`
--
ALTER TABLE `sesiones_escaneo`
  MODIFY `id_sesion` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

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
