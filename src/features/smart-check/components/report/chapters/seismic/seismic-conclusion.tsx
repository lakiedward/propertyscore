import { useTranslation } from 'react-i18next';
import { formatList } from '@/i18n/format';
import {
  SEISMIC_COLOR,
  SEISMIC_COLOR_DARK,
  SEISMIC_TINT,
  buildingPeriodCodes,
} from '../../../../seismic.utils';
import type { ReadyReport } from '../../../../report.types';

type Seismic = NonNullable<ReadyReport['result']['sections']['seismic']>;

const KNOWN_LEVELS = ['low', 'moderate', 'high', 'very_high'] as const;

function knownLevel(level: string | null) {
  return KNOWN_LEVELS.find((candidate) => candidate === level) ?? null;
}

export function SeismicConclusion({ seismic }: { seismic: Seismic }) {
  const { t } = useTranslation('smartCheck');
  const level = knownLevel(seismic.level);
  const { building } = seismic;
  if (!level && !building) return null;

  const yearText = () => {
    if (!building) return null;
    const year = building.construction_year;
    const codes = buildingPeriodCodes(building.period);
    if (codes === null) return t('report.chapters.seismic.conclusion.year', { year });
    if (codes.length === 0) return t('report.chapters.seismic.conclusion.yearBeforeCode', { year });
    return t('report.chapters.seismic.conclusion.yearCodes', {
      year,
      codes: formatList(codes),
    });
  };

  return (
    <div
      style={{ background: SEISMIC_TINT, borderLeftColor: SEISMIC_COLOR }}
      className="mt-4 rounded-[14px] border-l-4 px-4.5 py-4"
    >
      {level ? (
        <>
          <b
            className="block text-[16px] font-extrabold tracking-[-0.01em]"
            style={{ color: SEISMIC_COLOR_DARK }}
          >
            {t(`report.chapters.seismic.conclusion.${level}.title`)}
          </b>
          <p className="mt-1.5 text-[14px] leading-normal">
            {t(`report.chapters.seismic.conclusion.${level}.body`)}
          </p>
        </>
      ) : null}
      {building ? <p className="mt-1.5 text-[14px] leading-normal">{yearText()}</p> : null}
    </div>
  );
}
