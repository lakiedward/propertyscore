import { ArrowLeftIcon, ArrowRightIcon, CheckIcon, MoveIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { LngLat } from '@/components/map/map.config';
import { findCoveredCity } from '../check.utils';
import { ADDRESS_MIN_LENGTH } from '../smart-check.schemas';
import { usePinnedAddress } from '../hooks/use-pinned-address';
import { CheckOutsideNotice } from './check-outside-notice';
import { CheckPinMap } from './check-pin-map';
import { CheckPinSummary } from './check-pin-summary';

type CheckConfirmStepProps = {
  address: string;
  pin: LngLat;
  onBack: (location: { address: string; pin: LngLat }) => void;
  onContinue: (location: { address: string; pin: LngLat }) => void;
};

export function CheckConfirmStep({ address, pin, onBack, onContinue }: CheckConfirmStepProps) {
  const { t } = useTranslation('smartCheck');
  const location = usePinnedAddress({ address, pin });
  const [isMoving, setIsMoving] = useState(false);
  const currentPin = location.pin ?? pin;
  const isOutside = findCoveredCity(currentPin) === undefined;
  const question = isMoving ? t('check.confirm.movingQuestion') : t('check.confirm.question');
  const helper = isMoving ? t('check.confirm.movingHelper') : t('check.confirm.helper');
  const current = { address: location.address, pin: currentPin };

  return (
    <div className="page-wrap flex max-w-default flex-col gap-4 py-8 w767:py-10">
      <div className="flex flex-col gap-1 w767:hidden">
        <h2 className="text-h4 font-extrabold">{question}</h2>
        <p className="text-small text-muted-foreground">{helper}</p>
      </div>
      <CheckPinMap
        pin={currentPin}
        focusRequest={0}
        isPickable={isMoving}
        onPin={(position) => {
          void location.movePin(position);
        }}
        className="h-80 shadow-card-soft w767:h-110"
      >
        <div className="pointer-events-none absolute top-4 left-4 z-10 hidden max-w-85 flex-col gap-1 rounded-lg border border-border bg-card p-4 shadow-md w767:flex">
          <h2 className="text-h4 font-extrabold">{question}</h2>
          <p className="text-small text-muted-foreground">{helper}</p>
        </div>
      </CheckPinMap>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-card bg-card p-4 shadow-card-soft">
        <CheckPinSummary
          address={location.address}
          pin={currentPin}
          reverseState={location.reverseState}
          className="min-w-0 flex-1 basis-80 bg-transparent p-0"
        />
        <div className="flex flex-1 flex-wrap justify-end gap-2.5 w767:flex-none">
          <Button
            type="button"
            variant="outline"
            size="lg"
            aria-pressed={isMoving}
            onClick={() => {
              setIsMoving((value) => !value);
            }}
            className="flex-1 w767:flex-none"
          >
            {isMoving ? <CheckIcon aria-hidden /> : <MoveIcon aria-hidden />}
            {isMoving ? t('check.confirm.stopMoving') : t('check.confirm.move')}
          </Button>
          <Button
            type="button"
            size="lg"
            onClick={() => {
              if (isOutside || location.reverseState === 'resolving') {
                return;
              }
              if (location.address.trim().length < ADDRESS_MIN_LENGTH) {
                onBack(current);
                return;
              }
              onContinue(current);
            }}
            aria-disabled={isOutside || location.reverseState === 'resolving'}
            className="flex-1 aria-disabled:opacity-60 w767:flex-none"
          >
            {t('check.confirm.continue')}
            <ArrowRightIcon aria-hidden />
          </Button>
        </div>
      </div>
      {isOutside ? <CheckOutsideNotice /> : null}
      <div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            onBack(current);
          }}
        >
          <ArrowLeftIcon aria-hidden />
          {t('check.confirm.back')}
        </Button>
      </div>
    </div>
  );
}
