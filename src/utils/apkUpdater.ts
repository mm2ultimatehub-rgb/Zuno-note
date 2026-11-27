export const CURRENT_APP_VERSION = '1.2.0';

const APK_CONFIG_KEY = 'zuno_note_apk_config_v1';
const LEGACY_APK_CONFIG_KEY = 'karanot_apk_config_v1';

export interface ApkUpdateConfig {
  githubRepo: string; // e.g. "mm2ultimatehub-rgb/Zuno-note"
  directApkUrl: string; // optional direct APK URL
}

export interface ApkReleaseInfo {
  version: string;
  sizeLabel: string;
  publishedAt: string;
  notes: string[];
  downloadUrl: string;
  hasUpdate: boolean;
  isDemo: boolean;
}

export function loadApkConfig(): ApkUpdateConfig {
  try {
    const raw = localStorage.getItem(APK_CONFIG_KEY) || localStorage.getItem(LEGACY_APK_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ApkUpdateConfig>;
      return {
        githubRepo: parsed.githubRepo || '',
        directApkUrl: parsed.directApkUrl || '',
      };
    }
  } catch {
    // Ignore storage error
  }
  return { githubRepo: '', directApkUrl: '' };
}

export function saveApkConfig(cfg: ApkUpdateConfig): void {
  try {
    localStorage.setItem(APK_CONFIG_KEY, JSON.stringify(cfg));
  } catch {
    // Ignore storage error
  }
}

function compareSemver(a: string, b: string): number {
  const cleanA = a.replace(/^v/i, '').split('-')[0].split('.').map(Number);
  const cleanB = b.replace(/^v/i, '').split('-')[0].split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const da = cleanA[i] || 0;
    const db = cleanB[i] || 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export async function checkForApkUpdate(
  cfg: ApkUpdateConfig
): Promise<ApkReleaseInfo> {
  const repo = cfg.githubRepo.trim();

  if (repo && repo.includes('/') && !repo.startsWith('demo')) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repo}/releases/latest`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          tag_name?: string;
          published_at?: string;
          body?: string;
          html_url?: string;
          assets?: { name: string; browser_download_url: string; size?: number }[];
        };
        const latestVer = (data.tag_name || CURRENT_APP_VERSION).replace(/^v/i, '');
        const apkAsset = data.assets?.find((a) =>
          a.name.toLowerCase().endsWith('.apk')
        );
        const sizeMb = apkAsset?.size
          ? `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB`
          : 'APK Hazır';
        return {
          version: latestVer,
          sizeLabel: sizeMb,
          publishedAt: data.published_at
            ? new Date(data.published_at).toLocaleDateString('tr-TR')
            : 'Yeni Sürüm',
          notes: (data.body || 'GitHub Releases üzerinden yeni sürüm bulundu.')
            .split('\n')
            .map((l) => l.replace(/^[-*]\s*/, '').trim())
            .filter(Boolean)
            .slice(0, 4),
          downloadUrl: apkAsset?.browser_download_url || cfg.directApkUrl.trim() || '',
          hasUpdate: compareSemver(latestVer, CURRENT_APP_VERSION) > 0,
          isDemo: false,
        };
      }
    } catch {
      // Fall back to demo release preview if offline or repo unreachable
    }
  }

  // Do not invent release versions or provide a fake download.
  return {
    version: CURRENT_APP_VERSION,
    sizeLabel: 'APK bulunamadı',
    publishedAt: 'Kontrol tamamlanamadı',
    notes: [
      repo
        ? 'GitHub deposuna erişilemedi veya bir Releases sürümü yayımlanmamış.'
        : 'Gerçek güncelleme kontrolü için GitHub kullanıcı/repo bilgisi ya da doğrudan APK bağlantısı ekleyin.',
      'Zuno Note sahte sürüm veya APK dosyası oluşturmaz.',
    ],
    downloadUrl: cfg.directApkUrl.trim(),
    hasUpdate: false,
    isDemo: true,
  };
}
