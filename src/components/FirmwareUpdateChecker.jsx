import { useState, useEffect, memo } from 'react';
import { ExternalLink, Check, Download } from 'lucide-react';

const GITHUB_API = 'https://api.github.com/repos/Ralim/IronOS/releases/latest';

function normalizeVersion(v) {
  return (v || '').replace(/^v/i, '').replace(/[^0-9.]/g, '').trim();
}

export default memo(function FirmwareUpdateChecker({ deviceInfo, connection }) {
  const [latestRelease, setLatestRelease] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (connection !== 'connected' || !deviceInfo) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(GITHUB_API)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (cancelled) return;
        setLatestRelease({
          version: data.tag_name || '',
          url: data.html_url || '',
          date: data.published_at || '',
        });
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [connection, deviceInfo?.build, deviceInfo?.firmwareVersion]);

  // Don't render when not connected or still loading
  if (connection !== 'connected' || !deviceInfo) return null;
  if (loading || error || !latestRelease) return null;

  const currentVersion = deviceInfo.build || deviceInfo.firmwareVersion || '';
  const latestVersion = latestRelease.version || '';

  const isUpToDate = normalizeVersion(currentVersion) === normalizeVersion(latestVersion);
  // Also handle "build" format like "2.21" vs "v2.21"
  const currentNorm = normalizeVersion(currentVersion);
  const latestNorm = normalizeVersion(latestVersion);
  const matches = currentNorm === latestNorm ||
    currentNorm.replace(/\.$/, '') === latestNorm.replace(/\.$/, '');

  if (matches) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-500/70">
        <Check className="w-3 h-3" />
        <span>Firmware up to date ({latestVersion})</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
      <Download className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-amber-300 font-medium">
          Firmware update available: {latestVersion}
        </p>
        <p className="text-[10px] text-amber-500/60">
          Your iron is running {currentVersion || 'unknown'}
        </p>
      </div>
      <a
        href={latestRelease.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-[10px] font-medium transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        Update
      </a>
    </div>
  );
});
