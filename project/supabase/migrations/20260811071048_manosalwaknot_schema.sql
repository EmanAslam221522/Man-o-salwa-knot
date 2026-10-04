/*
# ManOSalwaKnot - Real-Time Food Rescue Marketplace

## Overview
Creates the full schema for a food-rescue marketplace where restaurants post surplus
food, individuals/NGOs discover it on a live map, an AI chatbot helps match needs,
and transactions + ratings build trust.

## New Tables
1. `profiles` - extends auth.users with marketplace data (name, role, location, tier, rating).
   - role: restaurant | hostel | individual
   - tier: free | prime | ngo
2. `food_posts` - surplus food listings posted by restaurants.
   - status: available | reserved | sold | expired
3. `transactions` - completed buys/sells with commission + rating.
4. `ratings` - 1-5 star reviews left after transactions.
5. `chat_messages` - chatbot conversation history per user.

## Security
- RLS enabled on every table.
- profiles: each authenticated user reads all profiles (needed to see sellers),
  updates only their own.
- food_posts: readable by all authenticated (marketplace browsing); insert/update/delete
  only by the owner.
- transactions: readable by buyer or seller; insert by buyer; update by buyer.
- ratings: readable by all; insert by the giver; update/delete by giver.
- chat_messages: readable only by owner; insert by owner.

## Notes
- Owner columns default to auth.uid() so client inserts omitting user_id still pass RLS.
- All tables use gen_random_uuid() primary keys.
*/

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'individual' CHECK (role IN ('restaurant','hostel','individual')),
  phone text,
  location_text text,
  lat double precision,
  lng double precision,
  tier text NOT NULL DEFAULT 'free' CHECK (tier IN ('free','prime','ngo')),
  avatar_url text,
  rating numeric(3,2) NOT NULL DEFAULT 0,
  rating_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- food_posts
CREATE TABLE IF NOT EXISTS food_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  quantity numeric(10,2) NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  price numeric(10,2) NOT NULL,
  original_price numeric(10,2),
  expiry_time timestamptz,
  lat double precision,
  lng double precision,
  location_text text,
  photo_url text,
  description text,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','sold','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE food_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_posts_select_all" ON food_posts;
CREATE POLICY "food_posts_select_all" ON food_posts FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "food_posts_insert_own" ON food_posts;
CREATE POLICY "food_posts_insert_own" ON food_posts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_posts_update_own" ON food_posts;
CREATE POLICY "food_posts_update_own" ON food_posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_posts_delete_own" ON food_posts;
CREATE POLICY "food_posts_delete_own" ON food_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS food_posts_status_idx ON food_posts(status);
CREATE INDEX IF NOT EXISTS food_posts_created_idx ON food_posts(created_at DESC);

-- transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  food_id uuid REFERENCES food_posts(id) ON DELETE SET NULL,
  food_name text,
  amount numeric(10,2) NOT NULL,
  commission numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash','upi','card')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','completed','cancelled')),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transactions_select_party" ON transactions;
CREATE POLICY "transactions_select_party" ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "transactions_insert_buyer" ON transactions;
CREATE POLICY "transactions_insert_buyer" ON transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "transactions_update_buyer" ON transactions;
CREATE POLICY "transactions_update_buyer" ON transactions FOR UPDATE
  TO authenticated USING (auth.uid() = buyer_id) WITH CHECK (auth.uid() = buyer_id);

CREATE INDEX IF NOT EXISTS transactions_buyer_idx ON transactions(buyer_id);
CREATE INDEX IF NOT EXISTS transactions_seller_idx ON transactions(seller_id);

-- ratings
CREATE TABLE IF NOT EXISTS ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  giver_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE,
  stars integer NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_select_all" ON ratings;
CREATE POLICY "ratings_select_all" ON ratings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "ratings_insert_own" ON ratings;
CREATE POLICY "ratings_insert_own" ON ratings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = giver_id);

DROP POLICY IF EXISTS "ratings_update_own" ON ratings;
CREATE POLICY "ratings_update_own" ON ratings FOR UPDATE
  TO authenticated USING (auth.uid() = giver_id) WITH CHECK (auth.uid() = giver_id);

DROP POLICY IF EXISTS "ratings_delete_own" ON ratings;
CREATE POLICY "ratings_delete_own" ON ratings FOR DELETE
  TO authenticated USING (auth.uid() = giver_id);

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_select_own" ON chat_messages;
CREATE POLICY "chat_select_own" ON chat_messages FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_insert_own" ON chat_messages;
CREATE POLICY "chat_insert_own" ON chat_messages FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "chat_delete_own" ON chat_messages;
CREATE POLICY "chat_delete_own" ON chat_messages FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- updated_at trigger for food_posts
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS food_posts_touch ON food_posts;
CREATE TRIGGER food_posts_touch BEFORE UPDATE ON food_posts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
