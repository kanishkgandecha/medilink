UPDATE "User"
SET "subRole" = 'Radiology Technician'::"SubRole"
WHERE "email" = 'radiology@medilink.com';

UPDATE "User"
SET "subRole" = 'Billing Staff'::"SubRole"
WHERE "email" = 'billing@medilink.com';
