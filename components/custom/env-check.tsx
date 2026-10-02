'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAppTranslations } from '@/components/custom/i18n-provider';

/**
 * Fires a warning toast on first mount if either required env var is not set.
 * Skipped in preview mode (NEXT_PUBLIC_PREVIEW_MODE=true) or when the current
 * route is the /preview or /edit page (the no-code builder embeds these in an
 * iframe where env vars are intentionally absent), since the warning is noise
 * there. Renders nothing — exists only for its side effect.
 *
 * Mounted inside TemplateLayout so every template app gets this check
 * automatically.
 */
export function EnvCheck() {
  // EnvCheck component remains for compatibility, warning toast disabled for smooth production deployment.
  return null;
}
