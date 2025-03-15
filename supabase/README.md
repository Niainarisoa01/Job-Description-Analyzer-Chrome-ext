# Supabase Database Setup

This directory contains SQL migrations for setting up the Supabase database for the Job Description Analyzer extension.

## Required Tables

The extension requires the following tables:

1. `profiles` - Stores user profile information
2. `subscriptions` - Stores user subscription information
3. `api_keys` - Stores user API keys
4. `job_analyses` - Stores job analysis results

## Setting Up the Database

### Option 1: Using the Supabase Dashboard

1. Log in to the [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to the SQL Editor
4. Copy the contents of each migration file in the `migrations` directory
5. Paste and run each migration in the SQL Editor

### Option 2: Using the Supabase CLI

If you have the Supabase CLI installed, you can run:

```bash
supabase db push
```

## Required Functions

The extension uses the following SQL functions:

1. `upsert_profile` - Upserts a user profile
2. `create_profiles_table` - Creates the profiles table if it doesn't exist

## Troubleshooting Profile Updates

If you're experiencing issues with profile updates, try the following:

1. Check if the `profiles` table exists in your Supabase database
2. Ensure the RLS policies are correctly set up
3. Verify that the user has permission to update their own profile
4. Run the `create_profiles_table` function to ensure the table exists with the correct structure
5. Try using the `upsert_profile` function directly:

```sql
SELECT upsert_profile('your-user-id', 'Your Full Name');
```

## Database Schema

### profiles

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### subscriptions

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'inactive',
  plan TEXT DEFAULT 'free',
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### api_keys

```sql
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  gemini_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### job_analyses

```sql
CREATE TABLE public.job_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  summary TEXT,
  keyword_categories JSONB,
  job_title TEXT,
  company_name TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
``` 