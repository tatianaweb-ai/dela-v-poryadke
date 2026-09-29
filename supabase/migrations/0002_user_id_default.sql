-- Исправление: значение по умолчанию для user_id.
--
-- В первой версии колонка была not null, но без default. Клиент user_id не
-- передаёт намеренно (иначе он мог бы записать чужой), поэтому каждая вставка
-- падала с нарушением NOT NULL: данные появлялись на экране за счёт
-- оптимистичного обновления, но в базу не попадали и исчезали после перезагрузки.
--
-- Повторный запуск безопасен: set default идемпотентен.

alter table public.projects alter column user_id set default auth.uid();
alter table public.tasks alter column user_id set default auth.uid();
