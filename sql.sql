CREATE TABLE history
(
  id serial PRIMARY KEY,
  user_id text,
  nickname text,
  room text,
  text text,
  "timestamp" bigint
)