import { useTranslation } from 'react-i18next';
import { TRUST_KEYS, type TrustKind } from '@/components/trust/trust.utils';

export function useTrustLabel(): (kind: TrustKind, score?: number | null) => string {
  const { t } = useTranslation();
  return (kind, score) => {
    if (kind === 'physical' || kind === 'none') {
      return t(TRUST_KEYS[kind].label);
    }
    return score == null ? t('trust.smartcheckNoScore') : t(TRUST_KEYS.online.label, { score });
  };
}
