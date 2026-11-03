create type private.education_level as enum (
  'nursery',
  'kindergarten',
  'primary',
  'lower_secondary',
  'upper_secondary',
  'university'
);

comment on type private.education_level is 'Education levels of a school unit; kindergarten, primary, lower_secondary and upper_secondary count in the SmartCheck education score.';
