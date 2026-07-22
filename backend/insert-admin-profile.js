const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ocsgzbmnnldpcsbfgocz.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_LeBjs7bgrz3b6DVhRHW00A_scVYpO-z';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('Inserting profile for admin@foodshare.com...');
  const { data, error } = await supabase.from('profiles').insert({
    id: '55646825-d339-4d30-9596-ddca93b9cf14',
    name: 'Admin User',
    email: 'admin@foodshare.com',
    role: 'admin',
    contact_number: '1234567890',
    address: 'HQ Administrative Block, Bangalore',
    volunteer_score: 0,
    completed_pickups: 0,
    is_active: true
  });

  if (error) {
    console.error('Error inserting profile:', error);
  } else {
    console.log('Profile inserted successfully!', data);
  }
}

run();
