import { createAdminClient } from './supabase-admin';

// Cache for config values to avoid repeated database calls
const configCache: Map<string, { value: string; timestamp: number }> = new Map();
const CACHE_TTL_MS = 60000; // 1 minute cache

export type ConfigKey = 
  | 'KESTRA_URL'
  | 'KESTRA_USERNAME'
  | 'KESTRA_PASSWORD'
  | 'GEMINI_API_KEY';

/**
 * Get a configuration value from the database
 * Falls back to environment variable if not found in database
 */
export async function getConfig(key: ConfigKey): Promise<string | null> {
  // Check cache first
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.value;
  }

  const supabase = createAdminClient();
  
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', key)
      .single();
    
    if (error || !data?.value) {
      // Fall back to environment variable
      const envValue = getEnvFallback(key);
      if (envValue) {
        return envValue;
      }
      return null;
    }
    
    // Cache the value
    configCache.set(key, { value: data.value, timestamp: Date.now() });
    
    return data.value;
  } catch (error) {
    console.error(`Error fetching config ${key}:`, error);
    // Fall back to environment variable
    return getEnvFallback(key);
  }
}

/**
 * Get multiple configuration values at once
 */
export async function getConfigs(keys: ConfigKey[]): Promise<Record<ConfigKey, string | null>> {
  const supabase = createAdminClient();
  const result: Record<string, string | null> = {};
  
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', keys);
    
    // Initialize all keys with null
    for (const key of keys) {
      result[key] = null;
    }
    
    if (!error && data) {
      for (const row of data) {
        if (row.value) {
          result[row.key] = row.value;
          configCache.set(row.key, { value: row.value, timestamp: Date.now() });
        }
      }
    }
    
    // Fill in missing values from environment
    for (const key of keys) {
      if (!result[key]) {
        result[key] = getEnvFallback(key as ConfigKey);
      }
    }
    
    return result as Record<ConfigKey, string | null>;
  } catch (error) {
    console.error('Error fetching configs:', error);
    // Fall back to environment variables
    for (const key of keys) {
      result[key] = getEnvFallback(key as ConfigKey);
    }
    return result as Record<ConfigKey, string | null>;
  }
}

/**
 * Set a configuration value in the database
 */
export async function setConfig(
  key: ConfigKey, 
  value: string,
  description?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  
  try {
    const { error } = await supabase
      .from('system_config')
      .upsert({
        key,
        value,
        description,
        is_secret: isSecretKey(key),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      });
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Update cache
    configCache.set(key, { value, timestamp: Date.now() });
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if all required configurations are set
 */
export async function checkConfigStatus(): Promise<{
  configured: boolean;
  missing: ConfigKey[];
  hasValues: ConfigKey[];
}> {
  const requiredKeys: ConfigKey[] = ['KESTRA_URL', 'GEMINI_API_KEY'];
  const allKeys: ConfigKey[] = ['KESTRA_URL', 'KESTRA_USERNAME', 'KESTRA_PASSWORD', 'GEMINI_API_KEY'];
  
  const configs = await getConfigs(allKeys);
  
  const missing: ConfigKey[] = [];
  const hasValues: ConfigKey[] = [];
  
  for (const key of allKeys) {
    if (configs[key]) {
      hasValues.push(key);
    }
  }
  
  for (const key of requiredKeys) {
    if (!configs[key]) {
      missing.push(key);
    }
  }
  
  return {
    configured: missing.length === 0,
    missing,
    hasValues
  };
}

/**
 * Clear the configuration cache
 */
export function clearConfigCache(): void {
  configCache.clear();
}

// Helper functions

function getEnvFallback(key: ConfigKey): string | null {
  switch (key) {
    case 'KESTRA_URL':
      return process.env.KESTRA_URL || null;
    case 'KESTRA_USERNAME':
      return process.env.KESTRA_USERNAME || null;
    case 'KESTRA_PASSWORD':
      return process.env.KESTRA_PASSWORD || null;
    case 'GEMINI_API_KEY':
      return process.env.GEMINI_API_KEY || null;
    default:
      return null;
  }
}

function isSecretKey(key: ConfigKey): boolean {
  return ['KESTRA_PASSWORD', 'GEMINI_API_KEY', 'KESTRA_USERNAME'].includes(key);
}

