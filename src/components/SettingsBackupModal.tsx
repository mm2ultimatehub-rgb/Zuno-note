import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Database,
  Download,
  Github,
  RefreshCw,
  Smartphone,
  Upload,
  X,
} from 'lucide-react';
import { AppBackupData, Folder, Note } from '../types/notes';
import { PWAInstallButton } from './PWAInstallButton';
import { LoadingActionButton } from './expressive/LoadingActionButton';
import { SoftMorphLoader } from './expressive/SoftMorphLoader';
import {
  ApkReleaseInfo,
  checkForApkUpdate,
  CURRENT_APP_VERSION,
  DEFAULT_GITHUB_REPO,
  loadApkConfig,
  saveApkConfig,
} from '../utils/apkUpdater';
import { useExpressive } from './expressive/shapes';
import { flushPendingSaves, getStorageEstimate } from '../db/localDb';

function formatBytesTR(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface SettingsBackupModalProps {
  isOpen: boolean;
  notes: Note[];
  folders: Folder[];
  onClose: () => void;
  onImportBackup: (data: AppBackupData) => Promise<void>;
}

export const SettingsBackupModal: React.FC<SettingsBackupModalProps> = ({
  isOpen,
  notes,
  folders,
  onClose,
  onImportBackup,
}) => {
  const { accentCss, darkCss } = useExpressive();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [apkConfig, setApkConfig] = useState(() => loadApkConfig());
  const [releaseInfo, setReleaseInfo] = useState<ApkReleaseInfo | null>(null);
  const [apkStatus, setApkStatus] = useState<string | null>(null);
  const [isCheckingApk, setIsCheckingApk] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<{
    usedBytes: number;
    quotaBytes: number;
  } | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setIsCheckingApk(true);
    checkForApkUpdate(loadApkConfig()).then((info) => {
      if (mounted) setReleaseInfo(info);
    }).catch(() => {
      if (mounted) setApkStatus('Sürüm kontrolü tamamlanamadı. Tekrar deneyebilirsin.');
    }).finally(() => {
      if (mounted) setIsCheckingApk(false);
    });
    getStorageEstimate().then((est) => {
      if (mounted) setStorageEstimate(est);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      mounted = false;
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleExportAll = async () => {
    await flushPendingSaves();
    const payload: AppBackupData = {
      version: 1,
      exportedAt: Date.now(),
      notes,
      folders,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `zuno-note-yedek-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Tüm notlar JSON olarak indirildi.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppBackupData;
        if (!Array.isArray(parsed.notes)) {
          setStatusMessage('Geçersiz yedek dosyası biçimi.');
          return;
        }
        await onImportBackup(parsed);
        setStatusMessage(`${parsed.notes.length} not başarıyla geri yüklendi.`);
      } catch {
        setStatusMessage('Yedek dosyası okunamadı.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCheckUpdate = async () => {
    saveApkConfig(apkConfig);
    setApkStatus(null);
    setIsCheckingApk(true);
    try {
      const info = await checkForApkUpdate(apkConfig);
      setReleaseInfo(info);
    } catch {
      setApkStatus('GitHub Releases kontrolü başarısız oldu. İnternet bağlantını kontrol edip yeniden dene.');
    } finally {
      setIsCheckingApk(false);
    }
  };

  const handleDownloadApk = () => {
    if (!releaseInfo) return;
    if (!releaseInfo.hasUpdate) {
      setApkStatus(`Zuno Note v${CURRENT_APP_VERSION} zaten güncel. Aynı sürüm tekrar indirilmedi.`);
      return;
    }
    if (releaseInfo.downloadUrl.startsWith('http')) {
      const a = document.createElement('a');
      a.href = releaseInfo.downloadUrl;
      a.download = `Zuno-Note-v${releaseInfo.version}.apk`;
      a.rel = 'noopener noreferrer';
      a.click();
      setApkStatus('İndirme başlatıldı. İndirilen Zuno Note APK dosyasını açıp Android kurulum ekranında Güncelle seçeneğine dokun.');
      return;
    }

    setApkStatus('Resmî GitHub Releases kaydında indirilebilir APK bulunamadı.');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-[22px] bg-[#0e181a] border border-[#1b2c2e] shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2c2e]">
          <div className="flex items-center gap-3">
            <SoftMorphLoader size={30} />
            <div>
              <h2 className="font-display text-base font-semibold text-[#e6f2f2]">
                Yerel Depolama & APK
              </h2>
              <p className="text-[11px] text-[#84a0a0] tabular-nums">
                Mevcut sürüm: v{CURRENT_APP_VERSION}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#84a0a0] hover:text-[#e6f2f2] hover:bg-white/[0.06]"
            aria-label="Kapat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[82vh] overflow-y-auto">
          {/* Storage summary */}
          <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#142225] border border-[#1b2c2e]">
            <Database className="w-5 h-5 text-[var(--accent)] shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-[#e6f2f2]">
                Yerel Tarayıcı Belleği (IndexedDB)
              </p>
              <p className="text-xs text-[#84a0a0] mt-0.5 tabular-nums">
                {notes.length} not · {folders.length} klasör cihazınızda çevrimdışı saklanıyor.
                {storageEstimate && storageEstimate.quotaBytes > 0
                  ? ` (${formatBytesTR(storageEstimate.usedBytes)} / ${formatBytesTR(
                      storageEstimate.quotaBytes
                    )})`
                  : ''}
              </p>
            </div>
          </div>

          {/* APK Installer & Version Updater (Demo + GitHub Releases) */}
          <div className="p-4 rounded-2xl bg-[#142225] border border-[#1b2c2e] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[var(--accent)]" />
                <span className="font-display text-sm font-semibold text-[#e6f2f2]">
                  APK Yükleme & Güncelleme
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#0b1214] border border-[#1b2c2e] text-[10px] font-medium text-[#84a0a0]">
                GitHub Releases
              </span>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={apkConfig.githubRepo}
                onChange={(e) => {
                  const next = { ...apkConfig, githubRepo: e.target.value };
                  setApkConfig(next);
                  saveApkConfig(next);
                }}
                placeholder={`GitHub deposu (varsayılan: ${DEFAULT_GITHUB_REPO})`}
                className="w-full rounded-xl bg-[#0b1214] border border-[#1b2c2e] px-3 py-2 text-xs text-[#e6f2f2] placeholder:text-[#84a0a0]/70 focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <LoadingActionButton
              label={isCheckingApk ? 'GitHub Releases kontrol ediliyor…' : 'Güncellemeleri Kontrol Et'}
              onAction={handleCheckUpdate}
              height={60}
            />

            {releaseInfo && (
              <div className="p-3 rounded-xl bg-[#0b1214] border border-[#1b2c2e] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-sm font-semibold text-[#e6f2f2]">
                      {releaseInfo.hasUpdate
                        ? `Zuno Note v${releaseInfo.version} hazır`
                        : releaseInfo.isDemo
                          ? 'Release APK bulunamadı'
                          : `En güncel sürüm v${releaseInfo.version}`}
                    </p>
                    <p className="text-[11px] text-[#84a0a0] tabular-nums">
                      Kurulu v{releaseInfo.installedVersion} · {releaseInfo.sizeLabel} · {releaseInfo.publishedAt}
                      {releaseInfo.isDemo ? ' · APK dosyası eksik' : ''}
                    </p>
                  </div>
                  <RefreshCw className="w-4 h-4 text-[var(--accent)] shrink-0" />
                </div>

                {releaseInfo.notes.length > 0 && (
                  <ul className="text-xs text-[#84a0a0] space-y-1 list-disc list-inside">
                    {releaseInfo.notes.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={handleDownloadApk}
                  disabled={!releaseInfo.downloadUrl || !releaseInfo.hasUpdate}
                  style={{ backgroundColor: accentCss, color: darkCss }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold hover:opacity-95 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                  <span>
                    {!releaseInfo.downloadUrl
                      ? 'APK bağlantısı yok'
                      : !releaseInfo.hasUpdate
                        ? 'Uygulama Güncel'
                        : `v${releaseInfo.version} Güncellemesini İndir`}
                  </span>
                </button>
              </div>
            )}

            {apkStatus && (
              <p className="text-xs text-[var(--accent)] leading-relaxed">{apkStatus}</p>
            )}
            {!apkStatus && !releaseInfo && (
              <p className="text-xs text-[#84a0a0]">Resmî GitHub sürümü otomatik kontrol edilir. Yalnızca Releases bölümündeki gerçek APK kullanılır.</p>
            )}
          </div>

          {/* Expressive Backup & Restore */}
          <div className="space-y-3">
            <span className="label-caps block">Yedekle ve Geri Yükle</span>
            <div className="flex flex-col gap-2.5">
              <LoadingActionButton
                label="Yedeği İndir (.json)"
                onAction={handleExportAll}
                height={70}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-[#142225] border border-[#1b2c2e] text-[#e6f2f2] text-sm font-medium hover:border-[var(--accent)] transition-colors"
              >
                <Upload className="w-4 h-4 text-[var(--accent)]" />
                <span>Yedekten Geri Yükle (.json)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            {statusMessage && (
              <div className="flex items-center gap-2 text-xs text-[var(--accent)] pt-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>

          <PWAInstallButton />

          {/* GitHub Pages & APK Guide */}
          <div className="p-4 rounded-2xl bg-[#0b1214] border border-[#1b2c2e] space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#e6f2f2]">
              <Github className="w-4 h-4 text-[var(--accent)]" />
              <span>GitHub Pages ve Android APK</span>
            </div>
            <ul className="text-xs text-[#84a0a0] space-y-1.5 leading-relaxed list-disc list-inside">
              <li>
                Göreceli yollar (<code className="text-[#e6f2f2]">base: './'</code>) ve{' '}
                <code className="text-[#e6f2f2]">.github/workflows/deploy.yml</code> ile GitHub Pages üzerinde doğrudan çalışır.
              </li>
              <li>
                <strong>PWABuilder / TWA:</strong> GitHub Pages adresinizi{' '}
                <span className="text-[#e6f2f2]">pwabuilder.com</span> üzerinden tek tıkla imzalı Android APK paketine çevirebilirsiniz.
              </li>
              <li>
                <strong>Capacitor:</strong> Hazır <code className="text-[#e6f2f2]">capacitor.config.json</code> ile{' '}
                <code className="text-[#e6f2f2]">npm run build && npx cap sync android</code> çalıştırıp Android Studio ile APK alabilirsiniz.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
