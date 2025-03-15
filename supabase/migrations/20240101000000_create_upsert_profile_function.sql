-- Create a function to upsert a profile
CREATE OR REPLACE FUNCTION upsert_profile(p_user_id UUID, p_full_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the profiles table exists, create it if it doesn't
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add RLS policies
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Allow users to read their own profile
    CREATE POLICY "Users can read their own profile" 
      ON public.profiles 
      FOR SELECT 
      USING (auth.uid() = id);
    
    -- Allow users to update their own profile
    CREATE POLICY "Users can update their own profile" 
      ON public.profiles 
      FOR UPDATE 
      USING (auth.uid() = id);
    
    -- Allow users to insert their own profile
    CREATE POLICY "Users can insert their own profile" 
      ON public.profiles 
      FOR INSERT 
      WITH CHECK (auth.uid() = id);
  END IF;

  -- Try to insert the profile, if it fails, update it
  INSERT INTO public.profiles (id, full_name, created_at, updated_at)
  VALUES (p_user_id, p_full_name, NOW(), NOW())
  ON CONFLICT (id) 
  DO UPDATE SET 
    full_name = p_full_name,
    updated_at = NOW();
    
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in upsert_profile: %', SQLERRM;
    RETURN FALSE;
END;
$$;

-- Create a function to check and create the profiles table
CREATE OR REPLACE FUNCTION create_profiles_table()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the profiles table exists, create it if it doesn't
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Add RLS policies
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    
    -- Allow users to read their own profile
    CREATE POLICY "Users can read their own profile" 
      ON public.profiles 
      FOR SELECT 
      USING (auth.uid() = id);
    
    -- Allow users to update their own profile
    CREATE POLICY "Users can update their own profile" 
      ON public.profiles 
      FOR UPDATE 
      USING (auth.uid() = id);
    
    -- Allow users to insert their own profile
    CREATE POLICY "Users can insert their own profile" 
      ON public.profiles 
      FOR INSERT 
      WITH CHECK (auth.uid() = id);
      
    -- Allow service role to manage all profiles
    CREATE POLICY "Service role can manage all profiles" 
      ON public.profiles 
      USING (true) 
      WITH CHECK (true);
  END IF;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in create_profiles_table: %', SQLERRM;
    RETURN FALSE;
END;
$$; 