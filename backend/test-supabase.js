const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ocsgzbmnnldpcsbfgocz.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_LeBjs7bgrz3b6DVhRHW00A_scVYpO-z';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkProfiles() {
  console.log('Fetching profiles from Supabase...');
  const { data: profiles, error: profileError } = await supabase.from('profiles').select('*');
  if (profileError) {
    console.error('Error fetching profiles:', profileError);
  } else {
    console.log('Profiles currently in Supabase:', profiles);
  }

  console.log('Fetching auth users from Supabase...');
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error('Error fetching auth users:', authError);
  } else {
    console.log('Auth users currently in Supabase:', users.map(u => ({ id: u.id, email: u.email, confirmed_at: u.email_confirmed_at })));
  }
}

checkProfiles();
