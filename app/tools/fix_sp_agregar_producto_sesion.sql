DROP PROCEDURE IF EXISTS `sp_agregar_producto_sesion`;

DELIMITER $$

CREATE DEFINER=`root`@`localhost` PROCEDURE `sp_agregar_producto_sesion`(IN `p_id_sesion` INT, IN `p_codigo_producto` VARCHAR(50), IN `p_cantidad` INT, OUT `p_mensaje` VARCHAR(255))
BEGIN
    DECLARE v_id_producto INT DEFAULT 0;
    DECLARE v_estado_sesion VARCHAR(20);
    DECLARE v_cantidad_actual INT DEFAULT 0;
    DECLARE v_producto_inactivo INT DEFAULT 0;
    
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_mensaje = 'Error al agregar producto a la sesión';
    END;

    START TRANSACTION;
    
    SELECT estado INTO v_estado_sesion
    FROM sesiones_escaneo 
    WHERE id_sesion = p_id_sesion;
    
    IF v_estado_sesion != 'ACTIVA' THEN
        SET p_mensaje = 'La sesión no está activa';
        ROLLBACK;
    ELSE
        -- Buscar el producto activo
        SELECT id_producto INTO v_id_producto
        FROM productos 
        WHERE codigo = p_codigo_producto AND estado = 'ACTIVO';
        
        IF v_id_producto = 0 THEN
            -- Existe pero está inactivo: reactivarlo
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
                -- No existe: crearlo automáticamente
                INSERT INTO productos (codigo, caracteristica, estado, fecha_creacion)
                VALUES (p_codigo_producto, '', 'ACTIVO', NOW());
                
                SET v_id_producto = LAST_INSERT_ID();
            END IF;
        END IF;
        
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
END$$

DELIMITER ;