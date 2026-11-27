export const CURRENT_APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.2.13';
export const DEFAULT_GITHUB_REPO = 'mm2ultimatehub-rgb/Zuno-note';

const APK_CONFIG_KEY = 'zuno_note_apk_config_v1';
const LEGACY_APK_CONFIG_KEY = 'karanot_apk_config_v1';

export interface ApkUpdateConfig {
  githubRepo: string; // e.g. "mm2ultimatehub-rgb/Zuno-note"
  directApkUrl: string; // optional direct APK URL
}

export interface ApkReleaseInfo {
  version: string;
  installedVersion: string;
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
      const config = {
        // Keep the updater pinned to the official Zuno Note repository.
        // Old user-entered repository values must not redirect update checks.
        githubRepo: DEFAULT_GITHUB_REPO,
        directApkUrl: parsed.directApkUrl || '',
      };
      localStorage.setItem(APK_CONFIG_KEY, JSON.stringify(config));
      return config;
    }
  } catch {
    // Ignore storage error
  }
  return { githubRepo: DEFAULT_GITHUB_REPO, directApkUrl: '' };
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

async function getInstalledVersion(): Promise<string> {
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    if (info.version) return info.version.replace(/^v/i, '');
  } catch {
    // Web preview or plugin unavailable: use the build-in version.
  }
  return CURRENT_APP_VERSION;
}

interface PublishedUpdateManifest {
  version: string;
  apkUrl?: string;
  publishedAt?: string;
  notes?: string[];
  sizeBytes?: number;
}

async function checkPublishedManifest(installedVersion: string): Promise<ApkReleaseInfo | null> {
  const manifestUrl = 'https://raw.githubusercontent.com/mm2ultimatehub-rgb/Zuno-note/main/public/zuno-update.json';
  try {
    const response = await fetch(`${manifestUrl}?zuno=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!response.ok) return null;
    const manifest = await response.json() as Partial<PublishedUpdateManifest>;
    if (!manifest.version || !/^\d+\.\d+\.\d+$/.test(manifest.version)) return null;
    const downloadUrl = manifest.apkUrl || 'https://github.com/mm2ultimatehub-rgb/Zuno-note/releases/latest/download/Zuno-Note-release.apk';
    if (!downloadUrl.startsWith('https://github.com/mm2ultimatehub-rgb/Zuno-note/releases/')) return null;
    return {
      version: manifest.version,
      installedVersion,
      sizeLabel: manifest.sizeBytes ? `${(manifest.sizeBytes / (1024 * 1024)).toFixed(1)} MB` : 'Boyut indirme sırasında belirlenir',
      publishedAt: manifest.publishedAt ? new Date(manifest.publishedAt).toLocaleDateString('tr-TR') : 'GitHub Releases',
      notes: Array.isArray(manifest.notes) ? manifest.notes.slice(0, 4) : ['Resmî Zuno Note güncellemesi bulundu.'],
      downloadUrl,
      hasUpdate: compareSemver(manifest.version, installedVersion) > 0,
      isDemo: false,
    };
  } catch {
    return null;
  }
}

export async function checkForApkUpdate(
  cfg: ApkUpdateConfig
): Promise<ApkReleaseInfo> {
  const installedVersion = await getInstalledVersion();
  const repo = DEFAULT_GITHUB_REPO;

  const publishedManifest = await checkPublishedManifest(installedVersion);
  if (publishedManifest) return publishedManifest;

  // Accept only a GitHub owner/repository slug; reject full URLs and path fragments.
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) && !repo.toLowerCase().startsWith('demo/')) {
    try {
      // Android WebView may cache the GitHub latest-release response. Add a
      // cache-buster and explicitly bypass browser/service-worker caches so
      // every manual update check sees the newest published release.
      const releaseApiUrl = `https://api.github.com/repos/${repo}/releases/latest?zuno_check=${Date.now()}`;
      const res = await fetch(releaseApiUrl, {
        cache: 'no-store',
        headers: {
          Accept: 'application/vnd.github+json',
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
      });
      if (res.ok) {
        const data = (await res.json()) as {
          tag_name?: string;
          published_at?: string;
          body?: string;
          html_url?: string;
          assets?: { name: string; browser_download_url: string; size?: number }[];
        };
        const latestVer = (data.tag_name || CURRENT_APP_VERSION).replace(/^v/i, '');
        // Only offer a release APK. A debug/unsigned artifact can have a
        // different signing certificate and Android will refuse to update
        // the installed app over it.
        const apkAsset = data.assets?.find((a) => {
          const name = a.name.toLowerCase();
          const url = a.browser_download_url;
          return (
            name.endsWith('.apk') &&
            name.includes('release') &&
            !name.includes('debug') &&
            !name.includes('unsigned') &&
            url.startsWith('https://github.com/') &&
            url.includes('/releases/download/')
          );
        });
        // Release asset names are not guaranteed to use one exact casing or suffix.
        // If GitHub's release API omits asset metadata (mobile WebView/cache/rate limit),
        // use the stable latest-release download endpoint for our published APK name.
        const directLatestApk = `https://github.com/${repo}/releases/latest/download/Zuno-Note-release.apk`;
        const downloadUrl = apkAsset?.browser_download_url || (data.tag_name ? directLatestApk : '');
        const sizeMb = apkAsset?.size
          ? `${(apkAsset.size / (1024 * 1024)).toFixed(1)} MB`
          : (downloadUrl ? 'Boyut indirme sırasında belirlenir' : 'APK asset yok');
        return {
          version: latestVer,
          installedVersion,
          sizeLabel: sizeMb,
          publishedAt: data.published_at
            ? new Date(data.published_at).toLocaleDateString('tr-TR')
            : 'Yeni Sürüm',
          notes: (data.body || 'GitHub Releases üzerinden yeni sürüm bulundu.')
            .split('\n')
            .map((l) => l.replace(/^[-*]\s*/, '').trim())
            .filter(Boolean)
            .slice(0, 4),
          downloadUrl,
          hasUpdate: Boolean(downloadUrl) && compareSemver(latestVer, installedVersion) > 0,
          isDemo: !downloadUrl,
        };
      }
    } catch {
      // Report unavailable releases without inventing a preview.
    }
  }

  // Do not invent release versions or provide a fake download.
  return {
    version: CURRENT_APP_VERSION,
    installedVersion,
    sizeLabel: 'Bağlantı kontrol edilemedi',
    publishedAt: 'Kontrol başarısız',
    notes: [
      'Güncelleme sunucusuna erişilemedi. Bu, APK yayımlanmadığı anlamına gelmez.',
      'İnternet bağlantını kontrol edip Güncellemeyi Kontrol Et düğmesine tekrar bas.',
    ],
    downloadUrl: '',
    hasUpdate: false,
    isDemo: true,
  };
}
