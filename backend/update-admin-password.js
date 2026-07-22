const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://ocsgzbmnnldpcsbfgocz.supabase.co';
const SUPABASE_SERVICE_KEY = 'sb_secret_LeBjs7bgrz3b6DVhRHW00A_scVYpO-z';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function run() {
  console.log('Resetting password for admin@foodshare.com...');
  const { data, error } = await supabase.auth.admin.updateUserById(
    '55646825-d339-4d30-9596-ddca93b9cf14',
    { password: 'password123' }
  );

  if (error) {
    console.error('Error resetting password:', error);
  } else {
    console.log('Password reset successfully!');
  }
}

run();
