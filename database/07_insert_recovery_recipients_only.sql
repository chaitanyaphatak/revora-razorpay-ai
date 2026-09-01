-- =============================================================================
-- ReVora: Add all 12 Customers to recovery_recipients
-- Safe INSERT using WHERE NOT EXISTS (No ON CONFLICT constraints needed)
-- =============================================================================

create table if not exists public.recovery_recipients (
  customer_id text primary key,
  customer_name text not null,
  customer_email text not null,
  phone text,
  updated_at timestamptz default now()
);

insert into public.recovery_recipients (customer_id, customer_name, customer_email)
select v.customer_id, v.customer_name, v.customer_email
from (values
  ('C-94281', 'Rahul Sharma', 'rahul.sharma@example.com'),
  ('C-81934', 'Priya Patel', 'priya.patel@example.com'),
  ('C-44102', 'Amit Verma', 'amit.verma@example.com'),
  ('C-88324', 'Sneha Kulkarni', 'sneha.kulkarni@example.com'),
  ('C-33912', 'Rohan Mehta', 'rohan.mehta@example.com'),
  ('C-67240', 'Ananya Iyer', 'ananya.iyer@example.com'),
  ('C-19453', 'Vikram Malhotra', 'vikram.malhotra@example.com'),
  ('C-48291', 'Pooja Deshmukh', 'pooja.deshmukh@example.com'),
  ('C-90214', 'Rajesh Nair', 'rajesh.nair@example.com'),
  ('C-71839', 'Neha Choudhury', 'neha.choudhury@example.com'),
  ('C-62910', 'Aditya Reddy', 'aditya.reddy@example.com'),
  ('C-84021', 'Simran Kaur', 'simran.kaur@example.com')
) as v(customer_id, customer_name, customer_email)
where not exists (
  select 1 from public.recovery_recipients r where r.customer_id = v.customer_id
);

-- View inserted recipients
select customer_id, customer_name, customer_email, updated_at from public.recovery_recipients;
