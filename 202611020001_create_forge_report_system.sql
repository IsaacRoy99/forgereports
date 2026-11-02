CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  site TEXT NOT NULL,
  CONSTRAINT uq_department_site UNIQUE (name, site)
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'DepartmentHead',
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  project_title TEXT NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  submitted_by_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  project_status TEXT NOT NULL,
  project_summary TEXT NOT NULL,
  challenges TEXT NOT NULL,
  next_steps TEXT NOT NULL,
  importance TEXT NOT NULL,
  due_date DATE NOT NULL,
  reporting_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  review_status TEXT NOT NULL DEFAULT 'Pending',
  admin_feedback TEXT,
  attachment_file_name TEXT,
  attachment_file_path TEXT
);

INSERT INTO departments (name, site) VALUES
 ('Academics','Bloemfontein'),
 ('Academics','Clearwater'),
 ('Construct','Clearwater'),
 ('Consult','Clearwater'),
 ('EXCO','Clearwater'),
 ('Finance','Clearwater'),
 ('FNC','Northern Campus'),
 ('HR & Payroll','Clearwater'),
 ('IT/Ozone','Clearwater'),
 ('Studios','Clearwater'),
 ('Talent','Clearwater'),
 ('Compliance','Underberg')
ON CONFLICT (name, site) DO NOTHING;

INSERT INTO users (full_name,email,role,department_id)
SELECT seed.full_name, seed.email, seed.role, d.id
FROM (VALUES
 ('Jane Oosthuizen','jane@forgeacademy.co.za','DepartmentHead','Academics','Bloemfontein'),
 ('Disebo Mokoena','disebo@forgeacademy.co.za','DepartmentHead','Academics','Clearwater'),
 ('Keegan Abdul','keegan@forgeacademy.co.za','DepartmentHead','Construct','Clearwater'),
 ('Ali Muhammed','Ali@forgeacademy.co.za','DepartmentHead','Construct','Clearwater'),
 ('Lilian Mathuntuta','lilian@forgeacademy.co.za','DepartmentHead','Consult','Clearwater'),
 ('Tariq Shurmah','tariq@forgeacademy.co.za','DepartmentHead','EXCO','Clearwater'),
 ('Craig Clutty','craig@forgeacademy.co.za','DepartmentHead','EXCO','Clearwater'),
 ('Lauren Theron','lauren@forgeacademy.co.za','DepartmentHead','EXCO','Clearwater'),
 ('Kishanry Chetty','kishanry@forgeacademy.co.za','DepartmentHead','Finance','Clearwater'),
 ('Linda Earl','linda@forgeacademy.co.za','DepartmentHead','Finance','Clearwater'),
 ('Francis Olusola','francis@forgeacademy.co.za','DepartmentHead','FNC','Northern Campus'),
 ('Wayne Lardner','wayne@forgeacademy.co.za','DepartmentHead','FNC','Northern Campus'),
 ('Charmain Lardner','charmain@forgeacademy.co.za','DepartmentHead','FNC','Northern Campus'),
 ('Lezel Ruth Scholtz','lezel@forgeacademy.co.za','DepartmentHead','HR & Payroll','Clearwater'),
 ('Jabulani Mashimbye','jabu@forgeacademy.co.za','DepartmentHead','IT/Ozone','Clearwater'),
 ('Michael Van Der Westhuizen','michael@forgeacademy.co.za','DepartmentHead','Studios','Clearwater'),
 ('Renoo Shurmah','renoo@forgeacademy.co.za','DepartmentHead','Talent','Clearwater'),
 ('Kayleen Lutchman','kayleen@forgeacademy.co.za','DepartmentHead','Talent','Clearwater'),
 ('Des Webster','des@forgeacademy.co.za','DepartmentHead','FNC','Northern Campus'),
 ('Olga-Jane Ackerman','olga@forgeacademy.co.za','DepartmentHead','Compliance','Underberg'),
 ('System Administrator','admin@forgeacademy.co.za','Admin','EXCO','Clearwater')
) AS seed(full_name,email,role,department_name,site)
JOIN departments d ON d.name=seed.department_name AND d.site=seed.site
ON CONFLICT (email) DO NOTHING;
