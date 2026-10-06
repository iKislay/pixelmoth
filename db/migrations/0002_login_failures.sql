-- Failed dashboard logins, used to slow down password guessing.
CREATE TABLE login_failures (
  ip TEXT NOT NULL,
  ts INTEGER NOT NULL
);
CREATE INDEX login_failures_ip ON login_failures (ip, ts);
