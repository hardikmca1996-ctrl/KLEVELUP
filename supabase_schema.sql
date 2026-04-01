-- Tuition Management System Schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Roles Enum
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles table (can exist independently or link to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'student',
  must_change_password BOOLEAN NOT NULL DEFAULT true,
  password_changed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add columns if they don't exist (for existing tables)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'must_change_password') THEN
        ALTER TABLE profiles ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'password_changed_at') THEN
        ALTER TABLE profiles ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 3. Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  qualification TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure teachers table has all required columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'qualification') THEN
        ALTER TABLE teachers ADD COLUMN qualification TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'class_id') THEN
        ALTER TABLE teachers ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 5. Students table
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  class TEXT,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure students table has all required columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'class') THEN
        ALTER TABLE students ADD COLUMN class TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'class_id') THEN
        ALTER TABLE students ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'phone') THEN
        ALTER TABLE students ADD COLUMN phone TEXT;
    END IF;
END $$;

-- 6. Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Ensure subjects table has all required columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'teacher_id') THEN
        ALTER TABLE subjects ADD COLUMN teacher_id UUID REFERENCES teachers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'class_id') THEN
        ALTER TABLE subjects ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add subject_id to teachers after subjects table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'teachers' AND column_name = 'subject_id') THEN
        ALTER TABLE teachers ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(student_id, subject_id)
);

-- 6. Lectures table
CREATE TABLE IF NOT EXISTS lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 7. Attendance table
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  lecture_id UUID REFERENCES lectures(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('present', 'absent')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(student_id, lecture_id)
);

-- 8. Exams table
CREATE TABLE IF NOT EXISTS exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  total_marks INTEGER NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 9. Results table
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id UUID REFERENCES exams(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  marks_obtained INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(exam_id, student_id)
);

-- 10. Notes table
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE NOT NULL,
  teacher_id UUID REFERENCES teachers(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 11. Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_role public.user_role;
BEGIN
  -- Determine role safely
  IF NEW.email = 'hardik.mca1996@gmail.com' THEN
    new_role := 'admin'::public.user_role;
  ELSIF NEW.raw_user_meta_data->>'role' = 'admin' THEN
    new_role := 'admin'::public.user_role;
  ELSIF NEW.raw_user_meta_data->>'role' = 'teacher' THEN
    new_role := 'teacher'::public.user_role;
  ELSE
    new_role := 'student'::public.user_role;
  END IF;

  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    new_role
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Best effort: if profile creation fails, still allow user creation
  -- The frontend will handle profile creation via upsert
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. RLS Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'teacher'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'student'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins have full access to profiles" ON profiles FOR ALL USING (is_admin());

-- Teachers Policies
DROP POLICY IF EXISTS "Teachers are viewable by everyone" ON teachers;
DROP POLICY IF EXISTS "Admins have full access to teachers" ON teachers;
CREATE POLICY "Teachers are viewable by everyone" ON teachers FOR SELECT USING (true);
CREATE POLICY "Admins have full access to teachers" ON teachers FOR ALL USING (is_admin());

-- Students Policies
DROP POLICY IF EXISTS "Students are viewable by everyone" ON students;
DROP POLICY IF EXISTS "Admins have full access to students" ON students;
CREATE POLICY "Students are viewable by everyone" ON students FOR SELECT USING (true);
CREATE POLICY "Admins have full access to students" ON students FOR ALL USING (is_admin());

-- Classes Policies
DROP POLICY IF EXISTS "Classes are viewable by everyone" ON classes;
DROP POLICY IF EXISTS "Admins have full access to classes" ON classes;
CREATE POLICY "Classes are viewable by everyone" ON classes FOR SELECT USING (true);
CREATE POLICY "Admins have full access to classes" ON classes FOR ALL USING (is_admin());

-- Subjects Policies
DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON subjects;
DROP POLICY IF EXISTS "Admins have full access to subjects" ON subjects;
CREATE POLICY "Subjects are viewable by everyone" ON subjects FOR SELECT USING (true);
CREATE POLICY "Admins have full access to subjects" ON subjects FOR ALL USING (is_admin());

-- Lectures Policies
DROP POLICY IF EXISTS "Lectures are viewable by everyone" ON lectures;
DROP POLICY IF EXISTS "Admins have full access to lectures" ON lectures;
DROP POLICY IF EXISTS "Teachers can manage their own lectures" ON lectures;
CREATE POLICY "Lectures are viewable by everyone" ON lectures FOR SELECT USING (true);
CREATE POLICY "Admins have full access to lectures" ON lectures FOR ALL USING (is_admin());
CREATE POLICY "Teachers can manage their own lectures" ON lectures FOR ALL USING (
  teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
);

-- Attendance Policies
DROP POLICY IF EXISTS "Attendance viewable by admins, teachers, and own student" ON attendance;
DROP POLICY IF EXISTS "Teachers can manage attendance" ON attendance;
CREATE POLICY "Attendance viewable by admins, teachers, and own student" ON attendance FOR SELECT USING (
  is_admin() OR
  EXISTS (SELECT 1 FROM teachers WHERE profile_id = auth.uid()) OR
  student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
);
CREATE POLICY "Teachers can manage attendance" ON attendance FOR ALL USING (
  is_admin() OR
  EXISTS (SELECT 1 FROM teachers WHERE profile_id = auth.uid())
);

-- Exams Policies
DROP POLICY IF EXISTS "Exams viewable by everyone" ON exams;
DROP POLICY IF EXISTS "Admins have full access to exams" ON exams;
DROP POLICY IF EXISTS "Teachers can manage their own exams" ON exams;
CREATE POLICY "Exams viewable by everyone" ON exams FOR SELECT USING (true);
CREATE POLICY "Admins have full access to exams" ON exams FOR ALL USING (is_admin());
CREATE POLICY "Teachers can manage their own exams" ON exams FOR ALL USING (
  teacher_id IN (SELECT id FROM teachers WHERE profile_id = auth.uid())
);

-- Results Policies
DROP POLICY IF EXISTS "Results viewable by admins, teachers, and own student" ON results;
DROP POLICY IF EXISTS "Teachers can manage results" ON results;
CREATE POLICY "Results viewable by admins, teachers, and own student" ON results FOR SELECT USING (
  is_admin() OR
  EXISTS (SELECT 1 FROM teachers WHERE profile_id = auth.uid()) OR
  student_id IN (SELECT id FROM students WHERE profile_id = auth.uid())
);
CREATE POLICY "Teachers can manage results" ON results FOR ALL USING (
  is_admin() OR
  EXISTS (SELECT 1 FROM teachers WHERE profile_id = auth.uid())
);

-- Notes Policies
DROP POLICY IF EXISTS "Notes viewable by admins, teachers, and students in class" ON notes;
DROP POLICY IF EXISTS "Teachers can manage their own notes" ON notes;
CREATE POLICY "Notes viewable by admins, teachers, and students in class" ON notes FOR SELECT USING (
  is_admin() OR
  EXISTS (SELECT 1 FROM teachers WHERE profile_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM students WHERE profile_id = auth.uid() AND class_id = notes.class_id)
);
CREATE POLICY "Teachers can manage their own notes" ON notes FOR ALL USING (
  is_admin() OR
  EXISTS (SELECT 1 FROM teachers WHERE profile_id = auth.uid() AND id = notes.teacher_id)
);

-- 11. Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  author_role TEXT NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE, -- if null, for everyone
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Announcements Policies
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Announcements are viewable by everyone" ON announcements;
DROP POLICY IF EXISTS "Admins and teachers can manage announcements" ON announcements;
CREATE POLICY "Announcements are viewable by everyone" ON announcements FOR SELECT USING (true);
CREATE POLICY "Admins and teachers can manage announcements" ON announcements FOR ALL USING (
  is_admin() OR is_teacher()
);

-- 12. Storage Setup (Run this in the SQL Editor to create the bucket)
-- Note: This might require manual setup in the Supabase Dashboard if SQL access to storage is restricted.
INSERT INTO storage.buckets (id, name, public)
VALUES ('notes', 'notes', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for storage
-- We use a DO block to check if policies exist before creating them to avoid errors
DO $$
BEGIN
    -- Public Access Policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Public Access'
    ) THEN
        CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'notes');
    END IF;

    -- Authenticated Upload Policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Authenticated Upload'
    ) THEN
        CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notes' AND auth.role() = 'authenticated');
    END IF;

    -- Owner Delete Policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'Owner Delete'
    ) THEN
        CREATE POLICY "Owner Delete" ON storage.objects FOR DELETE USING (bucket_id = 'notes' AND auth.uid() = owner);
    END IF;
END
$$;
