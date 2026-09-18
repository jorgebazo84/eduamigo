
-- Insertar Recompensas por defecto
INSERT INTO rewards (id, title, points_cost, icon) VALUES 
(UUID(), '30 min de Consola', 500, '🎮'),
(UUID(), 'Cena de Pizza', 1000, '🍕'),
(UUID(), 'Un Helado Gigante', 300, '🍦'),
(UUID(), 'Ir al Cine', 1500, '🎬'),
(UUID(), 'Día sin Deberes', 2000, '✨');

-- Insertar un niño de ejemplo (Opcional, se puede añadir desde la app)
-- INSERT INTO children (id, name, avatar, points, grade, country, streak_current, streak_last_active, streak_multiplier) VALUES 
-- ('demo-child-1', 'Hugo', '👦', 150, '4º Primaria', 'España', 1, UNIX_TIMESTAMP()*1000, 1.0);
