DO $$
DECLARE
  v_class_id INTEGER;
BEGIN
  SELECT id INTO v_class_id FROM "Class" WHERE link = '9HnBjqjw';

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Turma não encontrada — verifique se o link está correto';
  END IF;

  INSERT INTO "_ClassStudents" ("A", "B")
  SELECT v_class_id, u.id
  FROM "User" u
  WHERE u.role = 'STUDENT'
  AND NOT EXISTS (
    SELECT 1 FROM "_ClassStudents" cs WHERE cs."B" = u.id
  );

  RAISE NOTICE 'Alunos matriculados: %',
    (SELECT COUNT(*) FROM "_ClassStudents" WHERE "A" = v_class_id);
END $$;
