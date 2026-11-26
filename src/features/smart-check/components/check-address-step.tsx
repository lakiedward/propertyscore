import { ArrowRightIcon, LocateFixedIcon, MapPinnedIcon, MoveIcon } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AddressAutocomplete } from '@/components/forms/address-autocomplete';
import { Button } from '@/components/ui/button';
import type { LngLat } from '@/components/map/map.config';
import { findCoveredCity } from '../check.utils';
import { useAddressSearch } from '../hooks/use-address-search';
import { usePinnedAddress } from '../hooks/use-pinned-address';
import { ADDRESS_MIN_LENGTH } from '../smart-check.schemas';
import { CheckIncludesCard } from './check-includes-card';
import { CheckOutsideNotice } from './check-outside-notice';
import { CheckPinMap } from './check-pin-map';
import { CheckPinSummary } from './check-pin-summary';

type CheckAddressStepProps = {
  priceRon: number | null;
  initialAddress: string;
  initialPin: LngLat | null;
  onContinue: (location: { address: string; pin: LngLat }) => void;
};

export function CheckAddressStep({
  priceRon,
  initialAddress,
  initialPin,
  onContinue,
}: CheckAddressStepProps) {
  const { t } = useTranslation('smartCheck');
  const inputId = useId();
  const errorId = useId();
  const location = usePinnedAddress({ address: initialAddress, pin: initialPin });
  const [isTyping, setIsTyping] = useState(false);
  const [hasTriedContinue, setHasTriedContinue] = useState(false);
  const [isLocateFailed, setIsLocateFailed] = useState(false);
  const search = useAddressSearch(location.address, isTyping);
  const isOutside = location.pin !== null && findCoveredCity(location.pin) === undefined;
  const addressError =
    location.address.trim().length < ADDRESS_MIN_LENGTH ? t('check.address.required') : undefined;
  const pinError = location.pin === null ? t('check.address.pinRequired') : undefined;
  const visibleError = hasTriedContinue ? (addressError ?? pinError) : undefined;

  const handleLocate = () => {
    setIsLocateFailed(false);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsTyping(false);
        void location.movePin([coords.longitude, coords.latitude], true);
      },
      () => {
        setIsLocateFailed(true);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const handleContinue = () => {
    setHasTriedContinue(true);
    if (addressError || !location.pin || isOutside) {
      return;
    }
    onContinue({ address: location.address.trim(), pin: location.pin });
  };

  return (
    <div className="page-wrap grid max-w-default grid-cols-1 items-start gap-6 py-8 w767:py-10 w1059:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
      <section
        aria-labelledby={`${inputId}-label`}
        className="flex flex-col gap-4 rounded-lg border border-card bg-card p-5 shadow-card-soft w767:p-7"
      >
        <div className="flex flex-col gap-2">
          <label id={`${inputId}-label`} htmlFor={inputId} className="text-label font-bold">
            {t('check.address.label')}
          </label>
          <AddressAutocomplete
            id={inputId}
            label={t('check.address.label')}
            placeholder={t('check.address.placeholder')}
            value={location.address}
            suggestions={search.matches}
            isSearching={search.isSearching}
            emptyText={
              search.isError
                ? t('check.address.searchError')
                : search.isEmpty
                  ? t('check.address.empty', { query: search.query })
                  : undefined
            }
            isInvalid={visibleError === addressError && addressError !== undefined}
            describedBy={visibleError ? errorId : undefined}
            onValueChange={(value) => {
              setIsTyping(true);
              location.setAddress(value);
            }}
            onSelect={(match) => {
              setIsTyping(false);
              location.chooseMatch(match);
            }}
            action={
              'geolocation' in navigator ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('check.address.locate')}
                  title={t('check.address.locate')}
                  onClick={handleLocate}
                  className="bg-surface-alt"
                >
                  <LocateFixedIcon aria-hidden />
                </Button>
              ) : null
            }
          />
          {isLocateFailed ? (
            <p className="text-caption text-muted-foreground">{t('check.address.locateError')}</p>
          ) : null}
        </div>
        <CheckPinMap
          pin={location.pin}
          focusRequest={location.focusRequest}
          isPickable
          onPin={(position) => {
            setIsTyping(false);
            void location.movePin(position);
          }}
          className="h-72 w767:h-100"
        >
          <span className="pointer-events-none absolute top-3 left-3 z-10 inline-flex items-center gap-2 rounded-full bg-primary/92 px-3 py-1.5 text-caption font-bold text-primary-foreground shadow-md">
            <MoveIcon aria-hidden className="size-3.5" />
            {t('check.address.mapHint')}
          </span>
        </CheckPinMap>
        {location.pin ? (
          <CheckPinSummary
            address={location.address}
            pin={location.pin}
            reverseState={location.reverseState}
          />
        ) : (
          <p className="flex items-center gap-2 rounded-lg bg-surface-sunken px-4 py-3 text-small text-muted-foreground">
            <MapPinnedIcon aria-hidden className="size-4 shrink-0" />
            {t('check.address.noPin')}
          </p>
        )}
        {isOutside ? <CheckOutsideNotice /> : null}
        {visibleError ? (
          <p id={errorId} role="alert" className="text-small font-semibold text-destructive">
            {visibleError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-4 border-t border-border-subtle pt-4">
          <Button type="button" size="lg" onClick={handleContinue}>
            {t('check.address.continue')}
            <ArrowRightIcon aria-hidden />
          </Button>
        </div>
      </section>
      <CheckIncludesCard priceRon={priceRon} />
    </div>
  );
}
