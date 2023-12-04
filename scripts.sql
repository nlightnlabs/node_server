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
	"role",
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