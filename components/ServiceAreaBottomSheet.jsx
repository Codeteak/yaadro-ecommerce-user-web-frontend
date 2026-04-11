'use client';

import { useEffect } from 'react';
import { MapPin, CheckCircle2, AlertTriangle, Navigation } from 'lucide-react';
import { useLocationService } from '../context/LocationServiceContext';

function formatKm(meters) {
  if (meters == null || Number.isNaN(meters)) return null;
  const km = meters / 1000;
  if (km < 1) return `${Math.round(meters)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export default function ServiceAreaBottomSheet() {
  const {
    isChecking,
    serviceable,
    distanceM,
    maxRadiusM,
    geoDenied,
    errorMessage,
    showServiceAreaSheet,
    setShowServiceAreaSheet,
    recheckLocation,
  } = useLocationService();

  useEffect(() => {
    document.body.style.overflow = showServiceAreaSheet ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showServiceAreaSheet]);

  if (!showServiceAreaSheet) return null;

  const onClose = () => setShowServiceAreaSheet(false);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[68]"
        style={{ backdropFilter: 'none' }}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-[69] bg-white rounded-t-3xl overflow-hidden shadow-2xl"
        style={{
          maxHeight: '92vh',
          animation: 'serviceAreaSlideUp 0.32s cubic-bezier(0.32, 0.72, 0, 1) both',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <SheetBody
          onClose={onClose}
          isChecking={isChecking}
          serviceable={serviceable}
          distanceM={distanceM}
          maxRadiusM={maxRadiusM}
          geoDenied={geoDenied}
          errorMessage={errorMessage}
          recheckLocation={recheckLocation}
        />
      </div>

      <div className="hidden md:flex fixed inset-0 z-[69] items-center justify-center px-4 pointer-events-none">
        <div
          className="bg-white rounded-3xl w-full max-w-[420px] overflow-hidden shadow-2xl pointer-events-auto"
          style={{ animation: 'serviceAreaScaleIn 0.25s cubic-bezier(0.32, 0.72, 0, 1) both' }}
          onClick={(e) => e.stopPropagation()}
        >
          <SheetBody
            onClose={onClose}
            isChecking={isChecking}
            serviceable={serviceable}
            distanceM={distanceM}
            maxRadiusM={maxRadiusM}
            geoDenied={geoDenied}
            errorMessage={errorMessage}
            recheckLocation={recheckLocation}
          />
        </div>
      </div>

      <style>{`
        @keyframes serviceAreaSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes serviceAreaScaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}

function SheetBody({
  onClose,
  isChecking,
  serviceable,
  distanceM,
  maxRadiusM,
  geoDenied,
  errorMessage,
  recheckLocation,
}) {
  const distLabel = formatKm(distanceM);
  const radiusLabel = formatKm(maxRadiusM);

  return (
    <div className="px-5 pb-8 pt-2 max-h-[85vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-primary" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">Delivery area</h2>
            <p className="text-xs text-gray-500 mt-0.5">Based on your current location</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 -mr-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isChecking && (
        <div className="flex items-center gap-3 py-8 justify-center text-gray-600">
          <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <span className="text-sm font-medium">Checking delivery availability…</span>
        </div>
      )}

      {!isChecking && geoDenied && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Location access needed</p>
              <p className="text-sm text-gray-600 mt-1">
                Allow location in your browser settings so we can confirm whether we deliver to you.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isChecking && !geoDenied && errorMessage && (
        <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-4">
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      {!isChecking && !geoDenied && serviceable === true && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 mb-4">
          <div className="flex gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">We deliver to your area</p>
              <p className="text-sm text-gray-600 mt-1">
                {distLabel ? `About ${distLabel} from the store.` : 'Your location is inside our service zone.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isChecking && !geoDenied && serviceable === false && (
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 mb-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-900">Outside delivery zone</p>
              <p className="text-sm text-gray-600 mt-1">
                {distLabel && radiusLabel
                  ? `You are about ${distLabel} away; we currently deliver within about ${radiusLabel}.`
                  : 'Your current location is outside our delivery area. You can still browse the store.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end mt-2">
        <button
          type="button"
          onClick={() => {
            recheckLocation();
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          <Navigation className="w-4 h-4" />
          Check again
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center justify-center px-4 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-95"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
