-- ============================================================
-- FIX: triggers de historial tolerantes a usuario NULL
-- Motivo: al crear inventario de un producto sin movimientos
-- previos, los triggers insertaban historial con id_usuario NULL
-- y la insercion fallaba ("Column 'id_usuario' cannot be null").
-- ============================================================

DROP TRIGGER IF EXISTS `tr_inventario_historial`;

DELIMITER $$

CREATE DEFINER=`root`@`localhost` TRIGGER `tr_inventario_historial` AFTER UPDATE ON `inventario` FOR EACH ROW BEGIN
    DECLARE v_id_usuario INT;

    SELECT id_usuario_responsable
    INTO v_id_usuario
    FROM movimientos
    WHERE id_producto = NEW.id_producto
      AND (id_bodega_origen = NEW.id_bodega OR id_bodega_destino = NEW.id_bodega)
    ORDER BY fecha_movimiento DESC
    LIMIT 1;

    IF v_id_usuario IS NOT NULL THEN
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
    END IF;
END$$

DROP TRIGGER IF EXISTS `tr_inventario_historial_insert`;

CREATE DEFINER=`root`@`localhost` TRIGGER `tr_inventario_historial_insert` AFTER INSERT ON `inventario` FOR EACH ROW BEGIN
    DECLARE v_id_usuario INT;

    SELECT id_usuario_responsable
    INTO v_id_usuario
    FROM movimientos
    WHERE id_producto = NEW.id_producto
    ORDER BY fecha_movimiento DESC
    LIMIT 1;

    IF v_id_usuario IS NOT NULL THEN
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
    END IF;
END$$

DELIMITER ;
