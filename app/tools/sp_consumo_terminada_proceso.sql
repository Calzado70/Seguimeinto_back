DROP PROCEDURE IF EXISTS `sp_consumo_terminada_proceso`;

DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_consumo_terminada_proceso`(
    IN `p_id_bodega_origen` INT,
    IN `p_id_bodega_destino` INT,
    IN `p_codigo_producto` VARCHAR(50),
    IN `p_cantidad` INT,
    IN `p_id_usuario` INT,
    IN `p_observaciones` TEXT,
    OUT `p_mensaje` VARCHAR(255)
)
BEGIN
    DECLARE v_id_producto INT DEFAULT NULL;
    DECLARE v_cantidad_disponible INT DEFAULT 0;
    DECLARE v_user_exists INT DEFAULT 0;
    DECLARE v_error_message TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        SET p_mensaje = CONCAT('Error SQL: ', v_error_message);
        ROLLBACK;
    END;

    START TRANSACTION;

    -- 1. VALIDAR USUARIO
    SELECT COUNT(*) INTO v_user_exists
    FROM usuarios
    WHERE id_usuario = p_id_usuario;

    IF v_user_exists = 0 THEN
        SET p_mensaje = 'Usuario no existe';
        ROLLBACK;

    ELSE
        -- 2. OBTENER PRODUCTO
        SELECT id_producto INTO v_id_producto
        FROM productos
        WHERE codigo = p_codigo_producto
        AND estado = 'ACTIVO'
        LIMIT 1;

        IF v_id_producto IS NULL THEN
            SET p_mensaje = 'Producto no encontrado';
            ROLLBACK;

        ELSE
            -- 3. VALIDAR STOCK EN ORIGEN (TERMINADA PROCESO)
            SELECT IFNULL(cantidad_disponible, 0) INTO v_cantidad_disponible
            FROM inventario
            WHERE id_producto = v_id_producto
            AND id_bodega = p_id_bodega_origen
            FOR UPDATE;

            IF v_cantidad_disponible < p_cantidad THEN
                SET p_mensaje = 'Stock insuficiente en Terminada Proceso';
                ROLLBACK;

            ELSE
                -- 4. DESCONTAR ORIGEN
                UPDATE inventario
                SET cantidad_disponible = cantidad_disponible - p_cantidad,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id_producto = v_id_producto
                AND id_bodega = p_id_bodega_origen;

                -- 5. SUMAR DESTINO (TERMINADA COMPLETO)
                INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
                VALUES (v_id_producto, p_id_bodega_destino, p_cantidad)
                ON DUPLICATE KEY UPDATE
                    cantidad_disponible = cantidad_disponible + p_cantidad,
                    fecha_actualizacion = CURRENT_TIMESTAMP;

                -- 6. REGISTRAR MOVIMIENTO
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
                    CONCAT(IFNULL(p_observaciones, ''), ' PPT', p_codigo_producto)
                );

                SET p_mensaje = 'Consumo a Terminada Completo realizado correctamente';
                COMMIT;

            END IF;
        END IF;
    END IF;

END$$

DELIMITER ;