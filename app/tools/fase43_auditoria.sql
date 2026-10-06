-- ============================================================
-- Fase 4.3 — Auditoría (ver PLAN_MEJORAS.md, sección 4.3)
--
-- Backup previo: C:\Users\praccontabilidad\Desktop\Control de Piso\
--                 betrost_backup_2026-10-05.sql
--   (mysqldump --routines --triggers betrost)
--
-- Por qué una tabla nueva y no `historial`:
--   historial tiene id_producto, id_bodega e id_usuario NOT NULL con
--   claves ajenas. Un evento como "se creó el usuario X" no tiene
--   producto ni bodega que referenciar, y el
--   sp_consultar_historial_movimientos hace INNER JOIN productos, que
--   descartaría igualmente esas filas.
--
-- Por qué id_usuario es anulable y se guarda también el nombre:
--   las claves ajenas de historial son RESTRICT y hoy ya impiden borrar
--   4 usuarios con historial. Si auditoria obligara a id_usuario, la
--   auditoría de una baja se volvería contradictoria: registrarías la
--   baja de un usuario que nunca podrías eliminar.
--   ON DELETE SET NULL + el nombre en el momento del hecho resuelve eso.
-- ============================================================

CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria  INT AUTO_INCREMENT PRIMARY KEY,
    tabla         VARCHAR(64)  NOT NULL COMMENT 'tabla o dominio afectado',
    accion        VARCHAR(32)  NOT NULL COMMENT 'CREAR|MODIFICAR|ELIMINAR|CAMBIAR_ESTADO',
    id_registro   INT          NULL     COMMENT 'PK de la fila afectada',
    id_usuario    INT          NULL     COMMENT 'quién lo hizo; NULL si ya no existe',
    usuario       VARCHAR(150) NULL     COMMENT 'nombre del actor en el momento del hecho',
    ip            VARCHAR(45)  NULL     COMMENT 'IPv4 o IPv6 del cliente',
    user_agent    VARCHAR(512) NULL,
    datos_antes   JSON         NULL,
    datos_despues JSON         NULL,
    fecha         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_auditoria_fecha (fecha),
    INDEX idx_auditoria_tabla (tabla, accion),
    INDEX idx_auditoria_usuario (id_usuario),
    CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario)
        ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- ============================================================
-- Triggers de inventario: el fallback de identidad.
--
-- Bug original: el usuario se deducía del último movimiento del producto.
-- Si no lo había (o era NULL) el trigger no registraba nada, y así se
-- perdían movimientos en silencio. Además el orden empeora el problema:
-- los SP hacen UPDATE/INSERT sobre inventario ANTES de insertar la fila
-- en movimientos, así que el trigger mira un movimiento que aún no existe.
--
-- Fix: si la deducción falla, se usa @app_user, que la app fija en la
-- conexión dedicada justo antes del CALL. Se comprueba que el usuario
-- exista: una variable de sesión corrupta no debe romper la escritura
-- de inventario, que es lógica crítica.
-- ============================================================

DROP TRIGGER IF EXISTS tr_inventario_historial;
DROP TRIGGER IF EXISTS tr_inventario_historial_insert;

DELIMITER $$

CREATE TRIGGER tr_inventario_historial
AFTER UPDATE ON inventario
FOR EACH ROW
BEGIN
    DECLARE v_id_usuario INT;

    SELECT id_usuario_responsable
    INTO v_id_usuario
    FROM movimientos
    WHERE id_producto = NEW.id_producto
      AND (id_bodega_origen = NEW.id_bodega OR id_bodega_destino = NEW.id_bodega)
    ORDER BY fecha_movimiento DESC
    LIMIT 1;

    IF v_id_usuario IS NULL THEN
        SET v_id_usuario = NULLIF(@app_user, 0);
    END IF;

    IF v_id_usuario IS NOT NULL
       AND EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = v_id_usuario) THEN
        INSERT INTO historial (
            id_producto, id_bodega, id_usuario, accion,
            cantidad_anterior, cantidad_nueva, detalles
        ) VALUES (
            NEW.id_producto, NEW.id_bodega, v_id_usuario,
            'ACTUALIZACION_INVENTARIO',
            OLD.cantidad_disponible, NEW.cantidad_disponible,
            JSON_OBJECT('motivo', 'Actualización automática de inventario')
        );
    END IF;
END$$

CREATE TRIGGER tr_inventario_historial_insert
AFTER INSERT ON inventario
FOR EACH ROW
BEGIN
    DECLARE v_id_usuario INT;

    SELECT id_usuario_responsable
    INTO v_id_usuario
    FROM movimientos
    WHERE id_producto = NEW.id_producto
    ORDER BY fecha_movimiento DESC
    LIMIT 1;

    IF v_id_usuario IS NULL THEN
        SET v_id_usuario = NULLIF(@app_user, 0);
    END IF;

    IF v_id_usuario IS NOT NULL
       AND EXISTS (SELECT 1 FROM usuarios WHERE id_usuario = v_id_usuario) THEN
        INSERT INTO historial (
            id_producto, id_bodega, id_usuario, accion,
            cantidad_anterior, cantidad_nueva, detalles
        ) VALUES (
            NEW.id_producto, NEW.id_bodega, v_id_usuario,
            'CREACION_INVENTARIO',
            0, NEW.cantidad_disponible,
            JSON_OBJECT('motivo', 'Registro inicial de inventario')
        );
    END IF;
END$$

DELIMITER ;
