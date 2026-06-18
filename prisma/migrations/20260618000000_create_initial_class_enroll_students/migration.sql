DO $$
DECLARE
  v_class_id INTEGER;
  v_owner_id INTEGER;
BEGIN
  SELECT id INTO v_owner_id FROM "User" WHERE email = 'laisadsilva.pereira@gmail.com';

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner não encontrado — faça login antes de rodar esta migration';
  END IF;

  INSERT INTO "Class" (name, link, "ownerId", "createdAt", "updatedAt")
  VALUES ('Alunos MVP 2026.1', '9HnBjqjw', v_owner_id, NOW(), NOW())
  RETURNING id INTO v_class_id;

  INSERT INTO "_ClassStudents" ("A", "B")
  SELECT v_class_id, u.id
  FROM "User" u
  WHERE u.role = 'STUDENT'
  AND NOT EXISTS (
    SELECT 1 FROM "_ClassStudents" cs WHERE cs."B" = u.id
  );

  RAISE NOTICE 'Turma criada id=%, alunos matriculados=%',
    v_class_id,
    (SELECT COUNT(*) FROM "_ClassStudents" WHERE "A" = v_class_id);
END $$;
