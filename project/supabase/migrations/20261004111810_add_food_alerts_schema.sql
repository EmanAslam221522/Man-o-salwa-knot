/*
# Add food_subscriptions and notifications tables

## Overview
Adds tables so users can subscribe to food alerts and the system can track
notification delivery when new food is posted nearby.

## New Tables
1. `food_subscriptions` - users opt in to receive alerts about new food posts.
   - user_id: the subscriber
   - notify_radius_km: how far from their location to match (default 3km)
   - email_enabled: whether to send email alerts
   - created_at
2. `notifications` - log of alerts sent to users about new food posts.
   - food_post_id: the post that triggered the alert
   - subscriber_id: who received it
   - channel: email | in_app
   - status: sent | failed | pending
   - created_at

## Security
- food_subscriptions: each user can CRUD only their own subscription.
- notifications: users can read their own; insert by the system (authenticated).

## Notes
- Owner columns default to auth.uid().
- These tables support the email alert system triggered when food is posted.
*/

CREATE TABLE IF NOT EXISTS food_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  notify_radius_km numeric(5,2) NOT NULL DEFAULT 3.0,
  email_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE food_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_subs_select_own" ON food_subscriptions;
CREATE POLICY "food_subs_select_own" ON food_subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_subs_insert_own" ON food_subscriptions;
CREATE POLICY "food_subs_insert_own" ON food_subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_subs_update_own" ON food_subscriptions;
CREATE POLICY "food_subs_update_own" ON food_subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_subs_delete_own" ON food_subscriptions;
CREATE POLICY "food_subs_delete_own" ON food_subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_post_id uuid REFERENCES food_posts(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  channel text NOT NULL DEFAULT 'email' CHECK (channel IN ('email','in_app')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = subscriber_id);

DROP POLICY IF EXISTS "notifications_insert_auth" ON notifications;
CREATE POLICY "notifications_insert_auth" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = subscriber_id) WITH CHECK (auth.uid() = subscriber_id);

CREATE INDEX IF NOT EXISTS food_subs_user_idx ON food_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS notif_subscriber_idx ON notifications(subscriber_id);
