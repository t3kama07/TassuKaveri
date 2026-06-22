begin;

update public.profiles
set
  phone_number = '',
  phone_verified = false,
  phone_verification_code = null,
  phone_verification_expires = null,
  trust_score = greatest(trust_score - case when phone_verified then 20 else 0 end, 0),
  updated_at = now()
where
  phone_number <> ''
  or phone_verified = true
  or phone_verification_code is not null
  or phone_verification_expires is not null;

update public.public_profiles
set
  phone_verified = false,
  trust_score = greatest(trust_score - 20, 0),
  updated_at = now()
where phone_verified = true;

commit;
