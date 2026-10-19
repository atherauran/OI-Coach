alter table attempts alter column hints_left set default 2;

update attempts
set hints_left = least(hints_left, greatest(0, 2 - jsonb_array_length(hinted)))
where status = 'active';
