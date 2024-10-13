-- create user table
CREATE TABLE "users" (
    id BIGSERIAL NOT NULL PRIMARY KEY,
    first_name VARCHAR(50) NOT NULL, 
	last_name VARCHAR(50) NOT NULL, 
	full_name VARCHAR(50), 
	company VARCHAR(50), 
	"role" VARCHAR(50),
	business_unit VARCHAR(50),
	"access" VARCHAR(50),
	mobile_phone BIGINT, 
	email VARCHAR(50) NOT NULL, 
	pwd VARCHAR(255) NOT NULL,
	created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT email_unique UNIQUE (email)
);


-- ********************************************************************************************************
---ALERNATE USER TABLE:
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL
);

ALTER TABLE users
ADD COLUMN created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN pwd VARCHAR(255),
ADD CONSTRAINT email_unique UNIQUE (email);


-- Be sure to install PG crypto
CREATE EXTENSION pgcrypto;

-- Create a Function for Password Hashing
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

--CREATE A function for when to trigger
CREATE OR REPLACE FUNCTION hash_password_trigger()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.pwd := hash_password(NEW.pwd);
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.pwd := hash_password(NEW.pwd);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set up the Trigger
CREATE TRIGGER encrypt_password_trigger
BEFORE INSERT OR UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION hash_password_trigger();


-- ********************************************************************************************************
-- Assing unique field afterward table is created:
ALTER TABLE users
ADD CONSTRAINT email_unique UNIQUE (email);

CREATE SEQUENCE user_id_sequence
  start 100000001
  increment 1;

-- Add user into user table
INSERT into "users" (
	first_name, 
	last_name, 
	full_name, 
	company, 
	"job_title",
	business_unit,
	"access",
	mobile_phone, 
	email,
	pwd
) 
VALUES (
	'Solution',
	'Manager', 
	'Solution Manager',
	'nlightn labs',
	'Product Development',
	'Research and Development',
	'Super Admin',
	9493754042, 
	'solutions@nlightnlabs.com', 
crypt('Smlightn03$3', gen_salt('bf')));

-- check password
select (
    (select pwd from "users" where email='avik.ghosh@nlightnlabs.com') =
    crypt(
      'Agnlightn03$3',
      (select pwd from "users" where email='avik.ghosh@nlightnlabs.com')
    )
  ) as matched;

--   update record
UPDATE table_name
SET column1 = value1,
    column2 = value2,
    ...
WHERE condition;


-- update multiple records
update users
set company = 'nlightn labs, Inc.'
where
	first_name in ('Avik' , 'Solution' , 'Admin' , 'Test');

-- show columns
SELECT column_name, data_type
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = N'users'