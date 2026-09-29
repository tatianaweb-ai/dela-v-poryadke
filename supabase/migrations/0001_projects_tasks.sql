-- Проекты и задачи.
--
-- Пользователями занимается Supabase Auth, поэтому отдельной таблицы users
-- нет: user_id сразу ссылается на auth.users(id). Идентификатор пользователя
-- подставляет сама база — из сессии, которую выдал Supabase.
--
-- Правила доступа (RLS) написаны так, что человек физически не может увидеть
-- или изменить чужую строку, даже если подставит чужой id в запрос вручную.

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  -- default auth.uid() — обязателен: клиент не передаёт user_id, иначе вставка
  -- падала бы на NOT NULL. Подставляет сервер, поэтому подделать чужой id
  -- невозможно даже вручную.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  -- Дата без времени: «к пятнице» здесь не хранится.
  deadline date,
  done boolean not null default false,
  created_at timestamptz not null default now(),
  -- Заполняется при отметке «сделано» и остаётся, если задачу reopened.
  completed_at timestamptz
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_project_id_idx on public.tasks (project_id);

-- Индексы: база ищет задачи по владельцу и по проекту на каждом открытии,
-- без них это последовательный просмотр всей таблицы.

alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Читать и менять можно только свои строки. auth.uid() возвращает id того,
-- кто сейчас вошёл; для неавторизованного посетителя он равен null, поэтому
-- анонимно не проходит ни одно из правил ниже.

-- Политики создаём через drop + create: так файл можно выполнить повторно.
-- Раньше повторный запуск падал с ошибкой «policy already exists».

drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;
drop policy if exists "tasks_select_own" on public.tasks;
drop policy if exists "tasks_insert_own" on public.tasks;
drop policy if exists "tasks_update_own" on public.tasks;
drop policy if exists "tasks_delete_own" on public.tasks;

create policy "projects_select_own" on public.projects
  for select to authenticated using (auth.uid() = user_id);

create policy "projects_insert_own" on public.projects
  for insert to authenticated with check (auth.uid() = user_id);

create policy "projects_update_own" on public.projects
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "projects_delete_own" on public.projects
  for delete to authenticated using (auth.uid() = user_id);

create policy "tasks_select_own" on public.tasks
  for select to authenticated using (auth.uid() = user_id);

create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check (auth.uid() = user_id);

create policy "tasks_update_own" on public.tasks
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using (auth.uid() = user_id);

-- Каскад (on delete cascade) при удалении проекта выполняет сама база в обход
-- правил, поэтому отдельной политики для «удалить проект вместе с задачами»
-- не требуется: достаточно удалить сам проект.
