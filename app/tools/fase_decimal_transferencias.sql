-- =====================================================================
-- fase_decimal_transferencias.sql
-- Convierte las cantidades de inventario a DECIMAL(10,1) para permitir
-- media unidad (0.5 = una lengua de zapato; 2 lenguas = 1 par).
-- Respaldo previo: betrost_backup_2026-10-19_decimal.sql
-- =====================================================================
USE betrost;

SET @OLD_FK = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- 1) Columnas de cantidad a DECIMAL(10,1)
ALTER TABLE `inventario` MODIFY COLUMN `cantidad_disponible` DECIMAL(10,1) NULL DEFAULT 0;
ALTER TABLE `inventario` MODIFY COLUMN `cantidad_reservada` DECIMAL(10,1) NULL DEFAULT 0;
ALTER TABLE `movimientos` MODIFY COLUMN `cantidad` DECIMAL(10,1) NOT NULL;
ALTER TABLE `historial` MODIFY COLUMN `cantidad_anterior` DECIMAL(10,1) NULL DEFAULT NULL;
ALTER TABLE `historial` MODIFY COLUMN `cantidad_nueva` DECIMAL(10,1) NULL DEFAULT NULL;
ALTER TABLE `detalles_escaneo` MODIFY COLUMN `cantidad_escaneada` DECIMAL(10,1) NOT NULL;

-- 2) SP sp_ajustar_inventario (p_cantidad / variables decimales)
DROP PROCEDURE IF EXISTS `sp_ajustar_inventario`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_ajustar_inventario`(IN `p_id_bodega` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_nueva_cantidad` DECIMAL(10,1), IN `p_id_usuario` INT, IN `p_motivo` TEXT, OUT `p_mensaje` VARCHAR(255))
BEGIN
    DECLARE v_id_producto INT DEFAULT 0;
    DECLARE v_cantidad_anterior DECIMAL(10,1) DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al ajustar inventario';
    END;

    START TRANSACTION;
    
    
    SELECT id_producto INTO v_id_producto
    FROM productos 
    WHERE codigo = p_codigo_producto AND estado = 'ACTIVO';
    
    IF v_id_producto = 0 THEN
        SET p_mensaje = 'Producto no encontrado';
        ROLLBACK;
    ELSE
        
        SELECT IFNULL(cantidad_disponible, 0) INTO v_cantidad_anterior
        FROM inventario 
        WHERE id_producto = v_id_producto AND id_bodega = p_id_bodega;
        
        
        INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
        VALUES (v_id_producto, p_id_bodega, p_nueva_cantidad)
        ON DUPLICATE KEY UPDATE 
            cantidad_disponible = p_nueva_cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP;
        
        
        INSERT INTO movimientos (id_producto, id_bodega_destino, id_usuario_responsable, 
                               tipo_movimiento, cantidad, observaciones)
        VALUES (v_id_producto, p_id_bodega, p_id_usuario, 'AJUSTE', 
               p_nueva_cantidad - v_cantidad_anterior, p_motivo);
        
        SET p_mensaje = CONCAT('Inventario ajustado. Anterior: ', v_cantidad_anterior, ', Nuevo: ', p_nueva_cantidad);
        COMMIT;
    END IF;
END ;;
DELIMITER ;

-- 2) SP sp_consumo_logistica (p_cantidad / variables decimales)
DROP PROCEDURE IF EXISTS `sp_consumo_logistica`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consumo_logistica`(
    IN `p_id_bodega_origen` INT,
    IN `p_id_bodega_destino` INT,
    IN `p_codigo_producto` VARCHAR(50),
    IN `p_cantidad` DECIMAL(10,1),
    IN `p_id_usuario` INT,
    IN `p_observaciones` TEXT,
    OUT `p_mensaje` VARCHAR(255)
)
BEGIN
    DECLARE v_id_producto INT DEFAULT NULL;
    DECLARE v_cantidad_disponible DECIMAL(10,1) DEFAULT 0;
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE v_error_message TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        SET p_mensaje = CONCAT('Error SQL: ', v_error_message);
        ROLLBACK;
    END;

    START TRANSACTION;

    
    SELECT COUNT(*) INTO v_user_exists
    FROM usuarios
    WHERE id_usuario = p_id_usuario;

    IF v_user_exists = 0 THEN
        SET p_mensaje = 'Usuario no existe';
        ROLLBACK;

    ELSE
        
        SELECT id_producto INTO v_id_producto
        FROM productos
        WHERE codigo = p_codigo_producto
        AND estado = 'ACTIVO'
        LIMIT 1;

        IF v_id_producto IS NULL THEN
            SET p_mensaje = 'Producto no encontrado';
            ROLLBACK;

        ELSE
            
            SELECT IFNULL(cantidad_disponible, 0) INTO v_cantidad_disponible
            FROM inventario
            WHERE id_producto = v_id_producto
            AND id_bodega = p_id_bodega_origen
            FOR UPDATE;

            IF v_cantidad_disponible < p_cantidad THEN
                SET p_mensaje = 'Stock insuficiente en Terminada Completo';
                ROLLBACK;

            ELSE
                
                UPDATE inventario
                SET cantidad_disponible = cantidad_disponible - p_cantidad,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id_producto = v_id_producto
                AND id_bodega = p_id_bodega_origen;

                
                INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
                VALUES (v_id_producto, p_id_bodega_destino, p_cantidad)
                ON DUPLICATE KEY UPDATE
                    cantidad_disponible = cantidad_disponible + p_cantidad,
                    fecha_actualizacion = CURRENT_TIMESTAMP;

                
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
                    'ENTRADA',
                    p_cantidad,
                    CONCAT(IFNULL(p_observaciones, ''), ' PPT', p_codigo_producto)
                );

                SET p_mensaje = 'Consumo realizado correctamente';
                COMMIT;

            END IF;
        END IF;
    END IF;

END ;;
DELIMITER ;

-- 2) SP sp_consumo_terminada_proceso (p_cantidad / variables decimales)
DROP PROCEDURE IF EXISTS `sp_consumo_terminada_proceso`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consumo_terminada_proceso`(IN `p_id_bodega_origen` INT, IN `p_id_bodega_destino` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_cantidad` DECIMAL(10,1), IN `p_id_usuario` INT, IN `p_observaciones` TEXT, OUT `p_mensaje` VARCHAR(255))
BEGIN

    DECLARE v_id_producto INT DEFAULT NULL;

    DECLARE v_cantidad_disponible DECIMAL(10,1) DEFAULT 0;

    DECLARE v_user_exists INT DEFAULT 0;

    DECLARE v_error_message TEXT DEFAULT '';



    DECLARE EXIT HANDLER FOR SQLEXCEPTION

    BEGIN

        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;

        SET p_mensaje = CONCAT('Error SQL: ', v_error_message);

        ROLLBACK;

    END;



    START TRANSACTION;



    

    SELECT COUNT(*) INTO v_user_exists

    FROM usuarios

    WHERE id_usuario = p_id_usuario;



    IF v_user_exists = 0 THEN

        SET p_mensaje = 'Usuario no existe';

        ROLLBACK;



    ELSE

        

        SELECT id_producto INTO v_id_producto

        FROM productos

        WHERE codigo = p_codigo_producto

        AND estado = 'ACTIVO'

        LIMIT 1;



        IF v_id_producto IS NULL THEN

            SET p_mensaje = 'Producto no encontrado';

            ROLLBACK;



        ELSE

            

            SELECT IFNULL(cantidad_disponible, 0) INTO v_cantidad_disponible

            FROM inventario

            WHERE id_producto = v_id_producto

            AND id_bodega = p_id_bodega_origen

            FOR UPDATE;



            IF v_cantidad_disponible < p_cantidad THEN

                SET p_mensaje = 'Stock insuficiente en Terminada Proceso';

                ROLLBACK;



            ELSE

                

                UPDATE inventario

                SET cantidad_disponible = cantidad_disponible - p_cantidad,

                    fecha_actualizacion = CURRENT_TIMESTAMP

                WHERE id_producto = v_id_producto

                AND id_bodega = p_id_bodega_origen;



                

                INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)

                VALUES (v_id_producto, p_id_bodega_destino, p_cantidad)

                ON DUPLICATE KEY UPDATE

                    cantidad_disponible = cantidad_disponible + p_cantidad,

                    fecha_actualizacion = CURRENT_TIMESTAMP;



                

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

                    'COMPLETO',

                    p_cantidad,

                    CONCAT(IFNULL(p_observaciones, ''))

                );



                SET p_mensaje = 'Consumo a Terminada Completo realizado correctamente';

                COMMIT;



            END IF;

        END IF;

    END IF;



END ;;
DELIMITER ;

-- 2) SP sp_finalizar_producto_terminada (p_cantidad / variables decimales)
DROP PROCEDURE IF EXISTS `sp_finalizar_producto_terminada`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_finalizar_producto_terminada`(
    IN `p_id_producto` INT,
    IN `p_codigo_final` VARCHAR(50),
    IN `p_caracteristica` VARCHAR(50),
    IN `p_cantidad` DECIMAL(10,1),
    IN `p_bodega_consumo` INT,
    IN `p_bodega_destino` INT,
    IN `p_id_usuario` INT,
    IN `p_tipo_movimiento` ENUM('ENTRADA','PROCESO','COMPLETO'),
    IN `p_observaciones` TEXT,
    IN `p_crear_producto_nuevo` TINYINT,
    OUT `p_mensaje` VARCHAR(255)
)
BEGIN
    DECLARE v_id_producto_destino INT DEFAULT NULL;
    DECLARE v_cantidad_disponible DECIMAL(10,1) DEFAULT 0;
    DECLARE v_error_message TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        SET p_mensaje = CONCAT('Error SQL: ', v_error_message);
        ROLLBACK;
    END;

    START TRANSACTION;

    
    SELECT cantidad_disponible INTO v_cantidad_disponible
    FROM inventario
    WHERE id_producto = p_id_producto
      AND id_bodega = p_bodega_consumo
    FOR UPDATE;

    IF IFNULL(v_cantidad_disponible, 0) < p_cantidad THEN
        SET p_mensaje = CONCAT('Stock insuficiente en bodega ', p_bodega_consumo);
        ROLLBACK;

    ELSE
        
        UPDATE inventario
        SET cantidad_disponible = cantidad_disponible - p_cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_producto = p_id_producto
          AND id_bodega = p_bodega_consumo;

        
        IF p_crear_producto_nuevo = 1 THEN
            
            SELECT id_producto INTO v_id_producto_destino
            FROM productos
            WHERE codigo = p_codigo_final
            LIMIT 1;

            IF v_id_producto_destino IS NULL THEN
                INSERT INTO productos (codigo, caracteristica, estado)
                VALUES (p_codigo_final, TRIM(p_caracteristica), 'ACTIVO');
                SET v_id_producto_destino = LAST_INSERT_ID();
            ELSE
                UPDATE productos
                SET caracteristica = TRIM(p_caracteristica),
                    estado = 'ACTIVO'
                WHERE id_producto = v_id_producto_destino;
            END IF;
        ELSE
            
            SET v_id_producto_destino = p_id_producto;

            
            IF TRIM(p_caracteristica) <> '' THEN
                UPDATE productos
                SET caracteristica = TRIM(p_caracteristica),
                    estado = 'ACTIVO'
                WHERE id_producto = v_id_producto_destino;
            END IF;
        END IF;

        
        INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
        VALUES (v_id_producto_destino, p_bodega_destino, p_cantidad)
        ON DUPLICATE KEY UPDATE
            cantidad_disponible = cantidad_disponible + p_cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP;

        
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
            p_id_producto,
            p_bodega_consumo,
            p_bodega_destino,
            p_id_usuario,
            p_tipo_movimiento,
            p_cantidad,
            p_observaciones
        );

        SET p_mensaje = CONCAT('OK - Codigo: ', p_codigo_final);
        COMMIT;

    END IF;

END ;;
DELIMITER ;

-- 2) SP sp_transferir_productos (p_cantidad / variables decimales)
DROP PROCEDURE IF EXISTS `sp_transferir_productos`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_transferir_productos`(IN `p_id_bodega_origen` INT, IN `p_id_bodega_destino` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_cantidad` DECIMAL(10,1), IN `p_id_usuario` INT, IN `p_observaciones` TEXT, IN `p_tipo_movimiento` ENUM('ENTRADA','PROCESO','COMPLETO'), OUT `p_mensaje` VARCHAR(255))
main: BEGIN

    DECLARE v_id_producto INT DEFAULT NULL;

    DECLARE v_cantidad_disponible DECIMAL(10,1) DEFAULT 0;

    DECLARE v_error_message TEXT DEFAULT '';



    DECLARE EXIT HANDLER FOR SQLEXCEPTION

    BEGIN

        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;

        SET p_mensaje = CONCAT('Error SQL: ', v_error_message);

        ROLLBACK;

    END;



    SET p_mensaje = NULL;



    START TRANSACTION;



    SELECT id_producto

    INTO v_id_producto

    FROM productos

    WHERE codigo = p_codigo_producto

      AND estado = 'ACTIVO'

    LIMIT 1;



    IF v_id_producto IS NULL THEN

        SET p_mensaje = 'Producto no encontrado';

        ROLLBACK;

        LEAVE main;

    END IF;



    IF p_tipo_movimiento IN ('COMPLETO', 'PROCESO')

       AND p_id_bodega_origen IN (23, 2, 21, 6, 25) THEN



        SET v_cantidad_disponible = 0;



        SELECT cantidad_disponible

        INTO v_cantidad_disponible

        FROM inventario

        WHERE id_producto = v_id_producto

          AND id_bodega = p_id_bodega_destino

        FOR UPDATE;



        IF IFNULL(v_cantidad_disponible, 0) < p_cantidad THEN

            SET p_mensaje = 'Stock insuficiente en bodega destino';

            ROLLBACK;

            LEAVE main;

        END IF;



        UPDATE inventario

        SET cantidad_disponible = cantidad_disponible - p_cantidad,

            fecha_actualizacion = CURRENT_TIMESTAMP

        WHERE id_producto = v_id_producto

          AND id_bodega = p_id_bodega_destino;



        INSERT INTO inventario (

            id_producto,

            id_bodega,

            cantidad_disponible

        )

        VALUES (

            v_id_producto,

            p_id_bodega_origen,

            p_cantidad

        )

        ON DUPLICATE KEY UPDATE

            cantidad_disponible = cantidad_disponible + p_cantidad,

            fecha_actualizacion = CURRENT_TIMESTAMP;



    ELSE



        SET v_cantidad_disponible = 0;



        SELECT cantidad_disponible

        INTO v_cantidad_disponible

        FROM inventario

        WHERE id_producto = v_id_producto

          AND id_bodega = p_id_bodega_origen

        FOR UPDATE;



        IF IFNULL(v_cantidad_disponible, 0) < p_cantidad THEN

            SET p_mensaje = 'Stock insuficiente en origen';

            ROLLBACK;

            LEAVE main;

        END IF;



        UPDATE inventario

        SET cantidad_disponible = cantidad_disponible - p_cantidad,

            fecha_actualizacion = CURRENT_TIMESTAMP

        WHERE id_producto = v_id_producto

          AND id_bodega = p_id_bodega_origen;



        INSERT INTO inventario (

            id_producto,

            id_bodega,

            cantidad_disponible

        )

        VALUES (

            v_id_producto,

            p_id_bodega_destino,

            p_cantidad

        )

        ON DUPLICATE KEY UPDATE

            cantidad_disponible = cantidad_disponible + p_cantidad,

            fecha_actualizacion = CURRENT_TIMESTAMP;



    END IF;



    IF NOT (p_tipo_movimiento = 'COMPLETO' AND p_id_bodega_origen = 23) THEN



        IF p_id_bodega_destino = 23

           AND p_tipo_movimiento = 'COMPLETO' THEN



            SET v_cantidad_disponible = 0;



            SELECT cantidad_disponible

            INTO v_cantidad_disponible

            FROM inventario

            WHERE id_producto = v_id_producto

              AND id_bodega = 5

            FOR UPDATE;



            IF IFNULL(v_cantidad_disponible, 0) < p_cantidad THEN

                SET p_mensaje = 'Stock insuficiente en Guarnecida Proceso';

                ROLLBACK;

                LEAVE main;

            END IF;



            UPDATE inventario

            SET cantidad_disponible = cantidad_disponible - p_cantidad,

                fecha_actualizacion = CURRENT_TIMESTAMP

            WHERE id_producto = v_id_producto

              AND id_bodega = 5;



        END IF;



        IF p_id_bodega_destino = 21

           AND p_tipo_movimiento = 'COMPLETO' THEN



            SET v_cantidad_disponible = 0;



            SELECT cantidad_disponible

            INTO v_cantidad_disponible

            FROM inventario

            WHERE id_producto = v_id_producto

              AND id_bodega = 2

            FOR UPDATE;



            IF IFNULL(v_cantidad_disponible, 0) < p_cantidad THEN

                SET p_mensaje = 'Stock insuficiente en Montaje Proceso';

                ROLLBACK;

                LEAVE main;

            END IF;



            UPDATE inventario

            SET cantidad_disponible = cantidad_disponible - p_cantidad,

                fecha_actualizacion = CURRENT_TIMESTAMP

            WHERE id_producto = v_id_producto

              AND id_bodega = 2;



            SET v_cantidad_disponible = 0;



            SELECT cantidad_disponible

            INTO v_cantidad_disponible

            FROM inventario

            WHERE id_producto = v_id_producto

              AND id_bodega = 23

            FOR UPDATE;



            IF IFNULL(v_cantidad_disponible, 0) < p_cantidad THEN

                SET p_mensaje = 'Stock insuficiente en Guarnecida Completo';

                ROLLBACK;

                LEAVE main;

            END IF;



            UPDATE inventario

            SET cantidad_disponible = cantidad_disponible - p_cantidad,

                fecha_actualizacion = CURRENT_TIMESTAMP

            WHERE id_producto = v_id_producto

              AND id_bodega = 23;



        END IF;



    END IF;



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

        p_observaciones

    );



    IF p_tipo_movimiento = 'COMPLETO' AND p_id_bodega_origen = 23 THEN

        SET p_mensaje = 'Consumo realizado correctamente';

    ELSE

        SET p_mensaje = 'Transferencia realizada correctamente';

    END IF;



    COMMIT;

END ;;
DELIMITER ;

-- 2) SP sp_agregar_producto_sesion (p_cantidad / variables decimales)
DROP PROCEDURE IF EXISTS `sp_agregar_producto_sesion`;
DELIMITER ;;
CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_agregar_producto_sesion`(IN `p_id_sesion` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_cantidad` DECIMAL(10,1), OUT `p_mensaje` VARCHAR(255))
BEGIN
    DECLARE v_id_producto INT DEFAULT 0;
    DECLARE v_estado_sesion VARCHAR(20);
    DECLARE v_cantidad_actual DECIMAL(10,1) DEFAULT 0;
    DECLARE v_producto_inactivo INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al agregar producto a la sesi??n';
    END;

    START TRANSACTION;
    
    SELECT estado INTO v_estado_sesion
    FROM sesiones_escaneo 
    WHERE id_sesion = p_id_sesion;
    
    IF v_estado_sesion != 'ACTIVA' THEN
        SET p_mensaje = 'La sesi??n no est?? activa';
        ROLLBACK;
    ELSE
        
        SELECT id_producto INTO v_id_producto
        FROM productos 
        WHERE codigo = p_codigo_producto AND estado = 'ACTIVO';
        
        IF v_id_producto = 0 THEN
            
            SELECT COUNT(*) INTO v_producto_inactivo
            FROM productos
            WHERE codigo = p_codigo_producto AND estado = 'INACTIVO';
            
            IF v_producto_inactivo > 0 THEN
                UPDATE productos
                SET estado = 'ACTIVO'
                WHERE codigo = p_codigo_producto;
                
                SELECT id_producto INTO v_id_producto
                FROM productos
                WHERE codigo = p_codigo_producto;
            ELSE
                
                INSERT INTO productos (codigo, caracteristica, estado, fecha_creacion)
                VALUES (p_codigo_producto, '', 'ACTIVO', NOW());
                
                SET v_id_producto = LAST_INSERT_ID();
            END IF;
        END IF;
        
        
        SELECT IFNULL(cantidad_escaneada, 0) INTO v_cantidad_actual
        FROM detalles_escaneo 
        WHERE id_sesion = p_id_sesion AND id_producto = v_id_producto;
        
        IF v_cantidad_actual > 0 THEN
            
            UPDATE detalles_escaneo 
            SET cantidad_escaneada = cantidad_escaneada + p_cantidad,
                fecha_escaneo = CURRENT_TIMESTAMP
            WHERE id_sesion = p_id_sesion AND id_producto = v_id_producto;
        ELSE
            
            INSERT INTO detalles_escaneo (id_sesion, id_producto, cantidad_escaneada)
            VALUES (p_id_sesion, v_id_producto, p_cantidad);
        END IF;
        
        SET p_mensaje = 'Producto agregado correctamente';
        COMMIT;
    END IF;
END ;;
DELIMITER ;

SET FOREIGN_KEY_CHECKS = @OLD_FK;
