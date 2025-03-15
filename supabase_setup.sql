-- Create a table for user profiles (extends the auth.users table)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  full_name TEXT,
  avatar_url TEXT
);

-- Create a table for subscriptions
CREATE TABLE public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  plan TEXT NOT NULL CHECK (plan IN ('free', 'premium')),
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  cancel_at_period_end BOOLEAN DEFAULT false
);

-- Create a table for job analyses history
CREATE TABLE public.job_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  summary TEXT NOT NULL,
  keyword_categories JSONB NOT NULL,
  job_title TEXT,
  company_name TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create a table for API keys (for Gemini API)
CREATE TABLE public.api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gemini_api_key TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Set up Row Level Security (RLS) policies
-- Profiles: Users can only read and update their own profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Subscriptions: Users can only read their own subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions" 
  ON public.subscriptions FOR SELECT 
  USING (auth.uid() = user_id);

-- Job Analyses: Users can only read, insert, and delete their own analyses
ALTER TABLE public.job_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own job analyses" 
  ON public.job_analyses FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own job analyses" 
  ON public.job_analyses FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own job analyses" 
  ON public.job_analyses FOR DELETE 
  USING (auth.uid() = user_id);

-- API Keys: Users can only read and update their own API keys
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own API keys" 
  ON public.api_keys FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own API keys" 
  ON public.api_keys FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own API keys" 
  ON public.api_keys FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  -- Create a profile for the new user
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Create a free subscription for the new user
  INSERT INTO public.subscriptions (
    user_id, 
    status, 
    plan, 
    current_period_start,
    current_period_end
  )
  VALUES (
    NEW.id, 
    'active', 
    'free', 
    now(),
    (now() + interval '1 year')
  );
  
  -- Create an empty API key record for the new user
  INSERT INTO public.api_keys (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions (user_id);
CREATE INDEX idx_job_analyses_user_id ON public.job_analyses (user_id);
CREATE INDEX idx_api_keys_user_id ON public.api_keys (user_id); 