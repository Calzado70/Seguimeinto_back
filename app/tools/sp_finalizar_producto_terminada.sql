DROP PROCEDURE IF EXISTS `sp_finalizar_producto_terminada`;

DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_finalizar_producto_terminada`(
    IN `p_id_producto` INT,
    IN `p_codigo_final` VARCHAR(50),
    IN `p_caracteristica` VARCHAR(50),
    IN `p_cantidad` INT,
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
    DECLARE v_cantidad_disponible INT DEFAULT 0;
    DECLARE v_error_message TEXT DEFAULT '';

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        GET DIAGNOSTICS CONDITION 1 v_error_message = MESSAGE_TEXT;
        SET p_mensaje = CONCAT('Error SQL: ', v_error_message);
        ROLLBACK;
    END;

    START TRANSACTION;

    -- 1. Validar stock en bodega de consumo
    SELECT cantidad_disponible INTO v_cantidad_disponible
    FROM inventario
    WHERE id_producto = p_id_producto
      AND id_bodega = p_bodega_consumo
    FOR UPDATE;

    IF IFNULL(v_cantidad_disponible, 0) < p_cantidad THEN
        SET p_mensaje = CONCAT('Stock insuficiente en bodega ', p_bodega_consumo);
        ROLLBACK;

    ELSE
        -- 2. Restar de bodega de consumo
        UPDATE inventario
        SET cantidad_disponible = cantidad_disponible - p_cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP
        WHERE id_producto = p_id_producto
          AND id_bodega = p_bodega_consumo;

        -- 3. Determinar producto destino
        IF p_crear_producto_nuevo = 1 THEN
            -- Buscar o crear producto nuevo con caracteristica
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
            -- Mantener el mismo producto original
            SET v_id_producto_destino = p_id_producto;
        END IF;

        -- 4. Sumar a bodega destino
        INSERT INTO inventario (id_producto, id_bodega, cantidad_disponible)
        VALUES (v_id_producto_destino, p_bodega_destino, p_cantidad)
        ON DUPLICATE KEY UPDATE
            cantidad_disponible = cantidad_disponible + p_cantidad,
            fecha_actualizacion = CURRENT_TIMESTAMP;

        -- 5. Registrar movimiento
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

END$$

DELIMITER ;
